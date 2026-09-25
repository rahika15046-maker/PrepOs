# PrepOS — career-prep operating system for technical students

A full-stack (MongoDB + Express + React) app that takes a student from "I want
to become a ___" to job-ready: an AI-generated, zero-to-job-ready roadmap
(role skills → Core CS → DSA → projects → interview prep), a daily/weekly
study scheduler that adapts to missed sessions, real LeetCode integration,
AI mock interviews with real grading, and an evidence-based job-readiness
score.

This build fixes the issues previously reported: scheduler/calendar only
generating one day and duplicating on regenerate, a shallow roadmap, no
working LeetCode connection, a non-functional interview feature, and a crash
in Job Readiness. See `ORIGINAL_README.md` / `AUDIT_REPORT.md` for the
original project notes.

## 1. Requirements

- Node.js 18+ and npm
- A MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas)
  cluster works fine)
- A **Gemini API key** ([free tier, ~1 minute to get](https://aistudio.google.com/apikey))
  or an OpenAI API key

> **Why an AI key is required, not optional:** PrepOS deliberately has no
> "fake AI" mode. Every roadmap, quiz, and interview evaluation is a real,
> freshly generated assessment — never fabricated placeholder content. A
> fake quiz score would defeat the entire point of "verified" progress. So
> the app needs a real key for anything AI-related (which is most of it).
> Everything else — the scheduler, calendar, DSA catalog, LeetCode sync,
> progress tracking — works with just a database, no AI key needed.

## 2. Backend setup

```bash
cd prepos-backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, COOKIE_SECRET, and GEMINI_API_KEY
npm run dev        # http://localhost:5000
```

`JWT_SECRET` and `COOKIE_SECRET` just need to be long random strings, e.g.:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

On first boot the server automatically seeds the 150-problem DSA catalog
(idempotent — safe to restart any number of times).

Run the backend test suite any time with `npm test`.

## 3. Frontend setup

```bash
cd prepos-frontend
npm install
cp .env.example .env
# edit .env if your backend isn't on localhost:5000
npm run dev         # http://localhost:5173
```

## 4. Using the app

1. Sign up, then complete onboarding: your target role, deadline, and daily
   routine (college hours, sleep, meals, exercise). No stack/tech picker —
   the AI works out what your specific role actually needs.
2. Onboarding calls the AI once to build your roadmap outline, then creates
   your goal and generates your full study plan (today → your deadline).
   The **detailed** curriculum (subtopics, concepts, quizzes, resources) for
   each topic keeps generating in the background — the Roadmap page shows
   progress and updates itself automatically.
3. **Calendar / Planner**: your whole plan is visible at once, with weekly
   goals. Mark blocks Completed / Partial / Skipped — anything unfinished
   is automatically re-planned into upcoming days, and reopening the app on
   a new day auto-recovers any days you missed entirely. No duplicate
   blocks on regenerate.
4. **DSA**: connect your public LeetCode username (right there on the DSA
   page) to pull in your real solved counts, streak, topic strengths and
   recent submissions, alongside the 150-problem in-app catalog.
5. **Core CS**: OOP / DBMS / OS / Computer Networks / System Design, each
   with the same subtopic → concept → quiz structure as the main roadmap.
6. **Interview**: pick categories/difficulty, answer AI-generated questions
   grounded in your actual roadmap and weak spots, get real per-answer
   grading and a final report.
7. **Job Readiness**: one score built from your actual verified progress
   across 7 weighted areas, with the biggest opportunities called out.

## 5. Deploying

- **Backend**: any Node host (Render, Railway, Fly.io, a VPS, etc.). Set the
  same environment variables from `.env.example` in the host's dashboard —
  never commit a real `.env` file. Point `CLIENT_URL` at your deployed
  frontend origin (used for CORS).
- **Frontend**: `npm run build` produces a static `dist/` folder — deploy it
  to Vercel, Netlify, Cloudflare Pages, or any static host. Set
  `VITE_API_URL` to your deployed backend's `/api` URL at build time.
- Make sure your MongoDB Atlas cluster's network access list includes your
  backend host (or is set to allow access from anywhere, if that fits your
  security requirements).

## 6. Security note

An earlier version of `prepos-backend/.env.example` had a **real MongoDB
password and real Gemini/Google Vision API keys committed in plaintext**.
Those have been removed and replaced with placeholders in this copy. If
those specific credentials were ever used, **rotate/delete them
immediately** in MongoDB Atlas / Google Cloud console — treat them as
compromised. Never commit real secrets to a repository, public or private.
