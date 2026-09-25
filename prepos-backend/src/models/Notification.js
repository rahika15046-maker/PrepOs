import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['task_reminder', 'revision_due', 'dsa_reminder', 'streak_warning', 'deadline_reminder', 'system'],
      default: 'system',
    },
    title: { type: String, required: true },
    body: { type: String },
    read: { type: Boolean, default: false },
    scheduledFor: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.model('Notification', notificationSchema)
