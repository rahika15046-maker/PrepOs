import mongoose from 'mongoose'

const blueprintItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    why: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    prerequisites: [
      {
        type: String,
        trim: true,
        maxlength: 200,
      },
    ],
  },
  { _id: false }
)

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    type: {
      type: String,
      enum: ['documentation', 'video', 'course', 'article', 'book', 'practice', 'other'],
      default: 'other',
    },
    // Search links are generated server-side; we never trust AI-written URLs.
    url: { type: String, trim: true },
  },
  { _id: false }
)

/*
 * Level 2 of the roadmap: a subtopic with its own level-3 "concepts".
 *
 *   Topic  ->  Subtopic (quiz-verified)  ->  Concepts (learning checklist)
 */
const subtopicDetailSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    summary: { type: String, trim: true, default: '' },
    estimatedHours: { type: Number, min: 0.25, max: 60, default: 1 },
    concepts: [{ type: String, trim: true }],
    practice: [{ type: String, trim: true }],
  },
  { _id: false }
)

const roadmapItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    stage: {
      type: String,
      required: true,
      trim: true,
    },
    stageOrder: { type: Number, default: 0 },

    /*
     * learn      – role-specific technology/skills (AI generated)
     * core-cs    – OOP, DBMS, OS, CN, System Design (curated)
     * dsa        – data structures & algorithms (curated, runs as a parallel track)
     * project    – portfolio projects
     * interview  – interview preparation
     * career     – resume, LinkedIn, job search
     */
    track: {
      type: String,
      enum: ['learn', 'core-cs', 'dsa', 'project', 'interview', 'career'],
      default: 'learn',
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },
    description: {
      type: String,
      trim: true,
    },
    prerequisites: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Plain names, kept in sync with subtopicDetails (quizzes/progress key on these).
    subtopics: [
      {
        type: String,
        trim: true,
      },
    ],
    subtopicDetails: {
      type: [subtopicDetailSchema],
      default: [],
    },
    outcomes: [{ type: String, trim: true }],
    resources: { type: [resourceSchema], default: [] },
    miniProject: { type: String, trim: true, default: '' },
    interviewFocus: [{ type: String, trim: true }],
    // DSAProblem.topic value, lets the UI deep-link to practice problems.
    catalogTopic: { type: String, trim: true },

    estimatedHours: {
      type: Number,
      min: 0.25,
      max: 1000,
    },
    importance: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    detailed: { type: Boolean, default: false },
  },
  { _id: false }
)

const roleBlueprintSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    requestedRole: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    normalizedRole: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    careerOutcome: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    technologies: {
      type: [blueprintItemSchema],
      default: [],
    },

    skills: {
      type: [blueprintItemSchema],
      default: [],
    },

    csSubjects: {
      type: [blueprintItemSchema],
      default: [],
    },

    dsa: {
      required: {
        type: Boolean,
        default: false,
      },

      importance: {
        type: Number,
        min: 1,
        max: 10,
        default: 1,
      },

      patterns: {
        type: [blueprintItemSchema],
        default: [],
      },

      difficultyRange: {
        type: [String],
        default: [],
      },
    },

    interviewAreas: {
      type: [blueprintItemSchema],
      default: [],
    },

    projectRequirements: {
      type: [blueprintItemSchema],
      default: [],
    },

    roadmap: {
      type: [roadmapItemSchema],
      default: [],
    },

    assessmentPlan: {
      skills: {
        type: [String],
        default: [],
      },

      csSubjects: {
        type: [String],
        default: [],
      },

      dsaPatterns: {
        type: [String],
        default: [],
      },
    },

    /*
     * Roadmap detail is expanded in the background after the outline is saved.
     * pending -> expanding -> ready | partial | failed
     */
    detail: {
      status: {
        type: String,
        enum: ['pending', 'expanding', 'ready', 'partial', 'failed'],
        default: 'pending',
      },
      total: { type: Number, default: 0 },
      done: { type: Number, default: 0 },
      error: { type: String, default: '' },
      updatedAt: { type: Date },
    },

    // 1 = legacy flat outline, 2 = hierarchical detailed roadmap.
    roadmapVersion: { type: Number, default: 2 },

    source: {
      type: String,
      enum: ['ai'],
      default: 'ai',
    },

    model: {
      type: String,
      trim: true,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },

    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
)

roleBlueprintSchema.index({
  user: 1,
  normalizedRole: 1,
})

export default mongoose.model('RoleBlueprint', roleBlueprintSchema)