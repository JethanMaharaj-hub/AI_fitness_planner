import { firebaseConfig } from '../firebaseConfig';
import type { UserProfile, WorkoutPlan, KnowledgeSource, WorkoutLog } from '../types';

// Static imports for local NPM packages
import { initializeApp } from 'firebase/app';
import { 
  onAuthStateChanged as fbOnAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  browserLocalPersistence,
  initializeAuth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';

// --- CONFIG CHECK & INITIALIZATION ---
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey);

let firebaseApp: any;
let firebaseAuth: any;
let firebaseDb: any;

if (isFirebaseConfigured) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    // Use initializeAuth which is robust for preventing race conditions.
    firebaseAuth = initializeAuth(firebaseApp, {
      persistence: browserLocalPersistence
    });
    firebaseDb = getFirestore(firebaseApp);
    console.log("Firebase initialized successfully using local packages.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    // Set to null so the app knows services are unavailable
    firebaseAuth = null;
    firebaseDb = null;
  }
} else {
  console.warn("Firebase is not configured. All Firebase services are disabled.");
}

// --- AUTHENTICATION ---

export const onAuthStateChanged = (callback: (user: any) => void): (() => void) => {
  if (!firebaseAuth) {
    console.warn("Firebase Auth not available, returning empty listener.");
    callback(null);
    return () => {}; // Return a no-op unsubscribe function
  }
  return fbOnAuthStateChanged(firebaseAuth, callback);
};

export const signUp = (email: string, password: string): Promise<any> => {
  if (!firebaseAuth) throw new Error("Firebase Authentication is not available.");
  return createUserWithEmailAndPassword(firebaseAuth, email, password);
};

export const signIn = (email: string, password: string): Promise<any> => {
  if (!firebaseAuth) throw new Error("Firebase Authentication is not available.");
  return signInWithEmailAndPassword(firebaseAuth, email, password);
};

export const signOut = (): Promise<void> => {
  if (!firebaseAuth) {
     console.warn("Firebase not available for sign out.");
     return Promise.resolve();
  }
  return firebaseSignOut(firebaseAuth);
};

// --- FIRESTORE DATA MANAGEMENT ---

interface UserData {
  profile: UserProfile;
  workoutPlan: WorkoutPlan | null;
  knowledgeSources: KnowledgeSource[];
  workoutHistory: WorkoutLog[];
}

export const loadUserData = async (uid: string): Promise<UserData | null> => {
  if (!firebaseDb) throw new Error("Firestore is not available.");
  
  try {
    const docRef = doc(firebaseDb, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
    return null;
  } catch (error) {
     console.error("Error loading user data:", error);
     throw new Error("Failed to load user data.");
  }
};

const saveData = async (uid: string, data: Partial<UserData>) => {
  if (!firebaseDb) {
    console.error("Firestore not available for saving.");
    return;
  }
  try {
    const docRef = doc(firebaseDb, 'users', uid);
    await setDoc(docRef, data, { merge: true });
  } catch(error) {
    console.error("Error saving user data:", error);
  }
};

export const saveUserProfile = (uid: string, profile: UserProfile) => {
  return saveData(uid, { profile });
};

export const saveWorkoutPlan = (uid: string, workoutPlan: WorkoutPlan | null) => {
  return saveData(uid, { workoutPlan });
};

export const saveKnowledgeSources = (uid: string, knowledgeSources: KnowledgeSource[]) => {
  return saveData(uid, { knowledgeSources });
};

export const saveWorkoutHistory = (uid: string, workoutHistory: WorkoutLog[]) => {
  return saveData(uid, { workoutHistory });
};
