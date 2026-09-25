import mongoose from 'mongoose'

const quizQuestionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq', 'true_false', 'short_answer'], required: true },
    prompt: { type: String, required: true },
    options: [String],
    correctAnswer: { type: String, required: true },
    topicKey: { type: String },
  },
  { _id: true }
)

const quizSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sourceDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyDocument' },
    topicKey: { type: String },
    subtopic: { type: String }, // set only for roadmap subtopic-confirmation quizzes
    topicExam: { type: Boolean, default: false }, // whole-topic mastery exam
    skillName: { type: String }, // set only for skill self-assessment calibration quizzes
    claimedLevel: { type: String }, // the level the user claimed, for skill calibration quizzes
    coreCsSubject: { type: String }, // set only for Core CS "mark as learned" calibration quizzes
    title: { type: String, required: true },
    questions: [quizQuestionSchema],
  },
  { timestamps: true }
)

export default mongoose.model('Quiz', quizSchema)
