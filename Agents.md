# AI Fitness Planner Agents

## Overview
- The app orchestrates multiple focused agents inside `App.tsx:22` and the `services/` folder to build personalised training plans from user preferences and external knowledge.
- Agents coordinate around a shared React state store, Gemini-generated insights, and persisted user data.
- Persistence now routes through Supabase (`services/supabaseService.ts:1`) with credentials provided via `.env.local`.

## Agent Directory
- `Profile Coach` (`App.tsx:76`): owns the `UserProfile` form, captures fitness context, pushes updates to persistence on each change, and exposes defaults defined in `defaultProfile` (`App.tsx:12`).
- `Knowledge Curator` (`App.tsx:174`): ingests image uploads and YouTube links, calls `analyzeContent` to summarise workouts, and tracks source status in `KnowledgeSource[]` state.
- `Insight Synthesiser` (`services/geminiService.ts:57` & `:99`): wraps Gemini calls that analyse sources and consolidate them into a unified training brief.
- `Plan Architect` (`services/geminiService.ts:123`): generates structured `WorkoutPlan` JSON from the user profile + consolidated principles, streaming results back to the UI.
- `Session Adjuster` (`services/geminiService.ts:209` & `App.tsx:700`): trims workouts to a target duration while preserving intent, enabling in-session flexibility.
- `Workout Logger` (`App.tsx:628`): captures performed sets/reps, timestamps completions, and appends to `WorkoutLog[]` for history review.
- `Data Sync Agent` (`services/supabaseService.ts:18` & `:69`): handles auth state, CRUD persisting of profile, plan, knowledge sources, and history against Supabase tables.

## AI Workflow
- Input collection: `Profile Coach` and `Knowledge Curator` gather the profile and curated sources (images/YouTube) before any AI call.
- Knowledge digestion: `analyzeContent` produces per-source summaries; once at least one completes, `summarizeKnowledge` synthesises an aggregate brief.
- Plan construction: `createPlanFromSummary` streams a multi-week plan that the UI stores via `handleSetWorkoutPlan` (`App.tsx:101`).
- Workout execution loop: `WorkoutScreen` (`App.tsx:521`) launches sessions, `ActiveWorkoutScreen` manages live adjustments/logging, and `HistoryScreen` (`App.tsx:790`) surfaces completed logs.

## Data & Persistence
- Current stack
- Auth + storage via Supabase Auth/PostgREST (`services/supabaseService.ts`).
- Client credentials injected from `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Pain points
  - Requires manual Firebase provisioning, Auth behaviour is tied to Firebase SDKs, and Firestore rules block deployments without manual setup.

## Supabase Migration Blueprint
1. **Provision Supabase** *(completed)*
   - Project `yqafwolraooswllyegog` with anon + service keys saved in `.env.local`.
   - Ensure email/password auth remains enabled (default in new projects).
2. **Model schema** (mirror `types.ts`)
   - `profiles` (`id` PK/UUID, `user_id` FK to `auth.users`, JSON `profile`, timestamps).
   - `workout_plans` (`id` UUID, `user_id`, JSON `plan`).
   - `knowledge_sources` (`id` UUID, `user_id`, JSON `source`).
   - `workout_logs` (`id` UUID, `user_id`, JSON `log`).
   - Use Supabase Row Level Security policies: allow owners to select/insert/update their rows.
3. **Client setup** *(completed)*
   - Added `@supabase/supabase-js` dependency and `services/supabaseClient.ts`.
4. **Auth service rewrite** *(completed)*
   - `App.tsx:39` now subscribes to Supabase auth events and uses Supabase sign-in/sign-up helpers.
5. **Persistence service rewrite** *(completed)*
   - `services/supabaseService.ts` handles CRUD with `profiles`, `workout_plans`, `knowledge_sources`, `workout_logs` tables.
6. **Config & cleanup**
   - Remove Firebase deps from `package.json` and delete `firebaseConfig.ts` once production Supabase integration is verified.
   - Add `.env` entries (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and document them in `README.md` (pending).
7. **Data migration (optional)**
   - Export existing Firestore docs, transform to Supabase row format, and load via SQL or the Supabase data importer.

## Implementation Checklist
- [x] Add Supabase client/service files and environment variables.
- [x] Update auth + persistence imports in `App.tsx` to point to Supabase layer.
- [x] Translate Firestore CRUD flows into Supabase queries; ensure JSON columns map to `UserProfile`, `WorkoutPlan`, `KnowledgeSource`, `WorkoutLog` types.
- [ ] Strip Firebase dependencies/config and verify no lingering imports remain.
- [ ] Exercise critical flows: sign-up/in, knowledge ingestion, plan generation, workout logging, logout.
