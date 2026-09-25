import { Router } from 'express'
import {
  listProblems,
  getUserDsaProgress,
  markProblemProgress,
  connectLeetCode,
  syncLeetCode,
  disconnectLeetCode,
} from '../controllers/dsaController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)

router.get('/problems', listProblems)
router.get('/progress', getUserDsaProgress)
router.put('/progress', markProblemProgress)
router.post('/leetcode/connect', connectLeetCode)
router.post('/leetcode/sync', syncLeetCode)
router.delete('/leetcode', disconnectLeetCode)

export default router
