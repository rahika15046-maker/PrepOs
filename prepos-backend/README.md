# PrepOS — Backend

Express + MongoDB API powering every PrepOS feature: adaptive scheduling,
revision, replanning, DSA/Core CS/project tracking, job readiness scoring,
job applications, LinkedIn tracker, notifications, analytics, gamification,
and the AI notes/study engine.

## Quick start

You need a running MongoDB — either local (`mongod`) or a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster (see the repo root's
`SETUP_AND_DEPLOY.md` for click-by-click Atlas setup).

```bash
npm install
cp .env.example .env       # edit MONGO_URI, JWT_SECRET, etc.
npm run seed                 # populates roles, topics, DSA problems
npm run dev                   # starts on http://localhost:5000
```

Health check: `GET http://localhost:5000/api/health`

## Architecture

```
server.js                  Express app entry point
src/
  config/db.js              Mongoose connection
  models/                   24 Mongoose schemas (User, Goal, ScheduleEvent, ...)
  middleware/                auth (JWT), upload (multer), rate limiting, errors
  services/
    scheduleEngine.js        The adaptive scheduling algorithm (documented inline)
    revisionEngine.js         Spaced-repetition-flavoured priority queue
    adaptivePlanner.js         Replans future schedule on triggers, preserves fixed events
    documentProcessor.js       PDF/DOCX/TXT/image text extraction + OCR abstraction
    aiService.js                Pluggable Gemini / OpenAI-compatible / mock AI provider
    jobReadinessService.js       Role-weighted readiness scoring
    gamificationService.js        XP, levels, streaks, achievements
    notificationScheduler.js       node-cron reminder jobs
  controllers/ + routes/      One pair per resource, 21 route groups total
  seed/seedData.js            Demo roles, topics, DSA problems
```

## Going live with real AI / OCR

Everything works out of the box in **mock mode** — no external API keys
needed, and the full pipeline (upload → OCR → clean notes → summary →
flashcards → quiz → concept map → interview questions → document chat) is
fully exercisable with deterministic placeholder output.

To go live:

```bash
# .env
AI_PROVIDER=gemini            # or "openai"
GEMINI_API_KEY=your_key_here  # or OPENAI_API_KEY + OPENAI_BASE_URL

OCR_PROVIDER=google-vision     # or "tesseract" (npm i tesseract.js first)
GOOGLE_VISION_API_KEY=your_key_here
```

No other code changes are required — every feature calls the same
`aiService.js` / `documentProcessor.js` functions regardless of provider.

## Deploying

See the repo root's `SETUP_AND_DEPLOY.md` for deploying this to Render,
Railway, or your own server.

## Notes on this build

- **CareerPath** and **TopicDependency** from the original spec are folded
  into `Role.stacks` and `Topic.prerequisites` respectively, to avoid two
  near-duplicate models — functionally equivalent, one less join.
- **Resume/Interview readiness** in the job-readiness score are currently
  self-reported placeholders (`UserProfile.resumeReadiness` /
  `interviewReadiness`) since there's no dedicated resume-parsing or
  mock-interview feature yet — wire those in in a later phase.
- The Job Applications board and Kanban stage moves are done via a select
  dropdown rather than true drag-and-drop, to keep the first pass lightweight;
  swap in `@dnd-kit` on the frontend if you want physical dragging.
