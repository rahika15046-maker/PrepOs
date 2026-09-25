import InterviewSession from '../models/InterviewSession.js'
import InterviewQuestion from '../models/InterviewQuestion.js'
import UserProfile from '../models/UserProfile.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import Project from '../models/Project.js'

import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { getUserBlueprint } from '../services/careerBlueprintService.js'
import { recordActivityAndXp } from '../services/activityHelper.js'
import {
  CATEGORIES,
  DIFFICULTIES,
  generateInterviewSet,
  evaluateAnswer,
  summarizeSession,
} from '../services/interviewAIService.js'

/** Shape the frontend consumes: flat questions with prompt + answer + evaluation. */
function serialize(session, questionDocs) {
  const byId = new Map(questionDocs.map((q) => [String(q._id), q]))

  return {
    id: String(session._id),
    role: session.role,
    status: session.status,
    difficulty: session.difficulty,
    categories: session.categories,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    overallScore: session.overallScore ?? null,
    report: session.report
      ? { ...(session.report.toObject?.() || session.report), categoryScores: Object.fromEntries(session.report.categoryScores || []) }
      : null,
    questions: session.questions.map((item) => {
      const q = byId.get(String(item.question))
      return {
        question: String(item.question),
        prompt: q?.question || '(question unavailable)',
        category: q?.category || 'Technical',
        difficulty: q?.difficulty || 'Intermediate',
        expectedAreas: q?.expectedAreas || [],
        answer: item.answer || '',
        score: item.score ?? null,
        feedback: item.feedback || '',
        strengths: item.strengths || [],
        improvements: item.improvements || [],
        idealAnswer: item.idealAnswer || '',
        evaluated: item.score !== undefined && item.score !== null,
      }
    }),
  }
}

async function load(userId, id) {
  const session = await InterviewSession.findOne({ _id: id, user: userId })
  if (!session) throw new AppError('Interview session not found.', 404)
  const questions = await InterviewQuestion.find({ _id: { $in: session.questions.map((q) => q.question) } })
  return { session, questions }
}

/* ---------------------------------------------------------------- create */

export const createInterview = catchAsync(async (req, res) => {
  const profile = await UserProfile.findOne({ user: req.user._id }).lean()
  if (!profile?.role) throw new AppError('Complete onboarding first so we know your target role.', 400)

  const blueprint = await getUserBlueprint(req.user._id)

  const categories = (Array.isArray(req.body?.categories) ? req.body.categories : [])
    .filter((c) => CATEGORIES.includes(c))
  const chosen = categories.length ? categories : ['Technical', 'CS Fundamentals', 'Behavioral']

  const difficulty = DIFFICULTIES.includes(req.body?.difficulty) ? req.body.difficulty : 'Intermediate'
  const count = Math.min(12, Math.max(3, Number(req.body?.count) || 6))

  const [weak, projects] = await Promise.all([
    UserTopicProgress.find({ user: req.user._id, status: 'weak' }).limit(5).lean(),
    chosen.includes('Project') ? Project.find({ user: req.user._id }).limit(3).lean() : [],
  ])

  const generated = await generateInterviewSet({
    role: profile.role,
    categories: chosen,
    difficulty,
    count,
    blueprint,
    weakTopics: weak.map((w) => w.topicKey),
    projects: projects.map((p) => `${p.name} (${(p.techStack || []).join(', ')})`),
  })

  const docs = await InterviewQuestion.insertMany(
    generated.map((q) => ({ ...q, role: profile.role }))
  )

  const session = await InterviewSession.create({
    user: req.user._id,
    role: profile.role,
    categories: chosen,
    difficulty,
    questions: docs.map((d) => ({ question: d._id })),
    status: 'in_progress',
    startedAt: new Date(),
  })

  res.status(201).json({ success: true, session: serialize(session, docs) })
})

/* ------------------------------------------------------------- read/list */

export const listInterviews = catchAsync(async (req, res) => {
  const sessions = await InterviewSession.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  res.status(200).json({
    success: true,
    sessions: sessions.map((s) => ({
      id: String(s._id),
      role: s.role,
      status: s.status,
      difficulty: s.difficulty,
      categories: s.categories,
      overallScore: s.overallScore ?? null,
      questionCount: s.questions.length,
      answered: s.questions.filter((q) => q.answer).length,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    })),
  })
})

export const getInterview = catchAsync(async (req, res) => {
  const { session, questions } = await load(req.user._id, req.params.id)
  res.status(200).json({ success: true, session: serialize(session, questions) })
})

/* ---------------------------------------------------------------- answer */

export const answerInterviewQuestion = catchAsync(async (req, res) => {
  const { questionId, answer, evaluate = true } = req.body
  const { session, questions } = await load(req.user._id, req.params.id)

  if (session.status === 'completed') throw new AppError('This interview is already completed.', 409)

  const item = session.questions.find((q) => String(q.question) === String(questionId))
  if (!item) throw new AppError('Question does not belong to this interview.', 404)

  const text = String(answer ?? '').trim()
  if (text.length > 6000) throw new AppError('Answer is too long (max 6000 characters).', 400)

  const changed = text !== (item.answer || '')
  item.answer = text
  item.answeredAt = new Date()

  // A changed answer invalidates the previous evaluation.
  if (changed) {
    item.score = undefined
    item.feedback = undefined
    item.strengths = []
    item.improvements = []
    item.idealAnswer = undefined
  }

  let warning = null

  if (evaluate && text.length >= 15 && (changed || item.score === undefined)) {
    const question = questions.find((q) => String(q._id) === String(questionId))
    try {
      const result = await evaluateAnswer({ role: session.role, question, answer: text })
      Object.assign(item, result)
    } catch (error) {
      warning = `Your answer was saved, but AI feedback is unavailable right now: ${error.message}`
    }
  } else if (evaluate && text.length < 15) {
    warning = 'Write a little more so it can be evaluated (at least a sentence).'
  }

  await session.save()

  const view = serialize(session, questions).questions.find((q) => q.question === String(questionId))
  res.status(200).json({ success: true, question: view, warning })
})

/* -------------------------------------------------------------- complete */

export const completeInterview = catchAsync(async (req, res) => {
  const { session, questions } = await load(req.user._id, req.params.id)

  if (session.status === 'completed') {
    return res.status(200).json({ success: true, session: serialize(session, questions) })
  }

  const view = serialize(session, questions)
  const scored = view.questions.filter((q) => q.evaluated)

  if (!scored.length) {
    throw new AppError('Answer at least one question and get feedback before finishing.', 400)
  }

  // Unanswered questions count as zero: skipping should not inflate the score.
  const overall = Math.round(
    view.questions.reduce((sum, q) => sum + (q.evaluated ? q.score : 0), 0) / view.questions.length
  )

  const byCategory = {}
  scored.forEach((q) => {
    ;(byCategory[q.category] ||= []).push(q.score)
  })
  const categoryScores = Object.fromEntries(
    Object.entries(byCategory).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)])
  )

  let report = { summary: '', strengths: [], weakAreas: [], nextSteps: [] }
  try {
    report = await summarizeSession({
      role: session.role,
      overallScore: overall,
      items: scored.map((q) => ({ category: q.category, question: q.prompt, score: q.score, improvements: q.improvements })),
    })
  } catch {
    // The score is real; only the narrative failed. Fall back to score-derived weak areas.
    report.weakAreas = Object.entries(categoryScores).filter(([, v]) => v < 60).map(([k]) => k)
  }

  session.status = 'completed'
  session.completedAt = new Date()
  session.overallScore = overall
  session.report = { ...report, categoryScores }
  await session.save()

  await recordActivityAndXp(req.user._id, 'interview_completed', { interviewId: session._id, score: overall })

  res.status(200).json({ success: true, session: serialize(session, questions) })
})
