import CoreCSProgress from '../models/CoreCSProgress.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import RoleBlueprint from '../models/RoleBlueprint.js'
import Quiz from '../models/Quiz.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { generateCoreCsQuiz } from '../services/aiService.js'
import { getUserBlueprint, getBlueprintTopics } from '../services/careerBlueprintService.js'
import { composeRoadmap, expandBlueprintDetails } from '../services/roleIntelligenceService.js'
import { buildNodes } from './roadmapController.js'

const SUBJECTS = ['OOP', 'DBMS', 'Operating Systems', 'Computer Networks']

/** Core CS is now a full roadmap track: topic -> subtopics -> concepts -> quizzes. */
export const getCoreCsProgress = catchAsync(async (req, res) => {
  const blueprint = await getUserBlueprint(req.user._id)
  const topics = getBlueprintTopics(blueprint).filter((t) => t.track === 'core-cs')
  const progress = await UserTopicProgress.find({ user: req.user._id }).lean()

  const nodes = buildNodes(topics, progress)

  res.status(200).json({
    success: true,
    enabled: nodes.length > 0,
    nodes,
    // Legacy 4-subject shape kept for older clients.
    subjects: SUBJECTS.map((s) => ({ subject: s, progress: 0, confidence: 50 })),
  })
})

/** Adds the curated Core-CS track to a blueprint that lacks it. */
export const enableCoreCsTrack = catchAsync(async (req, res) => {
  const blueprint = await getUserBlueprint(req.user._id)

  if (!blueprint.roadmap.some((t) => t.track === 'core-cs')) {
    const roadmap = composeRoadmap(blueprint.roadmap, {
      role: blueprint.normalizedRole,
      csSubjects: [],
      dsaRequired: blueprint.dsa?.required,
      dsaImportance: blueprint.dsa?.importance,
    })
    await RoleBlueprint.updateOne({ _id: blueprint._id }, { $set: { roadmap } })
    expandBlueprintDetails(req.user._id).catch(() => {})
  }

  res.status(200).json({ success: true })
})

export const updateCoreCsProgress = catchAsync(async (req, res) => {
  const { subject, progress, quizScore, confidence } = req.body
  if (!SUBJECTS.includes(subject)) return res.status(400).json({ success: false, message: 'Unknown subject.' })

  const record = await CoreCSProgress.findOneAndUpdate(
    { user: req.user._id, subject },
    {
      ...(progress !== undefined && { progress }),
      ...(quizScore !== undefined && { quizScore }),
      ...(confidence !== undefined && { confidence }),
      lastRevisedAt: new Date(),
    },
    { upsert: true, new: true }
  )
  res.status(200).json({ success: true, subject: record })
})

export const getCoreCsQuiz = catchAsync(async (req, res, next) => {
  const { subject } = req.params
  if (!SUBJECTS.includes(subject)) return next(new AppError('Unknown subject.', 400))

  const questions = await generateCoreCsQuiz(subject, 5)
  const quiz = await Quiz.create({
    user: req.user._id,
    coreCsSubject: subject,
    title: `${subject} — confirmation quiz`,
    questions,
  })

  const safeQuiz = quiz.toObject()
  safeQuiz.questions = safeQuiz.questions.map(({ correctAnswer, ...q }) => q)
  res.status(201).json({ success: true, quiz: safeQuiz })
})
