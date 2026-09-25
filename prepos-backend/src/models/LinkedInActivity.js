import mongoose from 'mongoose'

const linkedinActivitySchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
      },

      connected: {
        type: Boolean,
        default: false,
      },

      linkedinName: {
        type: String,
        trim: true,
      },

      linkedinSub: {
        type: String,
        trim: true,
        index: true,
      },

      lastPostDate: Date,

      postsThisMonth: {
        type: Number,
        default: 0,
        min: 0,
      },

      autoDraftEnabled: {
        type: Boolean,
        default: true,
      },

      milestones: [
        {
          title: String,
          description: String,
          date: Date,
          source: {
            type: String,
            enum: [
              'verified_progress',
              'manual',
            ],
            default: 'verified_progress',
          },
        },
      ],

      draftIdeas: [
        {
          title: String,
          body: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    {
      timestamps: true,
    }
  )

export default mongoose.model(
  'LinkedInActivity',
  linkedinActivitySchema
)