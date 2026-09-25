import mongoose from 'mongoose'

const scheduleEventSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true,
      },

      date: {
        type: Date,

        required: true,
      },

      start: {
        type: String,

        required: true,

        match:
          /^([01]\d|2[0-3]):[0-5]\d$/,
      },

      end: {
        type: String,

        required: true,

        match:
          /^([01]\d|2[0-3]):[0-5]\d$/,
      },

      title: {
        type: String,

        required: true,

        trim: true,
      },

      type: {
        type: String,

        enum: [
          'study',
          'college',
          'travel',
          'meal',
          'sleep',

          /*
           * ADDED
           */
          'exercise',

          'dsa',
          'project',
          'revision',
          'interview',
          'application',
          'fixed',
          'break',
        ],

        default: 'study',
      },

      topicKey: {
        type: String,
        trim: true,
      },

      /* Specific subtopic this block covers (roadmap detail level). */
      subtopic: {
        type: String,
        trim: true,
      },

      /* How many times this work was pushed forward from an earlier day. */
      carryOver: {
        type: Number,
        default: 0,
      },

      status: {
        type: String,

        enum: [
          'Not Started',
          'In Progress',
          'Completed',
          'Partially Completed',
          'Skipped',
          /* Past block that was never actioned; its work is re-planned. */
          'Missed',
        ],

        default: 'Not Started',
      },

      generatedBy: {
        type: String,

        enum: [
          'engine',
          'user',
        ],

        default: 'engine',
      },

      /*
       * Locked events:
       *
       * College
       * Meals
       * Travel
       * Exercise
       * Fixed events
       *
       * These are constraints for the scheduler.
       */
      locked: {
        type: Boolean,

        default: false,
      },
    },

    {
      timestamps: true,
    }
  )

scheduleEventSchema.index({
  user: 1,
  date: 1,
  start: 1,
})

export default mongoose.model(
  'ScheduleEvent',
  scheduleEventSchema
)