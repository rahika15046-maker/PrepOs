import mongoose from 'mongoose'

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    category: {
      type: String,
      default: 'general',
      trim: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    /*
     * These legacy fields are retained temporarily so old
     * database documents do not break.
     *
     * IMPORTANT:
     * PrepOS does NOT use these to decide the user's roadmap.
     * AI generates the actual career blueprint.
     */
    stacks: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('Role', roleSchema)