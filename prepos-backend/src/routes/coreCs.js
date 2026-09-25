import { Router } from 'express'
import { getCoreCsProgress, updateCoreCsProgress, getCoreCsQuiz, enableCoreCsTrack } from '../controllers/coreCsController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', getCoreCsProgress)
router.post('/enable', enableCoreCsTrack)
router.put('/', updateCoreCsProgress)
router.post('/:subject/quiz', getCoreCsQuiz)

export default router
