import { Router } from 'express'

import {
  getLinkedInActivity,
  updateLinkedInActivity,
  draftLinkedInPost,
  startLinkedInOAuth,
  linkedInOAuthCallback,
} from '../controllers/linkedinController.js'

import { protect } from '../middleware/auth.js'

const router = Router()

router.get(
  '/oauth/callback',
  linkedInOAuthCallback
)

router.use(protect)

router.get(
  '/',
  getLinkedInActivity
)

router.patch(
  '/',
  updateLinkedInActivity
)

router.post(
  '/draft',
  draftLinkedInPost
)

router.get(
  '/oauth/start',
  startLinkedInOAuth
)

export default router