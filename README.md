# InterviewIQ

> AI-powered mock interview platform with real-time feedback on your answers, speech fluency, eye contact, and posture.

**[Live Demo →](https://interviewiq-omega.vercel.app)**

---

## About

InterviewIQ simulates a real job interview and gives you instant, AI-driven feedback on every dimension that matters — what you say, how clearly you say it, and how you carry yourself on camera. It combines large language models for answer analysis with computer vision for body language tracking, all running in the browser.

---

## Features

### AI Answer Analysis
Every answer is evaluated by **Groq Llama 3.3 70B** across four dimensions:
- **Relevance** — how directly the answer addresses the question
- **Grammar & Fluency** — language quality, vocabulary, sentence structure
- **STAR Method detection** — checks whether behavioral answers follow the Situation-Task-Action-Result structure
- Scored feedback with specific, actionable improvement points per answer

### Hybrid Speech Transcription
Two-layer transcription system that balances speed and accuracy:
- **Live captions** — Web Speech API delivers real-time on-screen text as you speak
- **Accurate final transcript** — Groq Whisper large-v3 processes each answer after you finish for high-accuracy text used in AI scoring
- Both outputs are combined so you get instant feedback without sacrificing transcript quality

### Stutter & Fluency Detection
- Diffs Web Speech vs Whisper transcripts to surface repeated words and phrases
- Uses Whisper word-level timestamps to detect unnatural pauses mid-answer
- Flags stutter patterns in the feedback report

### Eye Contact Tracking
- **MediaPipe FaceLandmarker** tracks 478 facial landmarks at real-time frame rate
- Eye Aspect Ratio (EAR) calculation distinguishes open eyes from blinks
- 12-frame rolling window smoothing eliminates false positives from natural blinks
- Produces a percentage eye contact score for the full session

### Posture Detection
- **MediaPipe PoseLandmarker** monitors shoulder alignment relative to camera center
- Falls back to face landmark position when full upper body isn't in frame
- Rolling smoothing distinguishes a real slouch from momentary movement
- Gives a posture consistency score alongside visual cues during the interview

### Custom Questions
- Create and save your own interview question sets for any role or domain
- Questions stored per-user in **Supabase PostgreSQL** with row-level security
- Sign in with Google to access — anonymous usage still works for built-in questions

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Answer AI | Groq — Llama 3.3 70B |
| Transcription | Groq — Whisper large-v3 |
| Computer Vision | MediaPipe FaceLandmarker + PoseLandmarker |
| Auth & Database | Supabase (Google OAuth + PostgreSQL) |
| Deployment | Vercel |

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/interview` | Live interview session with camera, mic, and real-time feedback |
| `/questions` | Custom question manager (Google sign-in required) |
| `/how-it-works` | Feature walkthrough |

---

## Run Locally

### Prerequisites
- Node.js 18+
- Groq API key — free at [console.groq.com](https://console.groq.com)
- Supabase project — free at [supabase.com](https://supabase.com)

```bash
git clone https://github.com/Wakrok-1/interviewiq
cd interviewiq
npm install
```

Create `.env.local`:
```env
GROQ_API_KEY=your-groq-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

Open `http://localhost:3000`

### Supabase Setup

Run this in the Supabase SQL editor:

```sql
create table custom_questions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  question text not null,
  created_at timestamptz default now()
);

alter table custom_questions enable row level security;

create policy "Users access own questions only"
  on custom_questions for all
  using (auth.uid() = user_id);
```

Enable Google OAuth: Supabase Dashboard → Authentication → Providers → Google.
