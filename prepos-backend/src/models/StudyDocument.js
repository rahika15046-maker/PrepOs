import mongoose from 'mongoose'

const studyDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storedPath: { type: String, required: true },
    mimeType: { type: String, required: true },
    status: {
      type: String,
      enum: ['uploaded', 'reading', 'extracting', 'understanding', 'ready', 'failed'],
      default: 'uploaded',
    },
    rawText: { type: String },
    cleanNotes: { type: String }, // structured markdown
    pointwiseSummary: {
      concepts: [String],
      definitions: [String],
      keyPoints: [String],
      syntax: [String],
      commonMistakes: [String],
      interviewPoints: [String],
    },
    explanations: {
      beginner: String,
      intermediate: String,
      interview: String,
      deep: String,
    },
    keyConcepts: [{ title: String, description: String }],
    flashcards: [{ question: String, answer: String }],
    conceptMap: {
      nodes: [{ id: String, label: String }],
      edges: [{ source: String, target: String, label: String }],
    },
    interviewQuestions: {
      beginner: [String],
      intermediate: [String],
      advanced: [String],
    },
    error: { type: String },
  },
  { timestamps: true }
)

export default mongoose.model('StudyDocument', studyDocumentSchema)
