import { Router } from 'express'
import { listTasks, createTask, updateTaskStatus } from '../controllers/taskController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', listTasks)
router.post('/', createTask)
router.patch('/:id', updateTaskStatus)

export default router
