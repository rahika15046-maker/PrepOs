import mongoose from 'mongoose'

const topicSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    stage: { type: String, required: true }, // e.g. "Foundation", "Frontend", "React"...
    description: { type: String },
    resources: [{ title: String, url: String }],
    subtopics: [{ type: String }],
    order: { type: Number, default: 0 },
    prerequisites: [{ type: String }], // topic keys
    importance: { type: Number, default: 5, min: 1, max: 10 },
    estimatedHours: { type: Number, default: 4 },
    appliesToRoles: [{ type: String }], // role names, empty = all
  },
  { timestamps: true }
)

export default mongoose.model('Topic', topicSchema)
