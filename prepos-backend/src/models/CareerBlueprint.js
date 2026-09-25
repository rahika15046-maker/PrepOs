import mongoose from 'mongoose'

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      default: '',
      trim: true,
    },

    type: {
      type: String,
      enum: ['documentation', 'course', 'article', 'video', 'book', 'other'],
      default: 'other',
    },
  },
  { _id: false }
)

const topicSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },

    importance: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },

    estimatedHours: {
      type: Number,
      min: 0.25,
      max: 500,
      default: 4,
    },

    prerequisites: {
      type: [String],
      default: [],
    },

    interviewRelevant: {
      type: Boolean,
      default: true,
    },

    projectRelevant: {
      type: Boolean,
      default: false,
    },

    assessmentRequired: {
      type: Boolean,
      default: true,
    },

    subtopics: {
      type: [String],
      default: [],
    },

    resources: {
      type: [resourceSchema],
      default: [],
    },
  },
  { _id: false }
)

const subjectSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    topics: {
      type: [topicSchema],
      default: [],
    },
  },
  { _id: false }
)

const domainSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },

    subjects: {
      type: [subjectSchema],
      default: [],
    },
  },
  { _id: false }
)

const careerBlueprintSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    targetRole: {
      type: String,
      required: true,
      trim: true,
    },

    roleSummary: {
      type: String,
      required: true,
    },

    careerOutcome: {
      type: String,
      default: '',
    },

    domains: {
      type: [domainSchema],
      default: [],
    },

    /*
     * Flattened roadmap.
     *
     * This is what the scheduler/roadmap UI can consume
     * without repeatedly traversing the hierarchy.
     */
    roadmap: {
      type: [topicSchema],
      default: [],
    },

    technologies: {
      type: [String],
      default: [],
    },

    tools: {
      type: [String],
      default: [],
    },

    commonFoundations: {
      type: [String],
      default: [],
    },

    dsaRequired: {
      type: Boolean,
      default: false,
    },

    dsaPriority: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'medium',
    },

    projectRequirements: {
      type: [String],
      default: [],
    },

    interviewAreas: {
      type: [String],
      default: [],
    },

    /*
     * Store which AI/provider generated this blueprint.
     * This makes debugging much easier.
     */
    aiProvider: {
      type: String,
      required: true,
    },

    model: {
      type: String,
      default: '',
    },

    version: {
      type: Number,
      default: 1,
    },

    status: {
      type: String,
      enum: ['generated', 'needs_regeneration', 'failed'],
      default: 'generated',
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('CareerBlueprint', careerBlueprintSchema)