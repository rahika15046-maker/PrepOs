import UserSkill from '../models/UserSkill.js'
import Quiz from '../models/Quiz.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { generateSkillCalibrationQuiz } from '../services/aiService.js'

export const getUserSkills = catchAsync(async (req, res) => {
  const skills = await UserSkill.find({ user: req.user._id })
  res.status(200).json({ success: true, skills })
})

/**
 * "Never Learned" is set directly — there's nothing to verify. Any other
 * level should go through getSkillQuiz below instead; this endpoint stays
 * for that zero-claim case and for direct progress nudges elsewhere.
 */
export const updateUserSkill = catchAsync(async (req, res) => {
  const { skillName, level, progress } = req.body
  const skill = await UserSkill.findOneAndUpdate(
    { user: req.user._id, skillName },
    { ...(level && { level }), ...(progress !== undefined && { progress }) },
    { upsert: true, new: true }
  )
  res.status(200).json({ success: true, skill })
})

/**
 * Generates a calibration quiz for a claimed skill level. Passing/failing
 * it (via /api/quizzes/:id/attempt) is what actually sets the skill's real
 * level and progress — see skillProgressService.calibrateSkillFromQuiz.
 */
export const getSkillQuiz = catchAsync(async (req, res, next) => {
  const { skillName } = req.params
  const { level } = req.body
  if (!level || level === 'Never Learned') {
    return next(new AppError('Only Beginner, Intermediate, or Strong claims need a calibration quiz.', 400))
  }

  const questions = await generateSkillCalibrationQuiz(skillName, level, 5)
  const quiz = await Quiz.create({
    user: req.user._id,
    skillName,
    claimedLevel: level,
    title: `${skillName} — ${level} calibration`,
    questions,
  })

  const safeQuiz = quiz.toObject()
  safeQuiz.questions = safeQuiz.questions.map(({ correctAnswer, ...q }) => q)
  res.status(201).json({ success: true, quiz: safeQuiz })
})
