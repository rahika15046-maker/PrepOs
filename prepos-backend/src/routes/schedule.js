import { Router } from 'express'
import {
  getRealityCheck,
  generatePlan,
  getScheduleOverview,
  listSchedule,
  updateScheduleEvent,
} from '../controllers/scheduleController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)

router.get('/reality-check', getRealityCheck)
router.get('/overview', getScheduleOverview)
router.post('/generate', generatePlan)
// Automatic "carry over yesterday's missed work" — same engine, friendlier name.
router.post('/rollover', generatePlan)
router.get('/', listSchedule)
router.patch('/:id', updateScheduleEvent)

export default router
