import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UserProfile, WorkoutPlan, WorkoutDay } from '../types';
import { YoutubeTranscript } from 'youtube-transcript';

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

  const systemInstruction = `You are an elite fitness architect and AI coach. Your task is to use a high-level summary of a user's interests to generate a personalized, multi-disciplinary workout plan for the specified duration. The final output MUST be a valid JSON object. Do not include any markdown formatting like \`\`\`json or surrounding text, only the raw JSON object.

User Profile:
- Fitness Level: ${userProfile.fitnessLevel}
- Goals: ${userProfile.goals.join(', ')}
- Equipment: ${userProfile.availableEquipment.join(', ')}
- Schedule: ${userProfile.daysPerWeek} days/week, ${userProfile.timePerSessionMinutes} mins/session.
- Desired Plan Duration: ${userProfile.planDurationWeeks} weeks.
- 1-Rep Maxes: ${performanceMetricsString || 'Not provided'}

Consolidated Workout Principles (from user's knowledge base):
${consolidatedSummary}

Generate a cohesive and effective ${userProfile.planDurationWeeks}-week workout plan tailored to the user's profile. Use the consolidated principles as your primary inspiration. For strength exercises where a 1RM is provided, prescribe weights as a percentage of their 1RM (e.g., "5x5 @ 80% 1RM"). The plan should contain ${userProfile.daysPerWeek} workout days per week for ${userProfile.planDurationWeeks} weeks.

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
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: "Generate the workout plan JSON based on the user profile and consolidated principles.",
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
    
    return JSON.parse(jsonText) as WorkoutPlan;

  } catch (error) {
    console.error("Error creating plan from summary:", error);
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
