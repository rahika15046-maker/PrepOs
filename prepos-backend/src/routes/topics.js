import { Router } from 'express'
import { listTopics, getUserTopicProgress, updateUserTopicProgress, getSubtopicQuiz, toggleConcept, getTopicExam } from '../controllers/topicController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', listTopics)
router.get('/progress', getUserTopicProgress)
router.put('/progress', updateUserTopicProgress)
router.put('/concepts', toggleConcept)
router.post('/:key/exam', getTopicExam)
router.post('/:key/subtopics/:subtopic/quiz', getSubtopicQuiz)

export default router
