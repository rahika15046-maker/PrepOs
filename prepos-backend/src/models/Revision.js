import mongoose from 'mongoose'

const revisionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topicKey: { type: String, required: true },
    reason: { type: String }, // e.g. "Low quiz score on useEffect"
    scheduledFor: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },
    completed: { type: Boolean, default: false },
    priorityScore: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('Revision', revisionSchema)
