import mongoose from 'mongoose'

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // e.g. "task_completed", "quiz_taken", "problem_solved"
    meta: { type: mongoose.Schema.Types.Mixed },
    xpEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('Activity', activitySchema)
