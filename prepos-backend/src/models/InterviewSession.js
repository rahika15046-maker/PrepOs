import mongoose from 'mongoose'

const answerSchema =
  new mongoose.Schema(
    {
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewQuestion',
        required: true,
      },

      answer: {
        type: String,
        default: '',
      },

      /*
       * AI evaluation is added in Batch 4.
       *
       * For Batch 3 this remains null.
       */
      score: {
        type: Number,
        min: 0,
        max: 100,
      },

      feedback: {
        type: String,
      },

      strengths: [{ type: String }],
      improvements: [{ type: String }],
      idealAnswer: { type: String },

      answeredAt: {
        type: Date,
      },
    },
    {
      _id: false,
    }
  )

const interviewSessionSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      role: {
        type: String,
        required: true,
      },

      categories: [
        {
          type: String,
        },
      ],

      questions: [
        answerSchema,
      ],

      status: {
        type: String,
        enum: [
          'created',
          'in_progress',
          'completed',
          'abandoned',
        ],
        default: 'created',
      },

      startedAt: {
        type: Date,
      },

      completedAt: {
        type: Date,
      },

      difficulty: {
        type: String,
        default: 'Intermediate',
      },

      report: {
        summary: String,
        strengths: [String],
        weakAreas: [String],
        nextSteps: [String],
        categoryScores: { type: Map, of: Number },
      },

      /*
       * Average of AI-evaluated answers. Never fabricated: it is only
       * written after real evaluation.
       */
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
    },

    {
      timestamps: true,
    }
  )

export default mongoose.model(
  'InterviewSession',
  interviewSessionSchema
)