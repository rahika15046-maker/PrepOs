import { Router } from 'express'
import { aiStatus, askAssistant } from '../controllers/aiController.js'
import { protect } from '../middleware/auth.js'
import {
  aiLimiter,
} from '../middleware/rateLimiter.js'
const router = Router()
router.get('/status', protect, aiStatus)
router.post('/ask', protect, askAssistant)
router.use(protect)
router.use(aiLimiter)
export default router
