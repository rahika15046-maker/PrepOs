import Goal from '../models/Goal.js'
import UserProfile from '../models/UserProfile.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { computeFreeSlots, realityCheck } from '../services/scheduleEngine.js'
import { getUserBlueprint, getBlueprintTopics } from '../services/careerBlueprintService.js'
import { addDays, clientClock } from '../utils/dates.js'

export const listGoals = catchAsync(async (req, res) => {
  const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 })
  res.status(200).json({ success: true, goals })
})

export const getActiveGoal = catchAsync(async (req, res) => {
  const goal = await Goal.findOne({ user: req.user._id, active: true })
  res.status(200).json({ success: true, goal })
})

/**
 * Creates the active goal: a start date, an end date (deadline) and — once the
 * plan is generated — one weekly goal per calendar week in between.
 * Weekly goals only; there are no monthly goals.
 */
export const createGoal = catchAsync(async (req, res, next) => {
  const profile = await UserProfile.findOne({ user: req.user._id })
  if (!profile?.role) return next(new AppError('Complete onboarding before creating goals.', 400))

  const topics = getBlueprintTopics(await getUserBlueprint(req.user._id))
  if (!topics.length) {
    return next(new AppError('Career analysis has no roadmap topics. Regenerate career analysis first.', 409))
  }

  const { today } = clientClock(req)
  const days = Number(profile.deadlineDays || 90)

  const check = realityCheck({ topics, deadlineDays: days, weekSlots: computeFreeSlots(profile) })

  await Goal.updateMany({ user: req.user._id, active: true }, { $set: { active: false } })

  profile.deadlineStartDate = today
  await profile.save()

  const goal = await Goal.create({
    user: req.user._id,
    role: profile.role,
    stack: '',
    deadlineDays: days,
    startDate: today,
    endDate: addDays(today, days - 1),
    requiredHours: check.requiredHours,
    availableHours: check.availableHours,
    feasibility: check.feasibility,
    active: true,
  })

  res.status(201).json({ success: true, goal, realityCheck: check })
})
