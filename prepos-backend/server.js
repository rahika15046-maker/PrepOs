import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

import { connectDB } from './src/config/db.js'

import {
  notFound,
  errorHandler,
} from './src/middleware/errorHandler.js'

import requestId from './src/middleware/requestId.js'

import {
  generalLimiter,
} from './src/middleware/rateLimiter.js'

import {
  startNotificationScheduler,
} from './src/services/notificationScheduler.js'

import authRoutes from './src/routes/auth.js'
import userRoutes from './src/routes/users.js'
import skillRoutes from './src/routes/skills.js'
import topicRoutes from './src/routes/topics.js'
import roadmapRoutes from './src/routes/roadmap.js'
import goalRoutes from './src/routes/goals.js'
import scheduleRoutes from './src/routes/schedule.js'
import taskRoutes from './src/routes/tasks.js'
import revisionRoutes from './src/routes/revisions.js'
import dsaRoutes from './src/routes/dsa.js'
import coreCsRoutes from './src/routes/coreCs.js'
import projectRoutes from './src/routes/projects.js'
import documentRoutes from './src/routes/documents.js'
import quizRoutes from './src/routes/quizzes.js'
import aiRoutes from './src/routes/ai.js'
import jobReadinessRoutes from './src/routes/jobReadiness.js'
import jobApplicationRoutes from './src/routes/jobApplications.js'
import linkedinRoutes from './src/routes/linkedin.js'
import notificationRoutes from './src/routes/notifications.js'
import analyticsRoutes from './src/routes/analytics.js'
import careerIntelligenceRoutes from './src/routes/careerIntelligence.js'
import interviewRoutes from './src/routes/interview.js'
import { ensureDsaCatalog } from './src/seed/dsaCatalog.js'

const app = express()

app.disable('x-powered-by')

app.use(requestId)

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'same-site',
    },
  })
)

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      'http://localhost:5173',

    credentials: true,
  })
)

app.use(
  express.json({
    limit: '2mb',
  })
)

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  })
)

app.use(
  cookieParser(
    process.env.COOKIE_SECRET
  )
)

app.use(
  morgan(
    process.env.NODE_ENV ===
      'production'
      ? 'combined'
      : 'dev'
  )
)

app.use(
  '/api',
  generalLimiter
)

app.get(
  '/api/health',
  (req, res) => {
    res.status(200).json({
      success: true,
      status: 'ok',
      time: new Date().toISOString(),
      requestId:
        req.requestId,
    })
  }
)

app.use(
  '/api/auth',
  authRoutes
)

app.use(
  '/api/users',
  userRoutes
)

app.use(
  '/api/skills',
  skillRoutes
)

app.use(
  '/api/topics',
  topicRoutes
)

app.use(
  '/api/roadmap',
  roadmapRoutes
)

app.use(
  '/api/goals',
  goalRoutes
)

app.use(
  '/api/schedule',
  scheduleRoutes
)

app.use(
  '/api/tasks',
  taskRoutes
)

app.use(
  '/api/revisions',
  revisionRoutes
)

app.use(
  '/api/dsa',
  dsaRoutes
)

app.use(
  '/api/core-cs',
  coreCsRoutes
)

app.use(
  '/api/projects',
  projectRoutes
)

app.use(
  '/api/documents',
  documentRoutes
)

app.use(
  '/api/quizzes',
  quizRoutes
)

app.use(
  '/api/ai',
  aiRoutes
)

app.use(
  '/api/job-readiness',
  jobReadinessRoutes
)

app.use(
  '/api/job-applications',
  jobApplicationRoutes
)

app.use(
  '/api/linkedin',
  linkedinRoutes
)

app.use(
  '/api/notifications',
  notificationRoutes
)

app.use(
  '/api/analytics',
  analyticsRoutes
)

app.use(
  '/api/career-intelligence',
  careerIntelligenceRoutes
)

app.use(
  '/api/interview',
  interviewRoutes
)

/*
 * IMPORTANT:
 *
 * Do NOT expose:
 *
 * /uploads
 *
 * publicly.
 *
 * Study documents can contain private
 * educational material.
 */

app.use(notFound)

app.use(errorHandler)

const PORT =
  Number(process.env.PORT) ||
  5000

async function start() {
  try {
    await connectDB(
      process.env.MONGO_URI
    )

    try {
      const seeded = await ensureDsaCatalog()
      console.log(`[seed] DSA catalog ready (${seeded.total} problems, ${seeded.upserted} added)`)
    } catch (error) {
      console.error('[seed] DSA catalog seeding failed:', error.message)
    }

    startNotificationScheduler()

    app.listen(
      PORT,
      () => {
        console.log(
          `[server] PrepOS API listening on port ${PORT}`
        )
      }
    )
  } catch (error) {
    console.error(
      '[server] failed to start:',
      error.message
    )

    process.exit(1)
  }
}

if (
  process.env.NODE_ENV !== 'test'
) {
  start()
}

export default app