import type { UserProfile, WorkoutPlan, KnowledgeSource, WorkoutLog } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

const ensureClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
};

export { isSupabaseConfigured };

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase Auth not available, returning empty listener.');
    callback(null);
    return () => {};
  }

  supabase
    .auth
    .getSession()
    .then(({ data, error }) => {
      if (!error) {
        callback(data.session?.user ?? null);
      }
    });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
};

export const signUp = async (email: string, password: string): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.auth.signUp({ email, password });
  if (error) throw error;
};

export const signIn = async (email: string, password: string): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signOut = async (): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};

interface UserData {
  profile: UserProfile;
  workoutPlan: WorkoutPlan | null;
  knowledgeSources: KnowledgeSource[];
  workoutHistory: WorkoutLog[];
}

export const loadUserData = async (uid: string): Promise<UserData | null> => {
  const client = ensureClient();

  const [profileResult, planResult, sourcesResult, logsResult] = await Promise.all([
    client.from('profiles').select('profile').eq('user_id', uid).maybeSingle(),
    client.from('workout_plans').select('plan').eq('user_id', uid).maybeSingle(),
    client.from('knowledge_sources').select('source').eq('user_id', uid),
    client.from('workout_logs').select('log').eq('user_id', uid).order('created_at', { ascending: true })
  ]);

  if (profileResult.error && profileResult.error.code !== 'PGRST116') {
    console.error('Error loading profile:', profileResult.error);
    throw new Error('Failed to load user profile from Supabase.');
  }
  if (planResult.error && planResult.error.code !== 'PGRST116') {
    console.error('Error loading workout plan:', planResult.error);
    throw new Error('Failed to load workout plan from Supabase.');
  }
  if (sourcesResult.error && sourcesResult.error.code !== 'PGRST116') {
    console.error('Error loading knowledge sources:', sourcesResult.error);
    throw new Error('Failed to load knowledge sources from Supabase.');
  }
  if (logsResult.error && logsResult.error.code !== 'PGRST116') {
    console.error('Error loading workout history:', logsResult.error);
    throw new Error('Failed to load workout history from Supabase.');
  }

  const profile = profileResult.data?.profile as UserProfile | undefined;
  if (!profile) {
    return null;
  }

  // Process knowledge sources and restore data from storage if needed
  const sourcesData = sourcesResult.data?.map(row => row.source as KnowledgeSource) ?? [];
  const knowledgeSources = await Promise.all(
    sourcesData.map(async (source) => {
      // If source has storage file path, download the content
      if ((source as any).storageFilePath) {
        try {
          const content = await downloadContentFromStorage((source as any).storageFilePath);
          return { ...source, data: content };
        } catch (error) {
          console.warn(`Failed to download content for source ${source.id}:`, error);
          return source; // Return without data if download fails
        }
      }
      return source;
    })
  );

  return {
    profile,
    workoutPlan: (planResult.data?.plan as WorkoutPlan) ?? null,
    knowledgeSources,
    workoutHistory: (logsResult.data?.map(row => row.log as WorkoutLog)) ?? [],
  };
};

const upsertWithTimestamp = async (table: string, payload: Record<string, unknown>) => {
  const client = ensureClient();
  const { error } = await client.from(table).upsert({ ...payload, updated_at: new Date().toISOString() });
  if (error) {
    console.error(`Error saving to ${table}:`, error);
    throw new Error(`Failed to save data to ${table}.`);
  }
};

export const saveUserProfile = async (uid: string, profile: UserProfile) => {
  await upsertWithTimestamp('profiles', { user_id: uid, profile });
};

export const saveWorkoutPlan = async (uid: string, workoutPlan: WorkoutPlan | null) => {
  const client = ensureClient();
  if (!workoutPlan) {
    const { error } = await client.from('workout_plans').delete().eq('user_id', uid);
    if (error && error.code !== 'PGRST116') {
      console.error('Error clearing workout plan:', error);
      throw new Error('Failed to clear workout plan.');
    }
    return;
  }
  await upsertWithTimestamp('workout_plans', { user_id: uid, plan: workoutPlan });
};

// Storage functions for large content
const uploadContentToStorage = async (uid: string, sourceId: string, content: string, type: 'image' | 'youtube'): Promise<string> => {
  const client = ensureClient();
  
  const fileName = `${uid}/${sourceId}-${type}-${Date.now()}.json`;
  
  console.log(`📤 Uploading to storage: ${fileName}, content size: ${content.length} chars`);
  
  // Convert content to blob for upload
  const blob = new Blob([JSON.stringify({ content })], { type: 'application/json' });
  
  const { data, error } = await client.storage
    .from('workout-content')
    .upload(fileName, blob, {
      contentType: 'application/json',
      upsert: false
    });
    
  if (error) {
    console.error('❌ Storage upload error:', error);
    throw new Error(`Failed to upload content to storage: ${error.message}`);
  }
  
  console.log(`✅ Storage upload successful: ${fileName}`);
  return fileName;
};

const downloadContentFromStorage = async (filePath: string): Promise<string> => {
  const client = ensureClient();
  
  const { data, error } = await client.storage
    .from('workout-content')
    .download(filePath);
    
  if (error) {
    console.error('Error downloading from storage:', error);
    throw new Error('Failed to download content from storage');
  }
  
  const text = await data.text();
  const parsed = JSON.parse(text);
  return parsed.content;
};

const cleanupStorageFiles = async (uid: string) => {
  const client = ensureClient();
  
  try {
    // List all files for this user
    const { data: files, error } = await client.storage
      .from('workout-content')
      .list(uid);
      
    if (error) {
      console.warn('Error listing storage files for cleanup:', error);
      return;
    }
    
    if (files && files.length > 0) {
      // Delete all files for this user
      const filePaths = files.map(file => `${uid}/${file.name}`);
      const { error: deleteError } = await client.storage
        .from('workout-content')
        .remove(filePaths);
        
      if (deleteError) {
        console.warn('Error deleting storage files:', deleteError);
      } else {
        console.log(`🗑️ Cleaned up ${filePaths.length} storage files for user`);
      }
    }
  } catch (error) {
    console.warn('Error during storage cleanup:', error);
  }
};

export const saveKnowledgeSources = async (uid: string, knowledgeSources: KnowledgeSource[]) => {
  const client = ensureClient();
  
  console.log('💾 Saving knowledge sources to storage:', knowledgeSources.length);
  
  // SAFETY CHECK: Prevent accidental data wipes
  if (knowledgeSources.length === 0) {
    console.warn('⚠️ Attempted to save 0 knowledge sources - BLOCKED to prevent data loss!');
    return; // Don't delete anything if no sources provided
  }
  
  // Clean up existing storage files for this user
  await cleanupStorageFiles(uid);
  
  // Delete all existing sources for this user
  await client.from('knowledge_sources').delete().eq('user_id', uid);
  
  // Process sources and upload large content to storage
  const processedSources = await Promise.all(
    knowledgeSources.map(async (source) => {
      const processedSource = { ...source };
      
      // Upload large content to storage if present
      if (source.data) {
        try {
          const storageFilePath = await uploadContentToStorage(uid, source.id, source.data, source.type);
          processedSource.storageFilePath = storageFilePath;
          // Remove large data from database record
          delete processedSource.data;
        } catch (error) {
          console.warn(`Failed to upload content for source ${source.id}:`, error);
          // Fallback: remove data to prevent database issues
          delete processedSource.data;
        }
      }
      
      return processedSource;
    })
  );
  
  // Insert all sources
  const rows = processedSources.map(source => ({
    user_id: uid,
    source,
    updated_at: new Date().toISOString()
  }));
  
  const { error } = await client.from('knowledge_sources').insert(rows);
  if (error) {
    console.error('Error saving knowledge sources:', error);
    throw new Error('Failed to save knowledge sources');
  }
  
  console.log('💾 Saved', processedSources.length, 'sources to database with storage');
};

// Recovery function to rebuild database from storage files
export const recoverKnowledgeSourcesFromStorage = async (uid: string): Promise<KnowledgeSource[]> => {
  const client = ensureClient();
  
  try {
    console.log('🔧 Starting recovery from storage for user:', uid);
    
    // List all storage files for this user
    const { data: files, error: listError } = await client.storage
      .from('workout-content')
      .list(uid);
    
    if (listError) {
      console.error('Error listing storage files:', listError);
      throw new Error('Failed to list storage files');
    }
    
    if (!files || files.length === 0) {
      console.log('📂 No storage files found for user');
      return [];
    }
    
    console.log(`📂 Found ${files.length} storage files to recover`);
    
    const recoveredSources: KnowledgeSource[] = [];
    
    // Process each file
    for (const file of files) {
      try {
        console.log(`📖 Recovering from: ${file.name}`);
        
        // Download the file content
        const { data: fileData, error: downloadError } = await client.storage
          .from('workout-content')
          .download(`${uid}/${file.name}`);
        
        if (downloadError) {
          console.error(`Error downloading ${file.name}:`, downloadError);
          continue;
        }
        
        // Parse the JSON content
        const textContent = await fileData.text();
        const sourceData = JSON.parse(textContent);
        
        // Reconstruct the KnowledgeSource object with proper data extraction
        const recoveredSource: KnowledgeSource = {
          id: sourceData.id || file.name.split('-').slice(0, 3).join('-'), // Extract ID from filename
          type: sourceData.type || (file.name.includes('youtube') ? 'youtube' : 'image'),
          status: 'complete', // Assume all stored sources are complete
          summary: sourceData.summary || sourceData.analysis || sourceData.textContent || 'Analysis data recovered from storage',
          preview: sourceData.preview || sourceData.url || sourceData.originalUrl || '',
          storageFilePath: `${uid}/${file.name}`,
          // Don't include data field - it's in storage
          data: undefined,
          mimeType: sourceData.mimeType || sourceData.type
        };
        
        recoveredSources.push(recoveredSource);
        console.log(`✅ Recovered source: ${recoveredSource.id} (${recoveredSource.type})`);
        
      } catch (parseError) {
        console.error(`Failed to parse ${file.name}:`, parseError);
        continue;
      }
    }
    
    if (recoveredSources.length > 0) {
      // Save recovered sources back to database
      console.log(`💾 Saving ${recoveredSources.length} recovered sources to database...`);
      
      const rows = recoveredSources.map(source => ({
        user_id: uid,
        source,
        updated_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await client.from('knowledge_sources').insert(rows);
      if (insertError) {
        console.error('Error saving recovered sources:', insertError);
        throw new Error('Failed to save recovered sources to database');
      }
      
      console.log(`🎉 Successfully recovered ${recoveredSources.length} knowledge sources!`);
    }
    
    return recoveredSources;
    
  } catch (error) {
    console.error('Recovery process failed:', error);
    throw new Error('Failed to recover knowledge sources from storage');
  }
};

export const saveWorkoutHistory = async (uid: string, workoutHistory: WorkoutLog[]) => {
  const client = ensureClient();
  const { error: deleteError } = await client.from('workout_logs').delete().eq('user_id', uid);
  if (deleteError && deleteError.code !== 'PGRST116') {
    console.error('Error clearing workout history:', deleteError);
    throw new Error('Failed to reset workout history.');
  }

  if (workoutHistory.length === 0) return;

  const rows = workoutHistory.map(log => ({ user_id: uid, log, updated_at: new Date().toISOString() }));
  const { error } = await client.from('workout_logs').insert(rows);
  if (error) {
    console.error('Error saving workout history:', error);
    throw new Error('Failed to save workout history.');
  }
};
