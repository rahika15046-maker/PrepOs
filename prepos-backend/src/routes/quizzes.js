import { Router } from 'express'
import { getQuiz, submitQuizAttempt } from '../controllers/quizController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/:id', getQuiz)
router.post('/:id/attempt', submitQuizAttempt)

export default router
