import { Router } from 'express'
import { getUserSkills, updateUserSkill, getSkillQuiz } from '../controllers/skillController.js'
import { protect } from '../middleware/auth.js'

const router = Router()
router.use(protect)
router.get('/', getUserSkills)
router.put('/', updateUserSkill)
router.post('/:skillName/quiz', getSkillQuiz)

export default router
