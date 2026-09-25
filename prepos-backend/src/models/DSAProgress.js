import mongoose from 'mongoose'

const dsaProgressSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DSAProblem',
        required: true,
      },

      solved: {
        type: Boolean,
        default: false,
      },

      /*
       * Where did the solved state come from?
       */
      source: {
        type: String,
        enum: [
          'manual',
          'leetcode',
        ],
        default: 'manual',
      },

      timeSpentMinutes: {
        type: Number,
        default: 0,
        min: 0,
      },

      confidence: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
      },

      attempts: {
        type: Number,
        default: 0,
        min: 0,
      },

      solvedAt: {
        type: Date,
      },

      lastAttemptedAt: {
        type: Date,
      },
    },

    {
      timestamps: true,
    }
  )

dsaProgressSchema.index(
  {
    user: 1,
    problem: 1,
  },
  {
    unique: true,
  }
)

export default mongoose.model(
  'DSAProgress',
  dsaProgressSchema
)