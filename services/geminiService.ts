import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserProfile, WorkoutPlan, WorkoutDay } from '../types';
import { YoutubeTranscript } from 'youtube-transcript';

// Goal-specific programming principles
interface GoalProgrammingRules {
  repRanges: string;
  setsPerExercise: string;
  setsPerMuscleGroupPerWeek: string;
  restPeriods: string;
  frequency: string;
  progressionStrategy: string;
  exerciseSelection: string;
  conditioning: string;
}

const GOAL_PROGRAMMING_RULES: Record<string, GoalProgrammingRules> = {
  "Build Muscle": {
    repRanges: "6-12 reps for main compounds, 8-15 reps for accessories",
    setsPerExercise: "3-6 sets per exercise",
    setsPerMuscleGroupPerWeek: "10-20 sets per muscle group per week",
    restPeriods: "2-3 minutes between compound sets, 1-2 minutes for accessories",
    frequency: "Each muscle group trained 2-3x per week",
    progressionStrategy: "Progressive overload via weight increases (2.5-5lb weekly), additional reps, or extra sets",
    exerciseSelection: "Prioritize compound movements (squats, deadlifts, presses), add isolation for targeted growth",
    conditioning: "Limited cardio (2-3x per week, 15-20 min) to preserve muscle building energy"
  },
  "Improve Endurance": {
    repRanges: "12-25+ reps for muscular endurance, varied rep ranges for cardiovascular endurance",
    setsPerExercise: "2-4 sets with shorter rest periods",
    setsPerMuscleGroupPerWeek: "8-15 sets per muscle group per week",
    restPeriods: "30-90 seconds between sets to maintain elevated heart rate",
    frequency: "4-6 training sessions per week with active recovery",
    progressionStrategy: "Increase training duration, reduce rest periods, add complexity or volume",
    exerciseSelection: "Circuit training, supersets, functional movements, compound exercises",
    conditioning: "High frequency cardio (4-5x per week), include HIIT, steady state, and metabolic circuits"
  },
  "Lose Weight": {
    repRanges: "8-15 reps with emphasis on metabolic stress",
    setsPerExercise: "3-5 sets with minimal rest",
    setsPerMuscleGroupPerWeek: "8-16 sets per muscle group per week",
    restPeriods: "30-60 seconds to maintain caloric burn and heart rate elevation",
    frequency: "5-6 sessions per week combining strength and cardio",
    progressionStrategy: "Increase training density, add metabolic finishers, progress conditioning intensity",
    exerciseSelection: "Full-body compound movements, circuits, supersets, plyometrics",
    conditioning: "High volume cardio (5-6x per week), HIIT circuits, metabolic conditioning"
  },
  "Increase Strength": {
    repRanges: "1-6 reps for main lifts, 6-8 reps for accessories",
    setsPerExercise: "3-8 sets for main movements, 2-4 for accessories",
    setsPerMuscleGroupPerWeek: "6-12 sets per muscle group per week (focused on big 3)",
    restPeriods: "3-5 minutes between main sets, 2-3 minutes for accessories",
    frequency: "3-4 sessions per week focusing on major movement patterns",
    progressionStrategy: "Linear progression on main lifts, percentage-based programming, deload weeks",
    exerciseSelection: "Prioritize squat, bench, deadlift, overhead press and their variations",
    conditioning: "Minimal cardio to preserve strength gains, focus on recovery"
  },
  "Improve Cardio": {
    repRanges: "15-25+ reps when using weights, focus on time-based intervals",
    setsPerExercise: "2-4 sets with active recovery",
    setsPerMuscleGroupPerWeek: "6-12 sets per muscle group per week",
    restPeriods: "Active recovery or 30-60 seconds",
    frequency: "5-6 sessions per week with variety in intensity",
    progressionStrategy: "Increase duration, intensity, or complexity of cardio sessions",
    exerciseSelection: "Bodyweight circuits, plyometrics, functional movements",
    conditioning: "Primary focus - varied heart rate zones, LISS, HIIT, tempo work, sport-specific conditioning"
  },
  "General Fitness": {
    repRanges: "8-15 reps for balanced strength and endurance",
    setsPerExercise: "2-4 sets per exercise",
    setsPerMuscleGroupPerWeek: "8-16 sets per muscle group per week",
    restPeriods: "1-2 minutes between sets",
    frequency: "3-5 sessions per week with balanced training",
    progressionStrategy: "Gradual increases in weight, reps, or training complexity",
    exerciseSelection: "Mix of compound and isolation exercises, functional movements",
    conditioning: "Moderate cardio (3-4x per week), varied intensity and duration"
  }
};

// Helper function to generate goal-specific programming instructions
const generateGoalSpecificInstructions = (goals: string[]): string => {
  if (goals.length === 0) return "";
  
  let instructions = "\n**GOAL-SPECIFIC PROGRAMMING REQUIREMENTS:**\n";
  
  // Handle multiple goals with priority and integration
  if (goals.length === 1) {
    const goal = goals[0];
    const rules = GOAL_PROGRAMMING_RULES[goal];
    if (rules) {
      instructions += `\nFor "${goal}" goal, you MUST follow these evidence-based principles:\n`;
      instructions += `- Rep Ranges: ${rules.repRanges}\n`;
      instructions += `- Sets: ${rules.setsPerExercise}\n`;
      instructions += `- Volume: ${rules.setsPerMuscleGroupPerWeek}\n`;
      instructions += `- Rest Periods: ${rules.restPeriods}\n`;
      instructions += `- Training Frequency: ${rules.frequency}\n`;
      instructions += `- Progression: ${rules.progressionStrategy}\n`;
      instructions += `- Exercise Selection: ${rules.exerciseSelection}\n`;
      instructions += `- Conditioning: ${rules.conditioning}\n`;
    }
  } else {
    // Multiple goals - need to balance and integrate
    instructions += `\nYou have MULTIPLE GOALS: ${goals.join(', ')}. You must INTELLIGENTLY INTEGRATE these goals:\n`;
    
    goals.forEach((goal, index) => {
      const rules = GOAL_PROGRAMMING_RULES[goal];
      if (rules) {
        instructions += `\n${index + 1}. For "${goal}":\n`;
        instructions += `   - Rep Ranges: ${rules.repRanges}\n`;
        instructions += `   - Exercise Selection: ${rules.exerciseSelection}\n`;
        instructions += `   - Conditioning: ${rules.conditioning}\n`;
      }
    });
    
    // Add integration guidelines
    instructions += `\n**GOAL INTEGRATION STRATEGY:**\n`;
    if (goals.includes("Build Muscle") && goals.includes("Improve Endurance")) {
      instructions += "- Use periodization: Strength-focused phases (6-8 reps) alternated with endurance phases (12-20 reps)\n";
      instructions += "- Include both compound movements AND metabolic circuits\n";
      instructions += "- Moderate cardio frequency (3-4x/week) to support endurance without compromising muscle growth\n";
    }
    if (goals.includes("Build Muscle") && goals.includes("Lose Weight")) {
      instructions += "- Prioritize compound movements with shorter rest periods (60-90 sec)\n";
      instructions += "- Include metabolic finishers after strength work\n";
      instructions += "- Higher training frequency (4-5x/week) for increased caloric expenditure\n";
    }
    if (goals.includes("Increase Strength") && goals.includes("Improve Endurance")) {
      instructions += "- Primary focus on strength (1-6 reps) with endurance accessories (12-20 reps)\n";
      instructions += "- Separate strength and cardio sessions when possible\n";
      instructions += "- Use power endurance exercises (kettlebell complexes, barbell circuits)\n";
    }
  }
  
  return instructions;
};

// Validation function to check if a workout plan aligns with stated goals
const validateWorkoutPlan = (plan: WorkoutPlan, goals: string[]): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  if (goals.length === 0) return { isValid: true, issues: [] };
  
  // Sample a few days for validation
  const sampleDays = plan.days.slice(0, Math.min(3, plan.days.length));
  
  for (const goal of goals) {
    switch (goal) {
      case "Build Muscle":
        // Check for hypertrophy rep ranges
        let hasHypertrophyReps = false;
        sampleDays.forEach(day => {
          day.strength.forEach(ex => {
            const reps = typeof ex.reps === 'string' ? ex.reps : String(ex.reps);
            if (reps.includes('6') || reps.includes('8') || reps.includes('10') || reps.includes('12')) {
              hasHypertrophyReps = true;
            }
          });
        });
        if (!hasHypertrophyReps) {
          issues.push("Build Muscle goal requires 6-12 rep ranges, but plan lacks hypertrophy-focused sets");
        }
        break;
        
      case "Improve Endurance":
        // Check for endurance elements
        let hasEnduranceWork = false;
        sampleDays.forEach(day => {
          if (day.conditioning && day.conditioning.durationMinutes >= 10) {
            hasEnduranceWork = true;
          }
          day.strength.forEach(ex => {
            const reps = typeof ex.reps === 'string' ? ex.reps : String(ex.reps);
            if (reps.includes('15') || reps.includes('20') || reps.includes('AMRAP')) {
              hasEnduranceWork = true;
            }
          });
        });
        if (!hasEnduranceWork) {
          issues.push("Improve Endurance goal requires high-rep work or conditioning, but plan lacks endurance elements");
        }
        break;
        
      case "Increase Strength":
        // Check for strength rep ranges
        let hasStrengthReps = false;
        sampleDays.forEach(day => {
          day.strength.forEach(ex => {
            const reps = typeof ex.reps === 'string' ? ex.reps : String(ex.reps);
            if (['1', '2', '3', '4', '5'].some(rep => reps.includes(rep))) {
              hasStrengthReps = true;
            }
          });
        });
        if (!hasStrengthReps) {
          issues.push("Increase Strength goal requires 1-6 rep ranges, but plan lacks strength-focused sets");
        }
        break;
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. Using mock data.");
} else {
  console.log("Gemini API key loaded successfully");
}

if (!YOUTUBE_API_KEY) {
  console.warn("VITE_YOUTUBE_API_KEY not set. YouTube analysis will be limited.");
} else {
  console.log("YouTube API key loaded successfully");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Extract YouTube video ID from various URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

// Fetch YouTube video metadata using direct API calls (browser-compatible)
const getYouTubeVideoData = async (videoUrl: string) => {
  const videoId = extractYouTubeVideoId(videoUrl);
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL format');
  }

  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    console.log(`🎬 Fetching video metadata for ${videoId}...`);
    
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`YouTube API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const video = data.items?.[0];
    
    if (!video) {
      throw new Error('Video not found');
    }

    const { snippet, contentDetails } = video;
    return {
      title: snippet?.title || '',
      description: snippet?.description || '',
      tags: snippet?.tags || [],
      duration: contentDetails?.duration || '',
      channelTitle: snippet?.channelTitle || '',
      publishedAt: snippet?.publishedAt || ''
    };
  } catch (error) {
    console.error('Error fetching YouTube video data:', error);
    throw new Error('Failed to fetch video information from YouTube API');
  }
};

// Fetch YouTube video transcript
const getYouTubeTranscript = async (videoUrl: string): Promise<string> => {
  const videoId = extractYouTubeVideoId(videoUrl);
  
  if (!videoId) {
    throw new Error('Invalid YouTube URL format');
  }
  
  try {
    console.log(`📝 Attempting to fetch transcript for video ${videoId}...`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available for this video');
    }
    
    const fullText = transcript
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ') // Clean up multiple spaces
      .trim();
    
    if (fullText.length < 10) {
      throw new Error('Transcript too short or empty');
    }
    
    console.log(`📝 Successfully extracted transcript from YouTube video ${videoId}: ${fullText.length} characters`);
    return fullText;
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    throw new Error('Failed to fetch YouTube transcript. Video may not have captions available or captions may be disabled.');
  }
};

const MOCK_WORKOUT_PLAN: WorkoutPlan = {
  planName: "Mock Fusion Strength",
  durationWeeks: 4,
  days: [
    {
      week: 1,
      day: 1,
      focus: "Full Body Power",
      warmup: [{ name: "Jumping Jacks", sets: "3", reps: "30s" }],
      strength: [{ name: "Barbell Squats", sets: 5, reps: 5, notes: "80% of 1RM" }],
      conditioning: {
        type: "AMRAP",
        durationMinutes: 15,
        exercises: [
          { name: "Kettlebell Swings", sets: "N/A", reps: "15" },
          { name: "Burpees", sets: "N/A", reps: "10" },
        ],
        notes: "Complete as many rounds as possible in 15 minutes."
      },
      cooldown: [{ name: "Pigeon Stretch", sets: 1, reps: "60s each side" }],
    },
     {
      week: 1,
      day: 2,
      focus: "Upper Body Hypertrophy",
      warmup: [{ name: "Arm Circles", sets: "2", reps: "30s each way" }],
      strength: [
        { name: "Bench Press", sets: 4, reps: 8, notes: "75% of 1RM" },
        { name: "Pull-ups", sets: 4, reps: "AMRAP", notes: "As many reps as possible" }
    ],
      conditioning: {
        type: "EMOM",
        durationMinutes: 10,
        exercises: [
          { name: "Push-ups", sets: "N/A", reps: "10" },
          { name: "Dumbbell Rows", sets: "N/A", reps: "12" },
        ],
        notes: "Alternate exercises every minute."
      },
      cooldown: [{ name: "Chest Stretch", sets: 1, reps: "60s" }],
    },
  ],
};


export const analyzeContent = async (
  sourceType: 'image' | 'youtube',
  data: string,
  mimeType?: string
): Promise<string> => {
  if (!ai) {
    const mockSummary = sourceType === 'image'
      ? "Analyzed Image: A high-intensity interval workout featuring kettlebell swings, box jumps, and push-ups. Appears to be a CrossFit-style AMRAP."
      : `Analyzed YouTube URL (${data}): A video explaining proper deadlift form and a strength progression for intermediate lifters.`;
    return new Promise(resolve => setTimeout(() => resolve(mockSummary), 1000 + Math.random() * 1000));
  }
  
  const systemInstruction = "You are a fitness expert. Analyze the provided workout content. Succinctly summarize the workout structure (e.g., AMRAP, EMOM), list key exercises, and identify the overall training style (e.g., CrossFit, bodybuilding, functional fitness).";
  
  let textPrompt: string;
  const parts: any[] = [];

  if (sourceType === 'image') {
    textPrompt = "Analyze the workout in this image.";
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: data,
      },
    });
    parts.push({ text: textPrompt });
  } else {
    // For YouTube, try to get video metadata first, then transcript as backup
    try {
      console.log(`🎥 Analyzing YouTube video: ${data}`);
      
      // Try YouTube Data API first
      try {
        const videoData = await getYouTubeVideoData(data);
        console.log(`📊 Got video metadata: "${videoData.title}"`);
        
        textPrompt = `Analyze this fitness video based on its metadata and provide a specific workout analysis:

**Video Title:** ${videoData.title}
**Description:** ${videoData.description.substring(0, 1000)}${videoData.description.length > 1000 ? '...' : ''}
**Tags:** ${videoData.tags.join(', ')}
**Duration:** ${videoData.duration}
**Channel:** ${videoData.channelTitle}

Based on this information, provide a specific analysis of this workout including:
1. Workout structure (AMRAP, EMOM, circuit, strength training, etc.)
2. Key exercises mentioned or implied by the title/description
3. Training style (CrossFit, bodybuilding, functional fitness, etc.)
4. Target fitness level and goals
5. Equipment likely needed

Provide a concise, specific analysis that can be used to create workout plans, not a generic framework.`;
        
        parts.push({ text: textPrompt });
        
      } catch (apiError) {
        console.log('📝 YouTube API failed, trying transcript...');
        
        // Fallback to transcript
        const transcript = await getYouTubeTranscript(data);
        textPrompt = `Analyze this workout video transcript and provide a summary of the workout structure, key exercises, and training style:\n\n${transcript}`;
        parts.push({ text: textPrompt });
      }
      
    } catch (allErrors) {
      console.error('All YouTube analysis methods failed:', allErrors);
      
      // Final fallback - analyze based on URL only
      const videoId = extractYouTubeVideoId(data);
      textPrompt = `Unable to access video content directly. Based on this YouTube fitness video URL: ${data}

Video ID: ${videoId}

Please provide a general analysis framework for fitness videos, focusing on what users should look for when analyzing workout content to help them create their own fitness plans. Keep this practical and specific to workout analysis.`;
      
      parts.push({ text: textPrompt });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: { systemInstruction },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error analyzing content:", error);
    throw new Error("Failed to analyze content from AI.");
  }
};

export const summarizeKnowledge = async (
  rawSummaries: string,
): Promise<string> => {
  if (!ai) {
    const mockConsolidatedSummary = "The user is interested in a hybrid training style, combining CrossFit-style AMRAPs (kettlebell swings, burpees) with traditional strength training principles like progressive overload on major lifts such as the deadlift.";
    return new Promise(resolve => setTimeout(() => resolve(mockConsolidatedSummary), 1500));
  }
  
  const systemInstruction = `You are a fitness expert. The following is a list of summaries from various workout sources. Synthesize them into a single, cohesive paragraph that identifies the core principles, key exercises, and dominant training styles present across all sources. This summary will be used to create a new, blended workout plan.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Here are the workout summaries:\n${rawSummaries}`,
      config: { systemInstruction },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error summarizing knowledge:", error);
    throw new Error("Failed to consolidate knowledge from AI.");
  }
};


export const createPlanFromSummary = async (
  userProfile: UserProfile,
  consolidatedSummary: string,
): Promise<WorkoutPlan> => {
  if (!ai) {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_WORKOUT_PLAN), 2000));
  }
  
  const performanceMetricsString = Object.entries(userProfile.performanceMetrics)
    .filter(([key, value]) => key !== 'unit' && value)
    .map(([key, value]) => `${key}: ${value}${userProfile.performanceMetrics.unit}`)
    .join(', ');

  // Generate goal-specific programming instructions
  const goalInstructions = generateGoalSpecificInstructions(userProfile.goals);

  let systemInstruction = `You are an elite fitness architect and AI coach. Your task is to generate a scientifically-backed, goal-oriented workout plan. The final output MUST be a valid JSON object. Do not include any markdown formatting like \`\`\`json or surrounding text, only the raw JSON object.

User Profile:
- Fitness Level: ${userProfile.fitnessLevel}
- Goals: ${userProfile.goals.join(', ')}
- Equipment: ${userProfile.availableEquipment.join(', ')}
- Schedule: ${userProfile.daysPerWeek} days/week, ${userProfile.timePerSessionMinutes} mins/session.
- Desired Plan Duration: ${userProfile.planDurationWeeks} weeks.
- 1-Rep Maxes: ${performanceMetricsString || 'Not provided'}

${goalInstructions}

**ADDITIONAL CONTEXT (User's Uploaded Content Analysis):**
${consolidatedSummary}

**CRITICAL INSTRUCTIONS:**
1. The goal-specific programming requirements above are MANDATORY - they override any conflicting information from the user's uploaded content
2. Use the uploaded content as inspiration for exercise selection and workout style, but ensure all programming parameters align with the stated goals
3. For strength exercises where a 1RM is provided, prescribe weights as percentages (e.g., "5x5 @ 80% 1RM")
4. Include progressive overload strategies throughout the ${userProfile.planDurationWeeks} weeks
5. The plan should contain exactly ${userProfile.daysPerWeek} workout days per week for ${userProfile.planDurationWeeks} weeks

**PRIORITY ORDER:** Goals > Programming Science > User Content Style

The JSON structure MUST adhere to the following format:
{
  "planName": "string",
  "durationWeeks": ${userProfile.planDurationWeeks},
  "days": [
    {
      "week": number,
      "day": number,
      "focus": "string",
      "estimatedDurationMinutes": number,
      "warmup": [{"name": "string", "sets": "string", "reps": "string", "notes": "string (optional)"}],
      "strength": [{"name": "string", "sets": "string", "reps": "string", "notes": "string (optional)"}],
      "conditioning": {
        "type": "'AMRAP' | 'EMOM' | 'For Time' | 'Other'",
        "durationMinutes": number,
        "exercises": [{"name": "string", "sets": "string", "reps": "string", "notes": "string (optional)"}],
        "notes": "string (optional)"
      },
      "cooldown": [{"name": "string", "sets": "string", "reps": "string", "notes": "string (optional)"}]
    }
  ]
}`;
  
  try {
    console.log("Generating workout plan...");
    
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: "Generate the workout plan JSON based on the user profile and goal-specific requirements.",
      config: {
        systemInstruction,
      },
    });

    let jsonText = '';
    for await (const chunk of stream) {
      jsonText += chunk.text;
    }
    
    // Clean potential markdown formatting
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
       jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }
    
    const plan = JSON.parse(jsonText) as WorkoutPlan;
    console.log("✅ Generated workout plan successfully");
    return plan;

  } catch (error) {
    console.error("Error creating plan:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate workout plan. ${error.message}`);
    }
    throw new Error("Failed to generate workout plan. An unknown error occurred.");
  }
};

export const adjustWorkoutDuration = async (
  workoutDay: WorkoutDay,
  newDurationMinutes: number
): Promise<WorkoutDay> => {
  if (!ai) {
    console.log(`Mock adjusting workout to ${newDurationMinutes} minutes.`);
    const adjustedDay = JSON.parse(JSON.stringify(workoutDay)); // Deep copy
    if (adjustedDay.strength.length > 1) {
      adjustedDay.strength.pop();
    } else if (adjustedDay.conditioning.exercises.length > 1) {
        adjustedDay.conditioning.exercises.pop();
    }
    adjustedDay.estimatedDurationMinutes = newDurationMinutes;
    return new Promise(resolve => setTimeout(() => resolve(adjustedDay), 1000));
  }

  const systemInstruction = `You are an expert fitness coach AI. Your task is to intelligently adjust a given workout session to fit a new, shorter duration.

- You will be given a JSON object representing a single day's workout.
- You will also be given a new target duration in minutes.
- Your goal is to modify the workout to fit this new duration while preserving its primary stimulus and focus.
- Prioritize the main strength work and the conditioning piece.
- You can reduce the number of sets, reps, or remove accessory or less critical exercises.
- Do NOT change the structure of the JSON. The output MUST be only the modified JSON object, with no extra text, explanations, or markdown formatting like \`\`\`json.`;

  const prompt = `Adjust the following workout JSON to be approximately ${newDurationMinutes} minutes long.

Original Workout:
${JSON.stringify(workoutDay, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as WorkoutDay;
  } catch (error) {
    console.error("Error adjusting workout duration:", error);
    throw new Error("Failed to adjust workout duration with AI.");
  }
};

// Export validation function for use in UI
export const validateWorkoutPlanForGoals = validateWorkoutPlan;

// Helper function to suggest progressive overload for next week
export const generateProgressiveOverload = (currentWeek: number, exercise: { name: string; sets: string | number; reps: string | number; notes?: string }, goals: string[]): string => {
  const suggestions: string[] = [];
  
  // Extract current parameters
  const sets = typeof exercise.sets === 'number' ? exercise.sets : parseInt(String(exercise.sets)) || 3;
  const reps = typeof exercise.reps === 'string' ? exercise.reps : String(exercise.reps);
  
  // Goal-specific progression strategies
  if (goals.includes("Build Muscle")) {
    if (currentWeek <= 2) {
      suggestions.push("Increase weight by 2.5-5lbs if all reps completed cleanly");
    } else if (currentWeek <= 4) {
      suggestions.push("Add 1-2 reps per set OR increase weight by 2.5lbs");
    } else {
      suggestions.push("Consider adding an extra set OR increase weight");
    }
  }
  
  if (goals.includes("Increase Strength")) {
    if (currentWeek <= 2) {
      suggestions.push("Increase weight by 5-10lbs for compound movements");
    } else {
      suggestions.push("Add weight or consider deload week if hitting plateau");
    }
  }
  
  if (goals.includes("Improve Endurance")) {
    suggestions.push("Reduce rest periods by 10-15 seconds OR add 2-5 reps");
  }
  
  return suggestions.length > 0 ? suggestions.join(". ") : "Maintain current parameters and focus on form";
};
