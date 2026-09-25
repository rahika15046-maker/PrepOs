import { Router } from 'express'

import {
  uploadDocument,
  getDocument,
  listDocuments,
  explainAtLevel,
  askDocument,
  deleteDocument,
  getDocumentQuiz,
} from '../controllers/documentController.js'

import { protect } from '../middleware/auth.js'
import  upload  from '../middleware/upload.js'

const router = Router()

router.use(protect)

router.get('/', listDocuments)

router.post(
  '/upload',
  upload.single('file'),
  uploadDocument
)

router.get(
  '/:id',
  getDocument
)

router.get(
  '/:id/quiz',
  getDocumentQuiz
)

router.post(
  '/:id/explain',
  explainAtLevel
)

router.post(
  '/:id/ask',
  askDocument
)

router.delete(
  '/:id',
  deleteDocument
)

export default router