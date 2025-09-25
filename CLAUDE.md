# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Setup

Required environment variables in `.env.local`:
- `GEMINI_API_KEY` - Google Gemini API key for AI workout generation
- `VITE_SUPABASE_URL` - Supabase project URL (optional, enables user auth and data persistence)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (optional, enables user auth and data persistence)

The app functions without Supabase but will only store data locally. When Supabase is configured, users can create accounts and sync data across devices.

## Architecture Overview

This is a React 19 + TypeScript + Vite fitness planner application that uses Google Gemini AI to generate personalized workout plans.

**Core Flow:**
1. Users upload workout images or YouTube URLs in the Generate tab
2. Gemini AI analyzes content to understand workout preferences
3. AI consolidates knowledge and generates a personalized workout plan
4. Users can execute workouts with built-in timer and logging
5. All data is persisted via Supabase (if configured) or locally

**Key Architectural Patterns:**
- Single-page application with tab navigation (Profile, Generate, Workout, History)
- React state management with local persistence fallbacks
- Service layer pattern for external integrations (Gemini AI, Supabase)
- TypeScript interfaces define clear data contracts throughout the app
- Responsive design with mobile-first approach

**AI Integration:**
- Uses `@google/genai` SDK with Gemini 2.5 Flash model
- Three main AI operations: content analysis, knowledge summarization, and plan generation
- Structured prompts with system instructions for consistent JSON outputs
- Stream processing for real-time plan generation feedback

**Data Flow:**
- App.tsx manages global state and coordinates between components
- Services handle external API calls and data transformation
- Types are centralized in types.ts for consistency
- Supabase stores user profiles, workout plans, knowledge sources, and workout logs

## Key Files

- `App.tsx` - Main application component with all screens and state management
- `types.ts` - TypeScript interfaces for the entire application
- `services/geminiService.ts` - Google Gemini AI integration for workout analysis and generation
- `services/supabaseService.ts` - Supabase integration for user auth and data persistence
- `services/supabaseClient.ts` - Supabase client configuration
- `components/Timer.tsx` - Workout timer component for AMRAP/EMOM/timed workouts
- `components/Loader.tsx` - Loading states with progress messages

## Working with AI Features

When modifying AI-related functionality:
- Mock responses are available when `API_KEY` is not set for development
- Gemini responses are streamed for better UX during plan generation
- All AI prompts use system instructions for consistent outputs
- JSON parsing includes error handling and format cleaning
- Content analysis supports both image and YouTube URL analysis