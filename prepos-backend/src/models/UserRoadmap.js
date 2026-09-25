import mongoose from 'mongoose'

const subtopicSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    estimatedMinutes: { type: Number, default: 60 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
  },
  { _id: false }
)

const roadmapNodeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },

    category: {
      type: String,
      enum: [
        'Foundation',
        'Core Skill',
        'DSA',
        'Core CS',
        'Development',
        'Security',
        'Tools',
        'Projects',
        'Interview',
      ],
      required: true,
    },

    description: String,

    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },

    estimatedHours: {
      type: Number,
      default: 1,
    },

    prerequisites: [String],

    subtopics: [subtopicSchema],

    status: {
      type: String,
      enum: [
        'LOCKED',
        'NOT_STARTED',
        'LEARNING',
        'PRACTICING',
        'ASSESSMENT_DUE',
        'WEAK',
        'REVISION',
        'MASTERED',
      ],
      default: 'NOT_STARTED',
    },
  },
  { _id: false }
)

const userRoadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    role: {
      type: String,
      required: true,
    },

    stack: String,

    deadlineDays: Number,

    generatedBy: {
      type: String,
      default: 'gemini',
    },

    version: {
      type: Number,
      default: 1,
    },

    nodes: {
      type: [roadmapNodeSchema],
      default: [],
    },
  },
  { timestamps: true }
)

export default mongoose.model('UserRoadmap', userRoadmapSchema)