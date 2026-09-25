import { Router } from 'express'
import { listApplications, createApplication, updateApplication, deleteApplication, getRecommendations } from '../controllers/jobApplicationController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', listApplications)
router.get('/recommendations', getRecommendations)
router.post('/', createApplication)
router.patch('/:id', updateApplication)
router.delete('/:id', deleteApplication)

export default router
