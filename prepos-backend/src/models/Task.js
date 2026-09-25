import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduleEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleEvent' },
    title: { type: String, required: true },
    topicKey: { type: String },
    durationMinutes: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed', 'Partially Completed', 'Skipped'],
      default: 'Not Started',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
)

export default mongoose.model('Task', taskSchema)
