import UserTopicProgress from '../models/UserTopicProgress.js'
import Quiz from '../models/Quiz.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import {
  generateSubtopicQuiz,
  generateTopicExamQuiz,
} from '../services/aiService.js'
import {
  prerequisitesMet,
} from '../services/topicProgressService.js'
import {
  getUserBlueprint,
  getBlueprintTopics,
} from '../services/careerBlueprintService.js'

export const listTopics = catchAsync(
  async (req, res) => {
    const blueprint =
      await getUserBlueprint(req.user._id)

    res.status(200).json({
      success: true,
      topics:
        getBlueprintTopics(blueprint),
    })
  }
)

export const getUserTopicProgress =
  catchAsync(async (req, res) => {
    const progress =
      await UserTopicProgress.find({
        user: req.user._id,
      })

    res.status(200).json({
      success: true,
      progress,
    })
  })

export const updateUserTopicProgress =
  catchAsync(async (req, res, next) => {
    const {
      topicKey,
      progress,
      confidence,
    } = req.body

    if (!topicKey) {
      return next(
        new AppError(
          'topicKey is required.',
          400
        )
      )
    }

    const blueprint =
      await getUserBlueprint(req.user._id)

    const topic =
      getBlueprintTopics(
        blueprint
      ).find(
        (item) => item.key === topicKey
      )

    if (!topic) {
      return next(
        new AppError(
          'Topic does not exist in your AI roadmap.',
          404
        )
      )
    }

    if (
      progress !== undefined &&
      (
        !Number.isFinite(Number(progress)) ||
        Number(progress) < 0 ||
        Number(progress) > 100
      )
    ) {
      return next(
        new AppError(
          'Progress must be between 0 and 100.',
          400
        )
      )
    }

    if (
      confidence !== undefined &&
      (
        !Number.isFinite(Number(confidence)) ||
        Number(confidence) < 0 ||
        Number(confidence) > 100
      )
    ) {
      return next(
        new AppError(
          'Confidence must be between 0 and 100.',
          400
        )
      )
    }

    const existing =
      await UserTopicProgress.findOne({
        user: req.user._id,
        topicKey,
      })

    const update = {}

    if (progress !== undefined) {
      update.progress =
        Number(progress)

      // Mastery ('completed') is only ever granted by verified subtopic quizzes.
      update.status = 'current'
    }

    if (confidence !== undefined) {
      update.confidence =
        Number(confidence)
    }

    update.lastStudiedAt =
      new Date()

    const record =
      await UserTopicProgress.findOneAndUpdate(
        {
          user: req.user._id,
          topicKey,
        },
        update,
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      )

    res.status(200).json({
      success: true,
      progress: record,
    })
  })

export const getSubtopicQuiz =
  catchAsync(async (req, res, next) => {
    const {
      key,
      subtopic,
    } = req.params

    const decodedSubtopic =
      decodeURIComponent(subtopic)

    const blueprint =
      await getUserBlueprint(
        req.user._id
      )

    const topic =
      getBlueprintTopics(
        blueprint
      ).find(
        (item) => item.key === key
      )

    if (!topic) {
      return next(
        new AppError(
          'Topic not found.',
          404
        )
      )
    }

    if (
      !topic.subtopics.includes(
        decodedSubtopic
      )
    ) {
      return next(
        new AppError(
          'Subtopic does not belong to this topic.',
          400
        )
      )
    }

    const allowed =
      await prerequisitesMet(
        req.user._id,
        topic
      )

    if (!allowed) {
      return next(
        new AppError(
          'Complete prerequisite topics first.',
          400
        )
      )
    }

    const detail =
      (topic.subtopicDetails || []).find(
        (item) => item.name === decodedSubtopic
      )

    const questions =
      await generateSubtopicQuiz(
        topic.title,
        decodedSubtopic,
        5,
        detail?.concepts || []
      )

    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return next(
        new AppError(
          'AI could not generate a valid assessment. Please retry.',
          503
        )
      )
    }

    const quiz =
      await Quiz.create({
        user: req.user._id,
        topicKey: key,
        subtopic: decodedSubtopic,
        title:
          `${decodedSubtopic} — confirmation quiz`,
        questions,
      })

    const safeQuiz =
      quiz.toObject()

    safeQuiz.questions =
      safeQuiz.questions.map(
        ({
          correctAnswer,
          ...question
        }) => question
      )

    res.status(201).json({
      success: true,
      quiz: safeQuiz,
    })
  })

/* -------------------------------------------------------------------------- */
/* Concept checklist                                                          */
/* -------------------------------------------------------------------------- */

export const toggleConcept =
  catchAsync(async (req, res, next) => {
    const { topicKey, subtopic, concept, done } = req.body

    const blueprint = await getUserBlueprint(req.user._id)
    const topic = getBlueprintTopics(blueprint).find((t) => t.key === topicKey)
    const detail = topic?.subtopicDetails?.find((s) => s.name === subtopic)

    if (!detail || !detail.concepts.includes(concept)) {
      return next(new AppError('Concept not found in this subtopic.', 404))
    }

    const id = `${subtopic}::${concept}`

    const record = await UserTopicProgress.findOneAndUpdate(
      { user: req.user._id, topicKey },
      done === false
        ? { $pull: { completedConcepts: id } }
        : { $addToSet: { completedConcepts: id }, $set: { lastStudiedAt: new Date() } },
      { upsert: true, new: true }
    )

    res.status(200).json({ success: true, completedConcepts: record.completedConcepts })
  })

/* -------------------------------------------------------------------------- */
/* Topic mastery exam                                                         */
/* -------------------------------------------------------------------------- */

export const getTopicExam =
  catchAsync(async (req, res, next) => {
    const { key } = req.params

    const blueprint = await getUserBlueprint(req.user._id)
    const topic = getBlueprintTopics(blueprint).find((t) => t.key === key)

    if (!topic) return next(new AppError('Topic not found.', 404))

    if (!(await prerequisitesMet(req.user._id, topic))) {
      return next(new AppError('Complete prerequisite topics first.', 400))
    }

    const questions = await generateTopicExamQuiz(topic.title, topic.subtopics, 8)

    const quiz = await Quiz.create({
      user: req.user._id,
      topicKey: key,
      topicExam: true,
      title: `${topic.title} — mastery exam`,
      questions,
    })

    const safe = quiz.toObject()
    safe.questions = safe.questions.map(({ correctAnswer, ...q }) => q)

    res.status(201).json({ success: true, quiz: safe })
  })
