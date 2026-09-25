import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimiter.js'
import {
  getBlueprint,
  generateBlueprint,
  expandBlueprint,
  upgradeBlueprint,
  getDetailStatus,
} from '../controllers/careerIntelligenceController.js'

const router = Router()

router.use(protect)

router.get('/blueprint', getBlueprint)
router.get('/blueprint/status', getDetailStatus)
router.post('/blueprint', aiLimiter, generateBlueprint)
router.post('/blueprint/expand', aiLimiter, expandBlueprint)
router.post('/blueprint/upgrade', aiLimiter, upgradeBlueprint)

export default router
