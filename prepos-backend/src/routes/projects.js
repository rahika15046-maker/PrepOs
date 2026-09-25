import { Router } from 'express'
import { listProjects, createProject, updateProject, deleteProject, recommendProjects } from '../controllers/projectController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', listProjects)
router.post('/', createProject)
router.get('/recommendations', recommendProjects)
router.patch('/:id', updateProject)
router.delete('/:id', deleteProject)

export default router
