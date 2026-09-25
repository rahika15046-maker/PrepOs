import mongoose from 'mongoose'

const quizAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, given: String, correct: Boolean }],
    score: { type: Number, required: true }, // percentage
    weakTopics: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.model('QuizAttempt', quizAttemptSchema)
