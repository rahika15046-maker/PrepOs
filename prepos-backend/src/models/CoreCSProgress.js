import mongoose from 'mongoose'

const coreCsProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, enum: ['OOP', 'DBMS', 'Operating Systems', 'Computer Networks'], required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    quizScore: { type: Number },
    confidence: { type: Number, default: 50, min: 0, max: 100 },
    lastRevisedAt: { type: Date },
  },
  { timestamps: true }
)

coreCsProgressSchema.index({ user: 1, subject: 1 }, { unique: true })

export default mongoose.model('CoreCSProgress', coreCsProgressSchema)
