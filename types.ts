export enum AppView {
  AUTH = 'AUTH',
  PROFILE = 'PROFILE',
  GENERATE = 'GENERATE',
  WORKOUT = 'WORKOUT',
  ACTIVE_WORKOUT = 'ACTIVE_WORKOUT',
  HISTORY = 'HISTORY',
}

export interface PerformanceMetrics {
  unit: 'kg' | 'lbs';
  deadlift?: number;
  backSquat?: number;
  benchPress?: number;
  snatch?: number;
  cleanAndJerk?: number;
}

export interface UserProfile {
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite Athlete';
  goals: string[];
  availableEquipment: string[];
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6;
  timePerSessionMinutes: 30 | 45 | 60 | 90;
  planDurationWeeks: number;
  performanceMetrics: PerformanceMetrics;
}

export interface Exercise {
  name: string;
  sets: number | string;
  reps: number | string;
  notes?: string;
}

export type ConditioningType = 'AMRAP' | 'EMOM' | 'For Time' | 'Other';

export interface ConditioningBlock {
  type: ConditioningType;
  durationMinutes: number;
  exercises: Exercise[];
  notes?: string;
}

export interface WorkoutDay {
  week: number;
  day: number;
  focus: string;
  warmup: Exercise[];
  strength: Exercise[];
  conditioning: ConditioningBlock;
  cooldown: Exercise[];
  estimatedDurationMinutes?: number;
}

export interface WorkoutPlan {
  planName: string;
  durationWeeks: number;
  days: WorkoutDay[];
}

export interface KnowledgeSource {
  id: string;
  type: 'image' | 'youtube';
  // for image: base64 data. for youtube: the URL
  data?: string;
  // for image: data URL for preview. for youtube: the URL
  preview: string;
  mimeType?: string;
  summary?: string;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  error?: string;
}

// For workout logging
export interface LoggedExercise {
  name: string;
  sets: {
    reps: string | number;
    weight: string | number;
  }[];
}

export interface WorkoutLog {
  id: string;
  planName: string;
  day: number;
  week: number;
  focus: string;
  completedAt: string; // ISO string
  loggedExercises: LoggedExercise[];
}