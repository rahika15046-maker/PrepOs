import ScheduleEvent from '../models/ScheduleEvent.js'
import UserProfile from '../models/UserProfile.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { getUserBlueprint, getBlueprintTopics } from '../services/careerBlueprintService.js'
import { computeFreeSlots, realityCheck } from '../services/scheduleEngine.js'
import { recordActivityAndXp } from '../services/activityHelper.js'
import {
  rebuildPlan,
  getOverview,
  routineEventsForRange,
  applyCompletionCredit,
} from '../services/planService.js'
import { addDays, clientClock, parseRangeBound, toDayString } from '../utils/dates.js'

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Partially Completed', 'Skipped']
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/* ---------------------------------------------------------------- reality */

export const getRealityCheck = catchAsync(async (req, res) => {
  const profile = await UserProfile.findOne({ user: req.user._id })
  if (!profile) throw new AppError('Complete onboarding first.', 400)

  const topics = getBlueprintTopics(await getUserBlueprint(req.user._id))

  res.status(200).json({
    success: true,
    ...realityCheck({
      topics,
      deadlineDays: profile.deadlineDays,
      weekSlots: computeFreeSlots(profile),
    }),
  })
})

/* --------------------------------------------------------------- generate */

/** (Re)builds the whole plan up to the goal's end date. Also used as "rollover". */
export const generatePlan = catchAsync(async (req, res) => {
  const { today, nowMinutes } = clientClock(req)
  const result = await rebuildPlan(req.user._id, { today, nowMinutes })

  res.status(201).json({ success: true, ...result })
})

export const getScheduleOverview = catchAsync(async (req, res) => {
  const { today, nowMinutes } = clientClock(req)
  const overview = await getOverview(req.user._id, { today, nowMinutes })

  res.status(200).json({ success: true, ...overview })
})

/* ------------------------------------------------------------------- list */

export const listSchedule = catchAsync(async (req, res) => {
  const from = parseRangeBound(req.query.from)
  const toExclusive = parseRangeBound(req.query.to, true)

  if (req.query.from && !from) throw new AppError('Invalid from date.', 400)
  if (req.query.to && !toExclusive) throw new AppError('Invalid to date.', 400)

  const filter = { user: req.user._id }
  if (from || toExclusive) {
    filter.date = {}
    if (from) filter.date.$gte = from
    if (toExclusive) filter.date.$lt = toExclusive
  }

  const events = await ScheduleEvent.find(filter).sort({ date: 1, start: 1 }).lean()

  let routine = []
  if (from && toExclusive && req.query.routine !== '0') {
    const profile = await UserProfile.findOne({ user: req.user._id }).lean()
    routine = routineEventsForRange(profile, from, addDays(toExclusive, -1))
  }

  const merged = [...events, ...routine].sort(
    (a, b) => new Date(a.date) - new Date(b.date) || a.start.localeCompare(b.start)
  )

  res.status(200).json({ success: true, events: merged })
})

/* ----------------------------------------------------------------- update */

export const updateScheduleEvent = catchAsync(async (req, res, next) => {
  const { status, start, end, date } = req.body

  if (String(req.params.id).startsWith('routine-')) {
    return next(new AppError('Routine blocks come from your daily rhythm — edit them in Settings.', 400))
  }

  if (status && !STATUSES.includes(status)) {
    return next(new AppError('Invalid schedule status.', 400))
  }
  if ((start && !TIME.test(start)) || (end && !TIME.test(end))) {
    return next(new AppError('start/end must be HH:mm.', 400))
  }

  const event = await ScheduleEvent.findOne({ _id: req.params.id, user: req.user._id })
  if (!event) return next(new AppError('Schedule event not found.', 404))

  if (event.locked && (start || end || date)) {
    return next(new AppError('This event is fixed and cannot be moved.', 400))
  }

  if (status === 'Completed' && event.status === 'Completed') {
    return res.status(200).json({ success: true, event, alreadyCompleted: true })
  }

  const previous = event.status
  if (status) event.status = status
  if (start) event.start = start
  if (end) event.end = end
  if (date) {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return next(new AppError('Invalid date.', 400))
    event.date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }

  await event.save()

  if (status === 'Completed' && previous !== 'Completed') {
    await recordActivityAndXp(req.user._id, 'task_completed', { scheduleEventId: event._id })
    await applyCompletionCredit(req.user._id, event, 1)
  }

  if (status === 'Partially Completed' && previous !== 'Partially Completed') {
    await recordActivityAndXp(req.user._id, 'task_partial', { scheduleEventId: event._id })
    await applyCompletionCredit(req.user._id, event, 0.5)
  }

  /* Skipped / partial work goes back into the plan automatically. */
  if (['Skipped', 'Partially Completed'].includes(status) && !event.locked) {
    const { today, nowMinutes } = clientClock(req)
    const result = await rebuildPlan(req.user._id, { today, nowMinutes })

    return res.status(200).json({
      success: true,
      event,
      replanned: true,
      reason:
        status === 'Skipped'
          ? `"${event.title}" was skipped — the work was moved forward in your plan.`
          : `The unfinished part of "${event.title}" was rescheduled.`,
      summary: result.summary,
    })
  }

  res.status(200).json({ success: true, event })
})


