# IRON LOG - Personalized Gym Tracker

A full-stack Next.js App Router app with Firebase Auth (Google) and Firestore for workout logging and per-exercise PR tracking.

## Tech Stack

- Next.js `16` (App Router)
- React `19`
- Firebase Authentication (Google OAuth)
- Firestore (modular SDK)
- Tailwind CSS v4

## Features

- Google login with persistent Firebase session
- Dashboard with:
  - Start Workout
  - View Progress
  - Top 3 PR highlights
- Workout flow:
  - Choose split: Push / Pull / Legs
  - Select exercises from template
  - Log multiple sets per exercise (`set #`, `reps`, `weight`)
  - Save workout to Firestore
- PR tracking (critical logic):
  - `volume = weight * reps`
  - For each exercise in a session, best set volume is compared against existing PR
  - PR stored separately per user + exercise
- Progress page:
  - All exercises listed
  - Best volume for each
  - Last performed date (if available)
- Daily bodyweight tracking:
  - Save one weight entry per day
  - Weekly average weight (Mon-Sun)
  - Weekly change (weight lost or gained from first to last logged day of that week)

## Project Structure

```text
gym-tracker/
  firestore.rules
  .env.local.example
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
      login/page.tsx
      dashboard/page.tsx
      workout/page.tsx
      progress/page.tsx
    components/
      AuthProvider.tsx
      Navbar.tsx
      ExerciseCard.tsx
      SetInputRow.tsx
    lib/
      firebase.ts
      firestore.ts
      constants.ts
      pr.ts
      types.ts
      useRequireAuth.ts
```

## Firestore Data Model

Collections used by the app:

- `users`
  - `id`, `name`, `email`
- `sessions`
  - `id`, `user_id`, `type`, `date`
- `exercise_logs`
  - `id`, `session_id`, `user_id`, `exercise_name`, `performed_at`
- `sets`
  - `id`, `exercise_log_id`, `session_id`, `user_id`, `set_number`, `reps`, `weight`, `volume`, `created_at`
- `prs`
  - `id`, `user_id`, `exercise_name`, `best_volume`, `updated_at`
- `weight_logs`
  - `id`, `user_id`, `weight`, `date_key`, `logged_at`

## Firebase Setup

1. Create a Firebase project in the Firebase Console.
2. Add a Web App in Firebase Project Settings.
3. Enable Authentication:
   - Go to `Authentication` -> `Sign-in method`
   - Enable `Google`
4. Enable Firestore:
   - Go to `Firestore Database`
   - Create database (start in production mode if preferred)
5. Apply rules:
   - Copy content from `firestore.rules` into Firestore Rules editor, or deploy via Firebase CLI.

## Environment Variables

1. Copy example file:

```bash
cp .env.local.example .env.local
```

2. Fill `.env.local` with your Firebase Web App credentials:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build Check

```bash
npm run build
npm run start
```

## Deploy on Vercel

1. Push this project to GitHub/GitLab/Bitbucket.
2. Import project in Vercel.
3. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel Project Settings.
4. Deploy.

Vercel is fully compatible with this setup (Next.js App Router + Firebase client SDK).

## Exercise Templates

- Push:
  - Incline Press
  - Cable Lateral Raises
  - Low to High Cable Fly
  - High to Low Cable Fly
  - Pec Deck
  - Ab Crunches
- Pull:
  - Chest Supported T-Bar Row
  - Lat Pulldown
  - Single Arm Cable Lat Pull
  - Preacher Curl
  - Hammer Curl
  - Trap Shrugs
- Legs:
  - Incline Leg Press
  - Leg Extensions
  - Calf Raises
  - Hamstring Curls
