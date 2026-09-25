import { Router } from 'express'

import {
  listRoles,
  getRole,
  generateMyBlueprint,
  getMyBlueprint,
} from '../controllers/roleController.js'

import { protect } from '../middleware/auth.js'

const router = Router()

router.use(protect)

router.get('/', listRoles)

router.get('/me/blueprint', getMyBlueprint)

router.post(
  '/me/blueprint/generate',
  generateMyBlueprint
)

router.get('/:name', getRole)

export default router