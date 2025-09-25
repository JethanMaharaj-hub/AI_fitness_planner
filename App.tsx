
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppView, UserProfile, WorkoutPlan, Exercise, ConditioningBlock, KnowledgeSource, WorkoutDay, WorkoutLog } from './types';
import { UserIcon, GenerateIcon, WorkoutIcon, HistoryIcon, ClockIcon, LogoutIcon } from './components/icons';
import { createPlanFromSummary, summarizeKnowledge, analyzeContent, adjustWorkoutDuration } from './services/geminiService';
import Timer from './components/Timer';
import Loader from './components/Loader';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, onAuthStateChanged, signUp, signIn, signOut, loadUserData, saveUserProfile, saveWorkoutPlan, saveKnowledgeSources, saveWorkoutHistory } from './services/supabaseService';


const getYouTubeThumbnail = (url: string): string => {
  try {
    const urlObj = new URL(url);
    let videoId = '';
    
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1).split('?')[0];
    } else if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || '';
    }
    
    return videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : '';
  } catch {
    return '';
  }
};

const defaultProfile: UserProfile = {
  fitnessLevel: 'Intermediate',
  goals: ['Build Muscle', 'Improve Endurance'],
  availableEquipment: ['Barbell', 'Dumbbells', 'Pull-up Bar', 'Kettlebell'],
  daysPerWeek: 3,
  timePerSessionMinutes: 60,
  planDurationWeeks: 4,
  performanceMetrics: { unit: 'kg' }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.PROFILE);
  
  const [user, setUser] = useState<User | null>(null);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);

  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activeWorkoutDay, setActiveWorkoutDay] = useState<WorkoutDay | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const saveInProgressRef = useRef<boolean>(false);
  const currentSourcesRef = useRef<KnowledgeSource[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (authUser) => {
      setIsAppLoading(true);
      setError(null);
      if (authUser) {
        setUser(authUser);
        try {
          const userData = await loadUserData(authUser.id);
          if (userData) {
            setUserProfile(userData.profile || defaultProfile);
            setWorkoutPlan(userData.workoutPlan || null);
            
            // Don't overwrite knowledge sources if we're currently analyzing
            if (!isAnalyzingRef.current) {
              console.log('Auth reload: Setting knowledge sources from DB:', userData.knowledgeSources?.length || 0);
              setKnowledgeSources(userData.knowledgeSources || []);
            } else {
              console.log('Auth reload: Analysis in progress, not overwriting from DB');
            }
            
            setWorkoutHistory(userData.workoutHistory || []);
          } else {
             // New user, save default profile
            await saveUserProfile(authUser.id, defaultProfile);
            setUserProfile(defaultProfile); // ensure local state is also default
          }
        } catch (e: any) {
          console.error(e);
          // Provide a more specific, actionable error message for the common Supabase setup issues.
          setError("Could not connect to Supabase. Ensure the tables exist, row level security policies allow access, and your Supabase credentials are configured.");
        }
      } else {
        setUser(null);
        // Reset state on logout
        setUserProfile(defaultProfile);
        setWorkoutPlan(null);
        setKnowledgeSources([]);
        setWorkoutHistory([]);
      }
      setIsAppLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSetUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    if(user) saveUserProfile(user.id, profile);
  }

  const handleSetWorkoutPlan = (plan: WorkoutPlan | null) => {
    setWorkoutPlan(plan);
    if(user) saveWorkoutPlan(user.id, plan);
  }

  const handleSetKnowledgeSources = (sources: React.SetStateAction<KnowledgeSource[]>) => {
    const newSources = typeof sources === 'function' ? sources(knowledgeSources) : sources;
    console.log('🔴 handleSetKnowledgeSources called with:', newSources.length, 'sources');
    console.log('🔴 Current knowledgeSources state has:', knowledgeSources.length, 'sources');
    console.log('🔴 Stack trace:', new Error().stack);
    
    if (newSources.length === 0 && knowledgeSources.length > 0) {
      console.warn('⚠️ WARNING: State is being cleared from', knowledgeSources.length, 'to 0 sources!');
      console.log('⚠️ Previous sources were:', knowledgeSources.map(s => ({id: s.id, status: s.status})));
    }
    
    console.log('User context:', user ? user.id : 'No user');
    setKnowledgeSources(newSources);
    // Note: Database save happens after analysis completes via the final save callback
  };

  const handleSetWorkoutHistory = (logs: React.SetStateAction<WorkoutLog[]>) => {
    const newLogs = typeof logs === 'function' ? logs(workoutHistory) : logs;
    setWorkoutHistory(newLogs);
    if(user) saveWorkoutHistory(user.id, newLogs);
  };


  const handleAnalyzeSources = useCallback(async (sourcesToAnalyze: Omit<KnowledgeSource, 'status' | 'id'>[]) => {
    setError(null);
    isAnalyzingRef.current = true;
    saveInProgressRef.current = false; // Reset save flag for new analysis
    console.log('🚀 Starting analysis process, setting analyzing flag');
    
    const newSources: KnowledgeSource[] = sourcesToAnalyze.map((s, index) => ({
      ...s,
      id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'analyzing',
    }));

    // Add sources to state only (save to database after analysis completes)
    console.log('📝 Adding sources to state (database save deferred until analysis completes)');
    setKnowledgeSources(prev => {
      const updated = [...prev, ...newSources];
      currentSourcesRef.current = updated; // Keep ref in sync
      return updated;
    });

    let completedCount = 0;
    
    for (const source of newSources) {
      try {
        console.log(`Starting analysis for source: ${source.id}`);
        const summary = await analyzeContent(source.type, source.data!, source.mimeType);
        console.log(`Analysis completed for source: ${source.id}`);
        
        setKnowledgeSources(prev => {
          console.log('🔄 Before update:', prev.length, 'sources');
          const updated = prev.map(s => {
            if (s.id === source.id) {
              console.log(`✅ Updating source ${s.id} from ${s.status} to complete`);
              const completedSource: KnowledgeSource = { 
                ...s, 
                status: 'complete', 
                summary
                // Keep data for now - will be removed during storage upload
              };
              return completedSource;
            }
            return s;
          });
          console.log('🔄 After update:', updated.length, 'sources');
          
          // Update the ref with current sources
          currentSourcesRef.current = updated;
          
          return updated;
        });
        completedCount++;
      } catch (err: any) {
        console.error(`❌ Analysis failed for source: ${source.id}`, err);
        setKnowledgeSources(prev => {
          const updated = prev.map(s => s.id === source.id ? { ...s, status: 'error', error: err.message } : s);
          currentSourcesRef.current = updated; // Keep ref in sync
          return updated;
        });
        completedCount++;
      }
    }
    
    // Clear analyzing flag and trigger save when all sources are done
    if (completedCount === newSources.length) {
      isAnalyzingRef.current = false;
      console.log('🎉 Analysis complete, triggering save');
      
      // Trigger save after a delay to allow state to settle - OUTSIDE of state setter
      setTimeout(async () => {
        if (user && !saveInProgressRef.current) {
          saveInProgressRef.current = true;
          console.log('💾 Starting final save operation');
          
          try {
            // Use the ref to get current sources (avoids closure issues)
            const currentSources = currentSourcesRef.current;
            console.log('💾 Final save - Current sources:', currentSources.length, 
              'Data sizes:', currentSources.map(s => ({ id: s.id, status: s.status, dataSize: s.data?.length || 0 })));
            
            // Save with the current sources from ref
            await saveKnowledgeSources(user.id, currentSources);
            console.log('✅ Save completed successfully');
            
            // Clean up large data from state after successful save
            setKnowledgeSources(prev => prev.map(s => 
              s.type === 'image' && s.status === 'complete' 
                ? { ...s, data: undefined }
                : s
            ));
          } catch (error) {
            console.error('❌ Error saving final results:', error);
          } finally {
            saveInProgressRef.current = false;
          }
        } else {
          console.log('⏭️ Save skipped - already in progress or no user');
        }
      }, 200); // Increased delay to ensure all state updates complete
    }
  }, [handleSetKnowledgeSources]);

  const handleGeneratePlan = useCallback(async () => {
    const completedSources = knowledgeSources.filter(s => s.status === 'complete' && s.summary);
    if (completedSources.length === 0) {
      setError("Please analyze at least one source before generating a plan.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const rawSummaries = completedSources.map(s => `- ${s.summary}`).join('\n');

    try {
      setLoadingMessages(['Step 1/2: Consolidating knowledge...']);
      const consolidatedSummary = await summarizeKnowledge(rawSummaries);
      
      setLoadingMessages([
        'Step 2/2: Building your personalized plan...',
        'Analyzing your profile...',
        'Factoring in your 1-Rep Maxes...',
        'Blending workout styles...',
        'Finalizing workout structure...'
      ]);
      const plan = await createPlanFromSummary(userProfile, consolidatedSummary);

      handleSetWorkoutPlan(plan);
      setCurrentView(AppView.WORKOUT);
    } catch (err: any)
     {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, knowledgeSources, handleSetWorkoutPlan]);

  const handleStartWorkout = (day: WorkoutDay) => {
    setActiveWorkoutDay(day);
    setCurrentView(AppView.ACTIVE_WORKOUT);
  };

  const handleFinishWorkout = (log: WorkoutLog) => {
    handleSetWorkoutHistory(prev => [...prev, log]);
    setActiveWorkoutDay(null);
    setCurrentView(AppView.WORKOUT);
  }

  const renderView = () => {
    if (isLoading) {
      return <div className="flex-grow flex items-center justify-center"><Loader messages={loadingMessages} /></div>;
    }
    
    // This is our main error display for connection issues or other major problems
    if (error && !isLoading) {
       // A dismissible error for most cases, but the connection error is persistent
       const isConnectionError = error.includes("Could not connect");
       return (
         <div className="flex-grow flex items-center justify-center p-4">
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded relative text-center" role="alert">
              <strong className="font-bold">An Error Occurred</strong>
              <span className="block sm:inline ml-2">{error}</span>
               {!isConnectionError && <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
                <svg className="fill-current h-6 w-6 text-red-400" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
              </span>}
            </div>
         </div>
       );
    }


    switch (currentView) {
      case AppView.PROFILE:
        return <ProfileScreen profile={userProfile} setProfile={handleSetUserProfile} />;
      case AppView.GENERATE:
        return <GenerateScreen onAnalyze={handleAnalyzeSources} onGenerate={handleGeneratePlan} sources={knowledgeSources} error={error} setError={setError} />;
      case AppView.WORKOUT:
        return workoutPlan ? <WorkoutScreen plan={workoutPlan} onStartWorkout={handleStartWorkout} /> : <div className="text-center p-8">No workout plan generated yet. Go to the 'Generate' tab!</div>;
      case AppView.ACTIVE_WORKOUT:
        return activeWorkoutDay ? <ActiveWorkoutScreen day={activeWorkoutDay} planName={workoutPlan?.planName || ''} onFinish={handleFinishWorkout} /> : <div className="text-center p-8">No active workout.</div>;
       case AppView.HISTORY:
        return <HistoryScreen history={workoutHistory} />;
      default:
        return <ProfileScreen profile={userProfile} setProfile={handleSetUserProfile} />;
    }
  };

  const FullScreenLoader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex-grow flex flex-col items-center justify-center h-screen">
      <Loader messages={[message]} />
    </div>
  );

  if (isAppLoading) {
    return <FullScreenLoader message="Loading your profile..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
        {!isSupabaseConfigured && (
            <div className="bg-yellow-600 text-center p-2 text-white font-semibold">
                Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to enable login and data persistence.
            </div>
        )}
        
        {!user && isSupabaseConfigured ? <AuthScreen error={error} setError={setError} /> : (
            <>
                <header className="bg-gray-800/50 backdrop-blur-sm p-4 text-center sticky top-0 z-10">
                    <h1 className="text-2xl font-bold tracking-wider text-blue-400">AI Fitness Planner</h1>
                </header>
                <main className="flex-grow container mx-auto p-4 pb-24 max-w-4xl">
                    {renderView()}
                </main>
                <nav className="fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700">
                    <div className="container mx-auto flex justify-around max-w-4xl">
                    {[
                        { view: AppView.PROFILE, Icon: UserIcon, label: 'Profile' },
                        { view: AppView.GENERATE, Icon: GenerateIcon, label: 'Generate' },
                        { view: AppView.WORKOUT, Icon: WorkoutIcon, label: 'Workout' },
                        { view: AppView.HISTORY, Icon: HistoryIcon, label: 'History' },
                    ].map(({ view, Icon, label }) => (
                        <button
                        key={view}
                        onClick={() => setCurrentView(view)}
                        className={`flex flex-col items-center justify-center w-full p-3 transition-colors duration-200 ${currentView === view ? 'text-blue-400' : 'text-gray-400 hover:text-blue-300'}`}
                        aria-label={label}
                        aria-current={currentView === view}
                        >
                        <Icon className="h-6 w-6" />
                        <span className="text-xs mt-1">{label}</span>
                        </button>
                    ))}
                    </div>
                </nav>
            </>
        )}
    </div>
  );
}

// All sub-components would be defined below or imported
// For brevity, placing them here.

// --- AUTH SCREEN ---
const AuthScreen: React.FC<{error: string | null; setError: (e: string | null) => void}> = ({error, setError}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const mounted = useRef(true);

    useEffect(() => {
        // When the component unmounts, update the ref.
        return () => {
            mounted.current = false;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
            // On success, onAuthStateChanged will trigger a re-render of the parent,
            // unmounting this component. We don't set loading to false here to avoid
            // a state update on an unmounted component.
        } catch (error: any) {
            // Only update state if the component is still mounted.
            if (mounted.current) {
                let friendlyMessage = typeof error?.message === 'string' ? error.message : 'An unexpected error occurred.';
                if (/invalid login credentials/i.test(friendlyMessage)) {
                    friendlyMessage = 'Incorrect email or password. Please try again.';
                } else if (/email already registered/i.test(friendlyMessage)) {
                    friendlyMessage = 'An account already exists with this email address.';
                } else if (/password should be at least/i.test(friendlyMessage)) {
                    friendlyMessage = 'Password should meet the minimum length requirements.';
                }
                setError(friendlyMessage);
                setLoading(false);
            }
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="max-w-md w-full mx-auto rounded-lg bg-gray-800 shadow-lg p-8">
                <h2 className="text-3xl font-bold text-center text-blue-400 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-center text-gray-400 mb-8">{isLogin ? 'Sign in to continue' : 'Get started with your fitness journey'}</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            className="shadow-inner appearance-none border border-gray-700 rounded w-full py-3 px-4 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="email" type="email" placeholder="you@example.com"
                            value={email} onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            className="shadow-inner appearance-none border border-gray-700 rounded w-full py-3 px-4 bg-gray-700 text-gray-200 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="password" type="password" placeholder="******************"
                            value={password} onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline w-full transition-colors disabled:opacity-50"
                            type="submit"
                            disabled={loading}
                        >
                           {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mt-6 text-center" role="alert">
                        <p>{error}</p>
                    </div>
                )}

                <div className="text-center mt-6">
                    <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="inline-block align-baseline font-bold text-sm text-blue-400 hover:text-blue-300">
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- PROFILE SCREEN ---
const ProfileScreen: React.FC<{ profile: UserProfile; setProfile: (profile: UserProfile) => void; }> = ({ profile, setProfile }) => {
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setProfile({ ...profile, [field]: value });
  };
  
  const handleMetricChange = (field: keyof UserProfile['performanceMetrics'], value: any) => {
     setProfile({ ...profile, performanceMetrics: {...profile.performanceMetrics, [field]: value} });
  };
    
  return (
    <div className="space-y-6 pb-6">
       <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-blue-400">Your Profile</h2>
        <button onClick={handleSignOut} className="flex items-center space-x-2 bg-gray-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            <LogoutIcon className="w-5 h-5" />
            <span>Logout</span>
        </button>
      </div>

      {/* Fitness Level */}
      <div>
        <label className="block text-lg font-semibold mb-2 text-gray-300">Fitness Level</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Beginner', 'Intermediate', 'Advanced', 'Elite Athlete'].map(level => (
                <button key={level} onClick={() => handleInputChange('fitnessLevel', level)}
                    className={`p-3 rounded-lg text-sm font-semibold transition-all ${profile.fitnessLevel === level ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    {level}
                </button>
            ))}
        </div>
      </div>
      
      {/* Goals */}
      <div>
        <label className="block text-lg font-semibold mb-2 text-gray-300">Primary Goals</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Build Muscle', 'Improve Endurance', 'Lose Weight', 'Increase Strength', 'Improve Cardio', 'General Fitness'].map(goal => (
            <button key={goal} 
              onClick={() => {
                const currentGoals = [...profile.goals];
                const goalIndex = currentGoals.indexOf(goal);
                if (goalIndex > -1) {
                  currentGoals.splice(goalIndex, 1);
                } else {
                  currentGoals.push(goal);
                }
                handleInputChange('goals', currentGoals);
              }}
              className={`p-3 rounded-lg text-sm font-semibold transition-all ${
                profile.goals.includes(goal) ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'
              }`}>
              {goal}
            </button>
          ))}
        </div>
      </div>

       {/* Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
            <label htmlFor="daysPerWeek" className="block text-lg font-semibold mb-2 text-gray-300">Days Per Week</label>
            <select id="daysPerWeek" value={profile.daysPerWeek} onChange={e => handleInputChange('daysPerWeek', parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {[1,2,3,4,5,6].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
            </select>
        </div>
        <div>
            <label htmlFor="timePerSession" className="block text-lg font-semibold mb-2 text-gray-300">Time Per Session</label>
            <select id="timePerSession" value={profile.timePerSessionMinutes} onChange={e => handleInputChange('timePerSessionMinutes', parseInt(e.target.value))}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {[30, 45, 60, 90].map(t => <option key={t} value={t}>{t} minutes</option>)}
            </select>
        </div>
      </div>
       <div>
        <label htmlFor="planDuration" className="block text-lg font-semibold mb-2 text-gray-300">Plan Duration (Weeks)</label>
        <select id="planDuration" value={profile.planDurationWeeks} onChange={e => handleInputChange('planDurationWeeks', parseInt(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {[1, 2, 3, 4, 6, 8, 10, 12].map(weeks => <option key={weeks} value={weeks}>{weeks} week{weeks > 1 ? 's' : ''}</option>)}
        </select>
      </div>


      {/* Equipment */}
       <div>
        <label className="block text-lg font-semibold mb-2 text-gray-300">Available Equipment</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {['Barbell', 'Dumbbells', 'Kettlebell', 'Pull-up Bar', 'Cable Machine', 'Resistance Bands', 'Medicine Ball', 'Battle Ropes', 'Box/Platform', 'Rowing Machine', 'Assault Bike', 'Treadmill'].map(equipment => (
            <button key={equipment} 
              onClick={() => {
                const currentEquipment = [...profile.availableEquipment];
                const equipmentIndex = currentEquipment.indexOf(equipment);
                if (equipmentIndex > -1) {
                  currentEquipment.splice(equipmentIndex, 1);
                } else {
                  currentEquipment.push(equipment);
                }
                handleInputChange('availableEquipment', currentEquipment);
              }}
              className={`p-3 rounded-lg text-sm font-semibold transition-all ${
                profile.availableEquipment.includes(equipment) ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'
              }`}>
              {equipment}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-gray-300">1-Rep Max (Optional)</h3>
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-end mb-4">
                <div className="inline-flex bg-gray-700 rounded-lg p-1">
                    <button onClick={() => handleMetricChange('unit', 'kg')} className={`px-3 py-1 text-sm font-semibold rounded-md ${profile.performanceMetrics.unit === 'kg' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>kg</button>
                    <button onClick={() => handleMetricChange('unit', 'lbs')} className={`px-3 py-1 text-sm font-semibold rounded-md ${profile.performanceMetrics.unit === 'lbs' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>lbs</button>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['bench', 'squat', 'deadlift', 'press', 'snatch', 'cleanAndJerk'].map(exercise => (
                    <div key={exercise}>
                        <label htmlFor={exercise} className="block text-sm font-medium text-gray-400 capitalize">
                          {exercise === 'cleanAndJerk' ? 'Clean & Jerk' : exercise === 'press' ? 'Overhead Press' : exercise}
                        </label>
                        <input type="number" id={exercise} 
                            value={profile.performanceMetrics[exercise as keyof UserProfile['performanceMetrics']] || ''}
                            onChange={e => handleMetricChange(exercise as keyof UserProfile['performanceMetrics'], e.target.value ? parseInt(e.target.value) : undefined)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder={`in ${profile.performanceMetrics.unit}`}
                        />
                    </div>
                ))}
            </div>
        </div>
      </div>
       <p className="text-center text-sm text-gray-500 pt-4">Your profile is saved automatically.</p>
    </div>
  );
};


// --- GENERATE SCREEN ---
const GenerateScreen: React.FC<{
  onAnalyze: (sources: Omit<KnowledgeSource, 'id' | 'status'>[]) => Promise<void>;
  onGenerate: () => Promise<void>;
  sources: KnowledgeSource[];
  error: string | null;
  setError: (error: string | null) => void;
}> = ({ onAnalyze, onGenerate, sources, error, setError }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setError(null);
        const imageFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            setError('Please select valid image files.');
            return;
        }

        const sourcesToAnalyze: Omit<KnowledgeSource, 'id' | 'status'>[] = [];
        let readCount = 0;

        imageFiles.forEach((file: File) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = (e.target?.result as string).split(',')[1];
                const dataUrl = e.target?.result as string;

                sourcesToAnalyze.push({
                    type: 'image',
                    data: base64Data,
                    preview: dataUrl,
                    mimeType: file.type,
                });
                
                readCount++;
                if (readCount === imageFiles.length) {
                    onAnalyze(sourcesToAnalyze);
                }
            };
            reader.onerror = () => {
                 setError(`Error reading file: ${file.name}`);
                 readCount++;
                 if (readCount === imageFiles.length && sourcesToAnalyze.length > 0) {
                    onAnalyze(sourcesToAnalyze);
                }
            }
            reader.readAsDataURL(file as Blob);
        });

        // Reset the input
        event.target.value = '';
    };
    
    const handleAddYoutubeUrl = () => {
        if (!youtubeUrl.trim() || !/^(https|http):\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtubeUrl)) {
            setError("Please enter a valid YouTube URL.");
            return;
        }
        setError(null);
        onAnalyze([{ type: 'youtube', data: youtubeUrl, preview: youtubeUrl }]);
        setYoutubeUrl('');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-blue-400">Build Your Knowledge Base</h2>
            <p className="text-gray-400">Add workout content from images or YouTube. The AI will analyze them to understand your preferences and build a plan tailored to you.</p>

            {/* Input Section */}
            <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                {/* Image Upload */}
                <div>
                    <button onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                        Upload Workout Image(s)
                    </button>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                </div>
                {/* YouTube URL */}
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="Paste YouTube workout URL"
                        className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button onClick={handleAddYoutubeUrl} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">Add</button>
                </div>
            </div>

            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">{error}</div>}

            {/* Knowledge Sources List */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Sources ({sources.length})</h3>
                </div>
                {sources.length === 0 && <p className="text-gray-500 text-center py-4">No sources added yet.</p>}
                {sources.map((source, index) => (
                    <div key={`${source.id}-${index}`} className="bg-gray-800 p-3 rounded-lg flex items-start space-x-4">
                        <img src={source.type === 'image' ? (source.preview?.startsWith('data:image') ? source.preview : '/placeholder-image.png') : getYouTubeThumbnail(source.preview)}
                            alt="source preview" className="w-24 h-20 object-cover rounded-md flex-shrink-0" />
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-semibold truncate pr-2">{source.type === 'youtube' ? source.preview : 'Uploaded Image'}</p>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    source.status === 'complete' ? 'bg-green-500 text-gray-900' : 
                                    source.status === 'analyzing' ? 'bg-yellow-500 text-gray-900' : 
                                    source.status === 'error' ? 'bg-red-500 text-white' : 'bg-gray-600'}`
                                }>
                                    {source.status}
                                </span>
                            </div>
                            {source.status === 'analyzing' && <div className="text-xs text-yellow-400 mt-1">Analyzing...</div>}
                            {source.status === 'complete' && <p className="text-xs text-gray-400 mt-1 italic line-clamp-2">{source.summary}</p>}
                            {source.status === 'error' && <p className="text-xs text-red-400 mt-1">{source.error}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Generate Button */}
            <button onClick={onGenerate}
                disabled={!sources.some(s => s.status === 'complete')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg transition-all text-lg disabled:bg-gray-700 disabled:cursor-not-allowed">
                Generate My Plan
            </button>
        </div>
    );
};


// --- WORKOUT SCREEN ---
const WorkoutScreen: React.FC<{ plan: WorkoutPlan; onStartWorkout: (day: WorkoutDay) => void; }> = ({ plan, onStartWorkout }) => {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const daysForWeek = plan.days.filter(d => d.week === selectedWeek);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-blue-400">{plan.planName}</h2>

      {/* Week Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {Array.from({ length: plan.durationWeeks }, (_, i) => i + 1).map(week => (
          <button key={week} onClick={() => setSelectedWeek(week)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${selectedWeek === week ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
            Week {week}
          </button>
        ))}
      </div>

      {/* Workout Days */}
      <div className="space-y-4">
        {daysForWeek.map((day, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-200">Day {day.day} - {day.focus}</h3>
                <p className="text-sm text-gray-400 flex items-center mt-1"><ClockIcon className="w-4 h-4 mr-1.5" /> Est. {day.estimatedDurationMinutes || '60'} mins</p>
              </div>
              <button onClick={() => onStartWorkout(day)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg transition-colors">
                Start
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// --- ACTIVE WORKOUT SCREEN ---
const ActiveWorkoutScreen: React.FC<{ day: WorkoutDay; planName: string; onFinish: (log: WorkoutLog) => void; }> = ({ day, planName, onFinish }) => {
    
    const [currentDay, setCurrentDay] = useState(day);
    const [isAdjusting, setIsAdjusting] = useState(false);
    
    // Create an initial log structure
    const createInitialLog = (workoutDay: WorkoutDay) => {
        const loggedExercises: {name: string, sets: {reps: string | number, weight: string | number}[]}[] = [];
        
        const processExercises = (exercises: Exercise[]) => {
            exercises.forEach(ex => {
                 const numSets = typeof ex.sets === 'string' ? 3 : ex.sets; // Default to 3 sets if AMRAP/etc.
                 loggedExercises.push({
                     name: ex.name,
                     sets: Array.from({length: numSets}, () => ({reps: '', weight: ''}))
                 })
            });
        }
        
        processExercises(workoutDay.warmup);
        processExercises(workoutDay.strength);
        // We don't log conditioning exercises in this detailed way
        processExercises(workoutDay.cooldown);
        
        return loggedExercises;
    };
    
    const [loggedExercises, setLoggedExercises] = useState(createInitialLog(currentDay));

    useEffect(() => {
      setLoggedExercises(createInitialLog(currentDay));
    }, [currentDay]);

    const handleLogChange = (exIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
        const newLogs = [...loggedExercises];
        newLogs[exIndex].sets[setIndex][field] = value;
        setLoggedExercises(newLogs);
    };

    const handleFinish = () => {
        const finalLog: WorkoutLog = {
            id: `${Date.now()}`,
            planName,
            day: currentDay.day,
            week: currentDay.week,
            focus: currentDay.focus,
            completedAt: new Date().toISOString(),
            loggedExercises: loggedExercises.filter(ex => ex.sets.some(s => s.reps || s.weight)) // Only save exercises that were logged
        };
        onFinish(finalLog);
    };
    
    const handleAdjustTime = async (newTime: number) => {
        setIsAdjusting(true);
        try {
            const adjustedDay = await adjustWorkoutDuration(currentDay, newTime);
            setCurrentDay(adjustedDay);
        } catch (error) {
            console.error("Failed to adjust time:", error);
            // Optionally set an error state to show in the UI
        } finally {
            setIsAdjusting(false);
        }
    };
    
    const renderExerciseBlock = (title: string, exercises: Exercise[], isLoggable: boolean = true) => {
        let exerciseCounter = -1;
        
        // Find start index for logging
        if (isLoggable) {
            const firstExerciseName = exercises[0]?.name;
            exerciseCounter = loggedExercises.findIndex(le => le.name === firstExerciseName);
        }

        if (!exercises || exercises.length === 0) return null;
        return (
            <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">{title}</h3>
                <div className="space-y-3">
                    {exercises.map((ex, index) => (
                        <div key={index} className="bg-gray-800 p-3 rounded-lg">
                            <p className="font-semibold">{ex.name}</p>
                            <p className="text-sm text-gray-400">{ex.sets} sets x {ex.reps} reps</p>
                            {ex.notes && <p className="text-xs text-gray-500 mt-1 italic">{ex.notes}</p>}
                            {isLoggable && exerciseCounter !== -1 && (
                                <div className="mt-2 space-y-2">
                                     {loggedExercises[exerciseCounter + index].sets.map((set, setIndex) => (
                                         <div key={setIndex} className="flex items-center space-x-2 text-sm">
                                             <span className="w-8 text-right text-gray-500">Set {setIndex + 1}</span>
                                             <input type="number" placeholder="reps" value={set.reps} onChange={(e) => handleLogChange(exerciseCounter + index, setIndex, 'reps', e.target.value)}
                                                 className="w-20 bg-gray-700 border border-gray-600 rounded p-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"/>
                                             <input type="number" placeholder="weight" value={set.weight} onChange={(e) => handleLogChange(exerciseCounter + index, setIndex, 'weight', e.target.value)}
                                                className="w-20 bg-gray-700 border border-gray-600 rounded p-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                                         </div>
                                     ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-6">
            <h2 className="text-2xl font-bold text-gray-200">Week {currentDay.week}, Day {currentDay.day}</h2>
            <p className="text-xl text-blue-400 -mt-4">{currentDay.focus}</p>

            {/* Time Adjustment */}
            <div className="bg-gray-800 p-3 rounded-lg">
                <p className="text-sm font-semibold mb-2 text-gray-300">Short on time? Adjust workout duration.</p>
                {isAdjusting ? (
                    <div className="flex items-center justify-center space-x-2 text-yellow-400">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Adjusting...</span>
                    </div>
                ) : (
                    <div className="flex space-x-2">
                        {[30, 45].map(time => (
                            <button key={time} onClick={() => handleAdjustTime(time)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm font-semibold py-2 px-3 rounded-md transition-colors">
                                Adjust to {time} min
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {renderExerciseBlock("Warm-up", currentDay.warmup)}
            {renderExerciseBlock("Strength / Main Lifts", currentDay.strength)}

            {/* Conditioning */}
            {currentDay.conditioning && (
                <div>
                    <h3 className="text-xl font-bold text-blue-400 mb-2">Conditioning</h3>
                    <Timer type={currentDay.conditioning.type} durationMinutes={currentDay.conditioning.durationMinutes} />
                    <div className="bg-gray-800 p-3 rounded-lg mt-2">
                        {currentDay.conditioning.exercises.map((ex, i) => (
                            <p key={i} className="text-sm"><span className="font-semibold">{ex.name}:</span> {ex.reps} reps</p>
                        ))}
                        {currentDay.conditioning.notes && <p className="text-xs text-gray-500 mt-2 italic">{currentDay.conditioning.notes}</p>}
                    </div>
                </div>
            )}
            
            {renderExerciseBlock("Cooldown", currentDay.cooldown)}

            <button onClick={handleFinish}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg transition-colors text-lg">
                Finish & Log Workout
            </button>
        </div>
    );
};


// --- HISTORY SCREEN ---
const HistoryScreen: React.FC<{ history: WorkoutLog[] }> = ({ history }) => {
  const sortedHistory = [...history].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  if (history.length === 0) {
    return <div className="text-center p-8 text-gray-500">No completed workouts yet.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-blue-400">Workout History</h2>
      <div className="space-y-4">
        {sortedHistory.map(log => (
          <div key={log.id} className="bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-400">{new Date(log.completedAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <h3 className="text-xl font-bold">{log.planName} - W{log.week}D{log.day}</h3>
            <p className="font-semibold text-blue-300">{log.focus}</p>
            <div className="mt-2 text-sm space-y-1">
              {log.loggedExercises.map((ex, i) => (
                <div key={i}>
                  <span className="font-semibold text-gray-300">{ex.name}: </span>
                  <span className="text-gray-400">
                    {ex.sets.map(s => `${s.reps}x${s.weight}`).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default App;
