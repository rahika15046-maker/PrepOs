import { Router } from 'express'
import { getMe, updateMe, completeOnboarding } from '../controllers/userController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/me', getMe)
router.patch('/me', updateMe)
router.post('/onboarding', completeOnboarding)

export default router
