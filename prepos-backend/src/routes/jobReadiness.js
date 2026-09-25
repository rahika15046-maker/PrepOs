import { Router } from 'express'
import { getJobReadiness } from '../controllers/jobReadinessController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.get('/', protect, getJobReadiness)

export default router
