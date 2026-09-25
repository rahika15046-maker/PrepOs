import mongoose from 'mongoose'

const jobApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String },
    applicationDate: { type: Date },
    deadline: { type: Date },
    link: { type: String },
    notes: { type: String },
    followUpDate: { type: Date },
    stage: {
      type: String,
      enum: ['Saved', 'Preparing', 'Applied', 'Online Assessment', 'Interview', 'Rejected', 'Offer'],
      default: 'Saved',
    },
  },
  { timestamps: true }
)

export default mongoose.model('JobApplication', jobApplicationSchema)
