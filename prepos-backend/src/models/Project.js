import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    techStack: [{ type: String }],
    githubUrl: { type: String },
    liveUrl: { type: String },
    features: [{ type: String }],
    status: { type: String, enum: ['Idea', 'In Progress', 'Completed'], default: 'Idea' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
)

export default mongoose.model('Project', projectSchema)
