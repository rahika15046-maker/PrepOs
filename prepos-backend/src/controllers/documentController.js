import fs from 'fs/promises'

import StudyDocument from '../models/StudyDocument.js'
import DocumentChunk from '../models/DocumentChunk.js'
import Quiz from '../models/Quiz.js'

import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'

import {
  extractText,
  cleanExtractedText,
  chunkText,
} from '../services/documentProcessor.js'

import {
  generateCleanNotes,
  generatePointwiseSummary,
  generateExplanation,
  generateFlashcards,
  generateQuiz,
  generateConceptMap,
  generateInterviewQuestions,
  answerFromDocument,
} from '../services/aiService.js'

export const uploadDocument = catchAsync(
  async (req, res, next) => {
    if (!req.file) {
      return next(
        new AppError('No file uploaded.', 400)
      )
    }

    const document = await StudyDocument.create({
      user: req.user._id,
      originalName: req.file.originalname,
      storedPath: req.file.path,
      mimeType: req.file.mimetype,
      status: 'uploaded',
    })

    try {
      await processDocument(document._id)

      const readyDocument =
        await StudyDocument.findOne({
          _id: document._id,
          user: req.user._id,
        })

      return res.status(201).json({
        success: true,
        document: readyDocument,
      })
    } catch (error) {
      await fs
        .unlink(req.file.path)
        .catch(() => {})

      return next(error)
    }
  }
)

async function processDocument(documentId) {
  const document =
    await StudyDocument.findById(documentId)

  if (!document) {
    throw new Error('Study document no longer exists.')
  }

  try {
    document.status = 'reading'
    document.error = undefined
    await document.save()

    const rawText = await extractText(
      document.storedPath,
      document.mimeType
    )

    const cleanText =
      cleanExtractedText(rawText)

    if (!cleanText) {
      throw new Error(
        'No readable text was extracted from this document.'
      )
    }

    document.status = 'extracting'
    document.rawText = cleanText

    await document.save()

    document.status = 'understanding'
    await document.save()

    const [
      cleanNotes,
      pointwiseSummary,
      flashcards,
      quizQuestions,
      conceptMap,
      interviewQuestions,
    ] = await Promise.all([
      generateCleanNotes(cleanText),
      generatePointwiseSummary(cleanText),
      generateFlashcards(cleanText),
      generateQuiz(cleanText),
      generateConceptMap(cleanText),
      generateInterviewQuestions(cleanText),
    ])

    const chunks = chunkText(cleanText)

    if (!chunks.length) {
      throw new Error(
        'Document extraction produced no usable chunks.'
      )
    }

    await DocumentChunk.deleteMany({
      document: document._id,
    })

    await Quiz.deleteMany({
      sourceDocument: document._id,
      user: document.user,
    })

    await DocumentChunk.insertMany(
      chunks.map((text, index) => ({
        document: document._id,
        index,
        text,
      }))
    )

    document.cleanNotes = cleanNotes
    document.pointwiseSummary =
      pointwiseSummary

    document.flashcards = flashcards
    document.conceptMap = conceptMap

    document.interviewQuestions =
      interviewQuestions

    document.keyConcepts =
      (pointwiseSummary.concepts || [])
        .map((concept) => ({
          title: String(concept).slice(0, 80),
          description: String(concept),
        }))

    document.status = 'ready'
    document.error = undefined

    await document.save()

    await Quiz.create({
      user: document.user,
      sourceDocument: document._id,
      title: `Quiz: ${document.originalName}`,
      questions: quizQuestions,
    })

    return document
  } catch (error) {
    document.status = 'failed'
    document.error =
      error?.message ||
      'Document processing failed.'

    await document.save()

    throw error
  }
}

export const getDocument = catchAsync(
  async (req, res, next) => {
    const document =
      await StudyDocument.findOne({
        _id: req.params.id,
        user: req.user._id,
      })

    if (!document) {
      return next(
        new AppError('Document not found.', 404)
      )
    }

    res.status(200).json({
      success: true,
      document,
    })
  }
)

export const listDocuments = catchAsync(
  async (req, res) => {
    const documents =
      await StudyDocument.find({
        user: req.user._id,
      })
        .sort('-createdAt')
        .select('-rawText')

    res.status(200).json({
      success: true,
      documents,
    })
  }
)

export const getDocumentQuiz = catchAsync(
  async (req, res, next) => {
    const document =
      await StudyDocument.findOne({
        _id: req.params.id,
        user: req.user._id,
      })

    if (!document) {
      return next(
        new AppError('Document not found.', 404)
      )
    }

    const quiz =
      await Quiz.findOne({
        sourceDocument: document._id,
        user: req.user._id,
      })

    if (!quiz) {
      return next(
        new AppError(
          'No quiz is available for this document.',
          404
        )
      )
    }

    res.status(200).json({
      success: true,
      quiz,
    })
  }
)

export const explainAtLevel = catchAsync(
  async (req, res, next) => {
    const allowedLevels = [
      'beginner',
      'intermediate',
      'interview',
      'deep',
    ]

    const level = String(
      req.body?.level || ''
    ).toLowerCase()

    if (!allowedLevels.includes(level)) {
      return next(
        new AppError(
          'Invalid explanation level.',
          400
        )
      )
    }

    const document =
      await StudyDocument.findOne({
        _id: req.params.id,
        user: req.user._id,
      })

    if (!document) {
      return next(
        new AppError('Document not found.', 404)
      )
    }

    if (
      document.status !== 'ready' ||
      !document.rawText
    ) {
      return next(
        new AppError(
          'Document is not ready for explanation.',
          400
        )
      )
    }

    const explanation =
      await generateExplanation(
        document.rawText,
        level
      )

    document.explanations = {
      ...(document.explanations || {}),
      [level]: explanation,
    }

    await document.save()

    res.status(200).json({
      success: true,
      explanation,
    })
  }
)

export const askDocument = catchAsync(
  async (req, res, next) => {
    const question = String(
      req.body?.question || ''
    ).trim()

    if (!question) {
      return next(
        new AppError(
          'Question is required.',
          400
        )
      )
    }

    const document =
      await StudyDocument.findOne({
        _id: req.params.id,
        user: req.user._id,
      })

    if (!document) {
      return next(
        new AppError('Document not found.', 404)
      )
    }

    if (document.status !== 'ready') {
      return next(
        new AppError(
          'Document is not ready yet.',
          400
        )
      )
    }

    const chunks =
      await DocumentChunk.find({
        document: document._id,
      }).sort('index')

    if (!chunks.length) {
      return next(
        new AppError(
          'No processed document chunks are available.',
          400
        )
      )
    }

    const answer =
      await answerFromDocument(
        chunks,
        question
      )

    res.status(200).json({
      success: true,
      answer,
    })
  }
)

export const deleteDocument = catchAsync(
  async (req, res, next) => {
    const document =
      await StudyDocument.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      })

    if (!document) {
      return next(
        new AppError(
          'Document not found.',
          404
        )
      )
    }

    await DocumentChunk.deleteMany({
      document: document._id,
    })

    await Quiz.deleteMany({
      sourceDocument: document._id,
      user: req.user._id,
    })

    await fs
      .unlink(document.storedPath)
      .catch(() => {})

    res.status(200).json({
      success: true,
      message: 'Document removed.',
    })
  }
)