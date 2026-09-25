import { Router } from 'express'
import { listRevisions, scheduleSpacedRevision, completeRevision } from '../controllers/revisionController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', listRevisions)
router.post('/', scheduleSpacedRevision)
router.patch('/:id/complete', completeRevision)

export default router
