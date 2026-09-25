import { Router } from 'express'
import {
  getRoadmap,
} from '../controllers/roadmapController.js'
import { protect } from '../middleware/auth.js'

const router = Router()

router.use(protect)

router.get('/', getRoadmap)

export default router