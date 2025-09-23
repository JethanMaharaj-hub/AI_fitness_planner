
import { firebaseConfig } from '../firebaseConfig';
import type { UserProfile, WorkoutPlan, KnowledgeSource, WorkoutLog } from '../types';
import type { User, Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// --- CONFIG CHECK ---
export const isFirebaseConfigured = !!firebaseConfig.apiKey;

interface FirebaseServices {
  auth: Auth;
  db: Firestore;
}

// --- INITIALIZATION PROMISE SINGLETON ---
// This promise ensures that Firebase is initialized only once, and all
// service functions wait for it to complete before executing. This is the
// most robust way to prevent race conditions with module loading.
const initializationPromise: Promise<FirebaseServices> = (async () => {
  if (!isFirebaseConfigured) {
    const errorMessage = "Firebase is not configured. Features will be disabled.";
    console.warn(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
  
  try {
    // Dynamically import all necessary modules to ensure they are loaded
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { initializeAuth, browserLocalPersistence } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');

    // Idempotent app initialization
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Explicitly initialize Auth for web
    const auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    });
    
    const db = getFirestore(app);

    return { auth, db };

  } catch (error) {
    console.error("Firebase initialization failed:", error);
    // Rethrow to ensure callers of the promise know about the failure.
    throw error;
  }
})();


// --- AUTHENTICATION ---

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
    let unsubscribe: (() => void) | null = null;
    let isUnsubscribed = false;

    initializationPromise.then(async ({ auth }) => {
        // Don't attach listener if the cleanup function has already been called
        if (isUnsubscribed) return;
        
        const { onAuthStateChanged: firebaseOnAuthStateChanged } = await import('firebase/auth');
        unsubscribe = firebaseOnAuthStateChanged(auth, callback);
    }).catch(error => {
        console.error("Failed to initialize Firebase for auth state changes:", error.message);
        callback(null);
    });

    // Return a cleanup function that can be called synchronously by React's useEffect
    return () => {
        isUnsubscribed = true;
        if (unsubscribe) {
            unsubscribe();
        }
    };
};

export const signUp = async (email: string, password: string): Promise<any> => {
    const { auth } = await initializationPromise;
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = async (email: string, password: string): Promise<any> => {
    const { auth } = await initializationPromise;
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return signInWithEmailAndPassword(auth, email, password);
};

export const signOut = async (): Promise<void> => {
    try {
        const { auth } = await initializationPromise;
        const { signOut: firebaseSignOut } = await import('firebase/auth');
        await firebaseSignOut(auth);
    } catch (error) {
        // If firebase isn't configured, this will fail. We can treat it as a no-op.
        if (error instanceof Error && error.message.includes("Firebase not configured")) {
             return Promise.resolve();
        }
        console.error("Sign out failed:", error);
        throw error;
    }
};


// --- FIRESTORE DATA MANAGEMENT ---

interface UserData {
    profile: UserProfile;
    workoutPlan: WorkoutPlan | null;
    knowledgeSources: KnowledgeSource[];
    workoutHistory: WorkoutLog[];
}

export const loadUserData = async (uid: string): Promise<UserData | null> => {
    const { db } = await initializationPromise;
    const { doc, getDoc } = await import('firebase/firestore');
    
    try {
        const docRef = doc(db, 'users', uid);
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
    try {
        const { db } = await initializationPromise;
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, data, { merge: true });
    } catch (error) {
        console.error("Error saving user data:", error);
    }
}

export const saveUserProfile = (uid: string, profile: UserProfile) => {
    saveData(uid, { profile });
};

export const saveWorkoutPlan = (uid: string, workoutPlan: WorkoutPlan | null) => {
    saveData(uid, { workoutPlan });
};

export const saveKnowledgeSources = (uid: string, knowledgeSources: KnowledgeSource[]) => {
    saveData(uid, { knowledgeSources });
};

export const saveWorkoutHistory = (uid:string, workoutHistory: WorkoutLog[]) => {
    saveData(uid, { workoutHistory });
};
