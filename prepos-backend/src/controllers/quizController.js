import Quiz from '../models/Quiz.js'
import QuizAttempt from '../models/QuizAttempt.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { recordActivityAndXp } from '../services/activityHelper.js'
import { spacedRevisionPlan } from '../services/revisionEngine.js'
import { markSubtopicComplete } from '../services/topicProgressService.js'
import { calibrateSkillFromQuiz } from '../services/skillProgressService.js'
import CoreCSProgress from '../models/CoreCSProgress.js'
import Revision from '../models/Revision.js'

const SUBTOPIC_PASS_THRESHOLD = 60 // %, documented and adjustable in one place

export const getQuiz = catchAsync(async (req, res, next) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id })
  if (!quiz) return next(new AppError('Quiz not found.', 404))
  const safeQuiz = quiz.toObject()
  safeQuiz.questions = safeQuiz.questions.map(({ correctAnswer, ...q }) => q)
  res.status(200).json({ success: true, quiz: safeQuiz })
})

export const submitQuizAttempt = catchAsync(async (req, res, next) => {
  const { answers } = req.body // [{ questionId, given }]
  if (!Array.isArray(answers)) return next(new AppError('answers must be an array.', 400))
  const quiz = await Quiz.findOne({ _id: req.params.id, user: req.user._id })
  if (!quiz) return next(new AppError('Quiz not found.', 404))

  const grouped = new Map(quiz.questions.map((q) => [String(q._id), q]))
  const graded = answers.map((a) => {
    const q = grouped.get(String(a.questionId))
    const correct = q ? String(a.given).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase() : false
    return { questionId: a.questionId, given: a.given, correct }
  })

  const score = graded.length ? Math.round((graded.filter((g) => g.correct).length / graded.length) * 100) : 0
  const weakTopics = [...new Set(quiz.questions.filter((q) => !graded.find((g) => String(g.questionId) === String(q._id) && g.correct)).map((q) => q.topicKey).filter(Boolean))]

  const attempt = await QuizAttempt.create({ user: req.user._id, quiz: quiz._id, answers: graded, score, weakTopics })
  await recordActivityAndXp(req.user._id, 'quiz_taken', { quizId: quiz._id, score })

  // Reveal correct answers now that the attempt is submitted, so mistakes
  // are actually visible instead of just a pass/fail score.
  const review = quiz.questions.map((q) => {
    const given = graded.find((g) => String(g.questionId) === String(q._id))
    return { prompt: q.prompt, given: given?.given ?? '', correct: given?.correct ?? false, correctAnswer: q.correctAnswer }
  })

  // Feed weak topics back into revision scheduling automatically
  // (document-quiz path only — subtopic confirmation quizzes don't tag
  // individual questions with a topicKey, so this is a no-op for those).
  for (const topicKey of weakTopics) {
    await UserTopicProgress.findOneAndUpdate({ user: req.user._id, topicKey }, { status: 'weak', quizScore: score }, { upsert: true })
    const plan = spacedRevisionPlan(topicKey, topicKey)
    await Promise.all(
      plan.map((p) => {
        const scheduledFor = new Date()
        scheduledFor.setDate(scheduledFor.getDate() + p.offsetDays)
        return Revision.create({ user: req.user._id, topicKey, reason: `Missed on quiz "${quiz.title}"`, scheduledFor, durationMinutes: p.durationMinutes })
      })
    )
  }

  // Subtopic confirmation quiz: passing marks the "I learned this" checkbox
  // for real, via the same progress math the roadmap and Dashboard read.
  // Failing schedules a same spaced-revision cadence and tells the person
  // plainly to revise and retake — never just a dead-end score.
  let subtopicPassed = null
  if (quiz.subtopic) {
    subtopicPassed = score >= SUBTOPIC_PASS_THRESHOLD
    if (subtopicPassed) {
      await markSubtopicComplete(req.user._id, quiz.topicKey, quiz.subtopic)
    } else {
      const plan = spacedRevisionPlan(quiz.topicKey, quiz.subtopic)
      await Promise.all(
        plan.slice(0, 1).map((p) => { // just "tomorrow" for a subtopic miss — three reminders would be overkill for one checkbox
          const scheduledFor = new Date()
          scheduledFor.setDate(scheduledFor.getDate() + p.offsetDays)
          return Revision.create({
            user: req.user._id, topicKey: quiz.topicKey,
            reason: `Scored ${score}% confirming "${quiz.subtopic}" — revise and retake when ready`,
            scheduledFor, durationMinutes: p.durationMinutes,
          })
        })
      )
    }
  }

  // Whole-topic mastery exam: records the score; completion still needs every
  // subtopic verified, so an exam can raise confidence but never fake mastery.
  let topicExamResult = null
  if (quiz.topicExam && quiz.topicKey) {
    const passed = score >= 70
    const existing = await UserTopicProgress.findOne({ user: req.user._id, topicKey: quiz.topicKey })
    await UserTopicProgress.findOneAndUpdate(
      { user: req.user._id, topicKey: quiz.topicKey },
      {
        quizScore: score,
        confidence: Math.max(existing?.confidence ?? 0, score),
        lastStudiedAt: new Date(),
        ...(score < 50 && existing?.status !== 'completed' ? { status: 'weak' } : {}),
      },
      { upsert: true }
    )
    topicExamResult = { topicKey: quiz.topicKey, score, passed, passThreshold: 70 }
  }

  // Skill calibration quiz: the score — not the claimed level — becomes
  // the skill's real level and progress.
  let skillCalibration = null
  if (quiz.skillName) {
    const updated = await calibrateSkillFromQuiz(req.user._id, quiz.skillName, score)
    skillCalibration = { skillName: quiz.skillName, claimedLevel: quiz.claimedLevel, actualLevel: updated.level, score }
  }

  // Core CS "mark as learned": same principle, quiz score becomes real progress.
  let coreCsResult = null
  if (quiz.coreCsSubject) {
    const passed = score >= SUBTOPIC_PASS_THRESHOLD
    await CoreCSProgress.findOneAndUpdate(
      { user: req.user._id, subject: quiz.coreCsSubject },
      { progress: score, quizScore: score, lastRevisedAt: new Date() },
      { upsert: true }
    )
    coreCsResult = { subject: quiz.coreCsSubject, score, passed }
  }

  res.status(201).json({
    success: true,
    attempt,
    review,
    ...(quiz.subtopic && { subtopic: quiz.subtopic, topicKey: quiz.topicKey, subtopicPassed, passThreshold: SUBTOPIC_PASS_THRESHOLD }),
    ...(skillCalibration && { skillCalibration }),
    ...(coreCsResult && { coreCsResult }),
    ...(topicExamResult && { topicExamResult }),
  })
})
