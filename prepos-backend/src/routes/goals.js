import { Router } from 'express'
import { listGoals, createGoal, getActiveGoal } from '../controllers/goalController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', listGoals)
router.get('/active', getActiveGoal)
router.post('/', createGoal)

export default router
