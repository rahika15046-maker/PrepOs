import User from '../models/User.js'
import UserProfile from '../models/UserProfile.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'

const DAYS = new Set([
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
])

function isTime(value) {
  return typeof value === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function validateTimeBlock(block, name, optional = false) {
  if (!block) {
    if (optional) return

    throw new AppError(
      `${name} is required.`,
      400
    )
  }

  if (!isTime(block.start)) {
    throw new AppError(
      `${name}.start must be HH:mm.`,
      400
    )
  }

  const duration = Number(block.durationMinutes)

  if (
    !Number.isFinite(duration) ||
    duration < 0 ||
    duration > 300
  ) {
    throw new AppError(
      `${name}.durationMinutes is invalid.`,
      400
    )
  }
}

function validateRoutine(dailyRhythm) {
  if (!dailyRhythm) {
    throw new AppError(
      'Daily routine is required.',
      400
    )
  }

  if (!isTime(dailyRhythm.wakeTime)) {
    throw new AppError(
      'wakeTime must be HH:mm.',
      400
    )
  }

  if (!isTime(dailyRhythm.sleepTime)) {
    throw new AppError(
      'sleepTime must be HH:mm.',
      400
    )
  }

  if (
    dailyRhythm.collegeStart &&
    !isTime(dailyRhythm.collegeStart)
  ) {
    throw new AppError(
      'collegeStart must be HH:mm.',
      400
    )
  }

  if (
    dailyRhythm.collegeEnd &&
    !isTime(dailyRhythm.collegeEnd)
  ) {
    throw new AppError(
      'collegeEnd must be HH:mm.',
      400
    )
  }

  const travel = Number(
    dailyRhythm.travelMinutes || 0
  )

  if (!Number.isFinite(travel) || travel < 0) {
    throw new AppError(
      'travelMinutes is invalid.',
      400
    )
  }

  validateTimeBlock(
    dailyRhythm.breakfast,
    'breakfast'
  )

  validateTimeBlock(
    dailyRhythm.lunch,
    'lunch'
  )

  validateTimeBlock(
    dailyRhythm.dinner,
    'dinner'
  )

  if (dailyRhythm.exercise) {
    validateTimeBlock(
      dailyRhythm.exercise,
      'exercise',
      true
    )
  }
}

export const getMe = catchAsync(async (req, res) => {
  const profile = await UserProfile.findOne({
    user: req.user._id,
  })

  res.status(200).json({
    success: true,
    user: req.user,
    profile,
  })
})

export const updateMe = catchAsync(async (req, res) => {
  const name =
    typeof req.body?.name === 'string'
      ? req.body.name.trim()
      : undefined

  const user =
    await User.findByIdAndUpdate(
      req.user._id,
      name
        ? { name }
        : {},
      {
        new: true,
        runValidators: true,
      }
    )

  res.status(200).json({
    success: true,
    user,
  })
})

export const completeOnboarding =
  catchAsync(async (req, res, next) => {
    const {
      role,
      deadlineDays,
      dailyRhythm,
      collegeDays,
      fixedEvents,
    } = req.body

    const cleanRole =
      typeof role === 'string'
        ? role.trim()
        : ''

    const days =
      Array.isArray(collegeDays)
        ? collegeDays
        : []

    if (!cleanRole) {
      return next(
        new AppError(
          'Target career role is required.',
          400
        )
      )
    }

    if (cleanRole.length > 150) {
      return next(
        new AppError(
          'Target career role is too long.',
          400
        )
      )
    }

    const daysInvalid = days.some(
      (day) => !DAYS.has(day)
    )

    if (daysInvalid) {
      return next(
        new AppError(
          'Invalid college day.',
          400
        )
      )
    }

    const deadline =
      Number(deadlineDays)

    if (
      !Number.isInteger(deadline) ||
      deadline < 7 ||
      deadline > 730
    ) {
      return next(
        new AppError(
          'deadlineDays must be between 7 and 730.',
          400
        )
      )
    }

    validateRoutine(dailyRhythm)

    const profile =
      await UserProfile.findOneAndUpdate(
        {
          user: req.user._id,
        },
        {
          user: req.user._id,
          role: cleanRole,
          deadlineDays: deadline,
          deadlineStartDate: new Date(),

          dailyRhythm: {
            wakeTime:
              dailyRhythm.wakeTime,

            sleepTime:
              dailyRhythm.sleepTime,

            collegeStart:
              dailyRhythm.collegeStart,

            collegeEnd:
              dailyRhythm.collegeEnd,

            travelMinutes:
              Number(
                dailyRhythm.travelMinutes || 0
              ),

            breakfast:
              dailyRhythm.breakfast,

            lunch:
              dailyRhythm.lunch,

            dinner:
              dailyRhythm.dinner,

            exercise:
              dailyRhythm.exercise || undefined,
          },

          collegeDays: days,

          fixedEvents:
            Array.isArray(fixedEvents)
              ? fixedEvents
              : [],
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      )

    await User.findByIdAndUpdate(
      req.user._id,
      {
        onboarded: true,
      }
    )

    res.status(200).json({
      success: true,
      profile,
    })
  })