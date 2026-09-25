import mongoose from 'mongoose'

/*
 * Weekly goals only — there are deliberately no monthly goals.
 * Weeks run Monday → Sunday; week 1 may be a partial week.
 */
const weeklyGoalSchema = new mongoose.Schema(
  {
    week: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    targetMinutes: { type: Number, default: 0 },
    focus: [{ key: String, title: String, minutes: Number }],
    headline: { type: String, default: '' },
  },
  { _id: false }
)

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    stack: { type: String, required: false, default: null },

    deadlineDays: { type: Number, required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    requiredHours: { type: Number, default: 0 },
    availableHours: { type: Number, default: 0 },
    feasibility: {
      type: String,
      enum: ['comfortable', 'tight', 'unrealistic'],
      default: 'tight',
    },

    /* Filled by the planner on every (re)build. */
    projectedCompletionDate: { type: Date },
    learningEndDate: { type: Date },
    overflowDays: { type: Number, default: 0 },
    plannedMinutes: { type: Number, default: 0 },
    weeklyGoals: { type: [weeklyGoalSchema], default: [] },
    lastPlannedAt: { type: Date },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

goalSchema.index({ user: 1, active: 1 })

export default mongoose.model('Goal', goalSchema)
