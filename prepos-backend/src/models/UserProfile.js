import mongoose from 'mongoose'

const timeBlockSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    durationMinutes: {
      type: Number,
      min: 0,
      max: 300,
    },
  },
  {
    _id: false,
  }
)

const fixedEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    day: {
      type: String,
      enum: [
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
      ],
    },

    start: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    end: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
  },
  {
    _id: false,
  }
)

const userProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    role: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    // Kept only so old documents don't break.
    // New onboarding never writes this field.
    stack: {
      type: String,
      trim: true,
      maxlength: 150,
      select: false,
    },

    deadlineDays: {
      type: Number,
      min: 7,
      max: 730,
    },

    deadlineStartDate: {
      type: Date,
    },

    dailyRhythm: {
      wakeTime: {
        type: String,
        default: '07:00',
      },

      sleepTime: {
        type: String,
        default: '23:00',
      },

      collegeStart: {
        type: String,
      },

      collegeEnd: {
        type: String,
      },

      travelMinutes: {
        type: Number,
        default: 0,
        min: 0,
      },

      breakfast: {
        type: timeBlockSchema,
      },

      lunch: {
        type: timeBlockSchema,
      },

      dinner: {
        type: timeBlockSchema,
      },

      exercise: {
        type: timeBlockSchema,
      },

      // Legacy fields.
      mealMinutesPerDay: {
        type: Number,
        default: 90,
        min: 0,
      },

      exerciseMinutesPerDay: {
        type: Number,
        default: 30,
        min: 0,
      },
    },

    collegeDays: [
      {
        type: String,
        enum: [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
          'Sun',
        ],
      },
    ],

    fixedEvents: {
      type: [fixedEventSchema],
      default: [],
    },

    leetcode: {
      username: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 100,
      },

      lastSyncedAt: Date,

      syncStatus: {
        type: String,
        enum: [
          'never',
          'success',
          'error',
        ],
        default: 'never',
      },

      syncError: {
        type: String,
        maxlength: 500,
      },

      profileUrl: String,
      realName: String,
      avatar: String,

      contest: {
        rating: Number,
        attended: Number,
        topPercentage: Number,
      },

      // Topic-wise solved counts from LeetCode's public tag statistics.
      tags: [
        {
          _id: false,
          name: String,
          slug: String,
          level: { type: String, enum: ['fundamental', 'intermediate', 'advanced'] },
          solved: Number,
        },
      ],

      activity: {
        activeDaysLast90: Number,
        currentStreak: Number,
        longestStreak: Number,
        totalActiveDays: Number,
        // { 'YYYY-MM-DD': submissions } for the last ~120 days.
        calendar: { type: Map, of: Number },
      },

      recent: [
        {
          _id: false,
          title: String,
          slug: String,
          at: Date,
        },
      ],

      stats: {
        totalSolved: {
          type: Number,
          min: 0,
        },

        easySolved: {
          type: Number,
          min: 0,
        },

        mediumSolved: {
          type: Number,
          min: 0,
        },

        hardSolved: {
          type: Number,
          min: 0,
        },

        ranking: {
          type: Number,
          min: 0,
        },
      },
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model(
  'UserProfile',
  userProfileSchema
)