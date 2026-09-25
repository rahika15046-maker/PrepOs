import { Router } from 'express'
import {
  createInterview,
  listInterviews,
  getInterview,
  answerInterviewQuestion,
  completeInterview,
} from '../controllers/interviewController.js'
import { protect } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimiter.js'

const router = Router()
router.use(protect)

router.get('/', listInterviews)
router.post('/', aiLimiter, createInterview)
router.get('/:id', getInterview)
router.post('/:id/answer', aiLimiter, answerInterviewQuestion)
router.post('/:id/complete', aiLimiter, completeInterview)

export default router
