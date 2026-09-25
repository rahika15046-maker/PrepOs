import mongoose from 'mongoose'

const interviewQuestionSchema =
  new mongoose.Schema(
    {
      role: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        enum: [
          'DSA',
          'Technical',
          'Project',
          'Behavioral',
          'CS Fundamentals',
          'System Design',
        ],
        required: true,
      },

      difficulty: {
        type: String,
        enum: [
          'Beginner',
          'Intermediate',
          'Advanced',
        ],
        default:
          'Intermediate',
      },

      question: {
        type: String,
        required: true,
      },

      expectedAreas: [
        {
          type: String,
        },
      ],

      /*
       * Used later by the AI evaluator.
       */
      evaluationCriteria: [
        {
          type: String,
        },
      ],

      tags: [
        {
          type: String,
        },
      ],

      active: {
        type: Boolean,
        default: true,
      },
    },

    {
      timestamps: true,
    }
  )

interviewQuestionSchema.index({
  role: 1,
  category: 1,
  difficulty: 1,
})

export default mongoose.model(
  'InterviewQuestion',
  interviewQuestionSchema
)