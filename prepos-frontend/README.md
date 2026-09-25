# PrepOS — Frontend (Phase 1)

Your Adaptive Tech Career Preparation Operating System.

This is the **frontend** of PrepOS: a React + Vite + Tailwind CSS app matching the
dark, glassmorphic, futuristic dashboard style from the reference design, built as
a set of separate, routed pages (not one giant screen).

## What's included

- **Design system** (`src/components/ui/`): Button, GlassCard, ProgressRing,
  ProgressBar, StatCard, SectionHeader, Modal, Input, Select, Badge, Tooltip,
  EmptyState, LoadingState, Skeleton.
- **Brand**: `PrepOSLogo.jsx` (reusable, animatable) and an original SVG mascot
  (`components/mascot/Mascot.jsx`) — no copyrighted characters used.
- **Pages** (each its own route):
  - `/` — Landing page (hero, features, stats)
  - `/login`, `/signup` — Auth (glowing-laptop concept, shared component, two modes)
  - `/onboarding` — 6-step onboarding (role -> stack -> skills -> deadline -> daily rhythm)
  - `/app` — Dashboard (goal card, job readiness ring, today's schedule, quick actions)
  - `/app/calendar` — Day/Week/Month calendar shell
  - `/app/roadmap` — Interactive roadmap built with React Flow
  - `/app/dsa` — DSA tracker (topic progress, streak, recent problems)
  - `/app/ai-study` — Prep AI chat UI
  - `/app/job-readiness` — Job readiness breakdown
  - Remaining sidebar items (Planner, Skills, Core CS, Projects, Applications,
    LinkedIn Tracker, Analytics, Notifications, Settings) are scaffolded as
    on-brand placeholder pages, ready to be filled in once their backend
    endpoints exist.

All data on these pages is **placeholder/demo data** — nothing is wired to a
real backend yet. That's phase 2.

## Run it locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview
```

## Brand logo

Your uploaded PrepOS logo image is at `public/logo.jpg`. The `PrepOSLogo.jsx`
component currently renders a code-based recreation of the mark so it scales
crisply and can be recolored/animated; swap its internals for
`<img src="/logo.jpg" />` if you'd rather use the uploaded file directly
everywhere instead.

## What's next (Phase 2 — backend)

- Express + MongoDB (Mongoose models: User, Role, Roadmap, Task, DSAProblem,
  Quiz, Project, Notes, ScheduleBlock)
- JWT auth (replacing the current placeholder login/signup submit handlers)
- `scheduleEngine.js` — the adaptive scheduling algorithm
- `revisionEngine.js` and `adaptivePlanner.js`
- AI service abstraction (Gemini / OpenAI-compatible), notes OCR pipeline,
  document chat, quiz generation
- Socket.io for live plan updates

Say the word and I'll start on the backend next.
