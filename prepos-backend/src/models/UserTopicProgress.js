import mongoose from 'mongoose'

const userTopicProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topicKey: { type: String, required: true },
    status: { type: String, enum: ['locked', 'upcoming', 'current', 'completed', 'weak'], default: 'locked' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    confidence: { type: Number, default: 50, min: 0, max: 100 },
    lastStudiedAt: { type: Date },
    quizScore: { type: Number },
    revisionCount: { type: Number, default: 0 },
    completedSubtopics: [{ type: String }],
    // "subtopic::concept" keys the learner ticked off while studying.
    completedConcepts: [{ type: String }],
    // Total minutes of completed study blocks (time spent, not mastery).
    studiedMinutes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

userTopicProgressSchema.index({ user: 1, topicKey: 1 }, { unique: true })

export default mongoose.model('UserTopicProgress', userTopicProgressSchema)
