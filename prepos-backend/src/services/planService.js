import ScheduleEvent from '../models/ScheduleEvent.js'
import UserProfile from '../models/UserProfile.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import Revision from '../models/Revision.js'
import Goal from '../models/Goal.js'
import AppError from '../utils/AppError.js'
import { getUserBlueprint, getBlueprintTopics } from './careerBlueprintService.js'
import {
  buildPlan,
  computeBusyBlocks,
  computeFreeSlots,
  computeWeeklyGoals,
  realityCheck,
} from './scheduleEngine.js'
import { addDays, dayNameOf, diffDays, parseDay, toDayString } from '../utils/dates.js'

export const LEARNING_TYPES = ['study', 'dsa', 'project', 'revision', 'interview', 'application']
const OPEN = ['Not Started', 'In Progress']

const toMin = (v) => {
  const [h, m] = v.split(':').map(Number)
  return h * 60 + m
}
export const eventMinutes = (e) => (toMin(e.end) - toMin(e.start) + 1440) % 1440

/* -------------------------------------------------------------------------- */
/* Per-user lock — two simultaneous regenerations were a source of duplicates */
/* -------------------------------------------------------------------------- */

const chains = new Map()

export function withUserLock(userId, fn) {
  const key = String(userId)
  const prev = chains.get(key) || Promise.resolve()
  const run = prev.catch(() => {}).then(fn)
  chains.set(key, run.finally(() => { if (chains.get(key) === run) chains.delete(key) }))
  return run
}

/* -------------------------------------------------------------------------- */
/* Goal                                                                       */
/* -------------------------------------------------------------------------- */

export async function ensureGoal(userId, profile, today, topics) {
  let goal = await Goal.findOne({ user: userId, active: true })
  if (goal) {
    if (!goal.endDate) {
      goal.endDate = addDays(goal.startDate, goal.deadlineDays - 1)
      await goal.save()
    }
    return goal
  }

  const start = profile.deadlineStartDate ? parseDay(toDayString(profile.deadlineStartDate)) : today
  const check = realityCheck({
    topics,
    deadlineDays: profile.deadlineDays,
    weekSlots: computeFreeSlots(profile),
  })

  return Goal.create({
    user: userId,
    role: profile.role,
    deadlineDays: Number(profile.deadlineDays || 90),
    startDate: start,
    endDate: addDays(start, Number(profile.deadlineDays || 90) - 1),
    requiredHours: check.requiredHours,
    availableHours: check.availableHours,
    feasibility: check.feasibility,
    active: true,
  })
}

/* -------------------------------------------------------------------------- */
/* Rebuild (used by generate, rollover, skip/partial re-plan)                 */
/* -------------------------------------------------------------------------- */

async function loadContext(userId, today) {
  const profile = await UserProfile.findOne({ user: userId })
  if (!profile) {
    throw new AppError('Complete onboarding before generating a schedule.', 400)
  }

  const blueprint = await getUserBlueprint(userId)
  const topics = getBlueprintTopics(blueprint)

  if (!topics.length) {
    throw new AppError('Your career roadmap has no topics yet. Regenerate your career analysis first.', 409)
  }

  const goal = await ensureGoal(userId, profile, today, topics)
  return { profile, blueprint, topics, goal }
}

export function rebuildPlan(userId, { today, nowMinutes = 0 }) {
  return withUserLock(userId, () => rebuildPlanUnsafe(userId, { today, nowMinutes }))
}

async function rebuildPlanUnsafe(userId, { today, nowMinutes }) {
  const { profile, blueprint, topics, goal } = await loadContext(userId, today)

  /* 0. Routine (college/meals/travel) is computed at read time now; remove the
        old stored copies that used to pile up as duplicates. */
  await ScheduleEvent.deleteMany({ user: userId, locked: true, generatedBy: 'engine' })

  /* 1. Anything in the past that was never actioned is Missed (kept as history). */
  await ScheduleEvent.updateMany(
    { user: userId, locked: false, type: { $in: LEARNING_TYPES }, date: { $lt: today }, status: { $in: OPEN } },
    { $set: { status: 'Missed' } }
  )

  const todays = await ScheduleEvent.find({
    user: userId, locked: false, type: { $in: LEARNING_TYPES }, date: today, status: 'Not Started',
  })
  const elapsed = todays.filter((e) => nowMinutes > 0 && toMin(e.end) <= nowMinutes).map((e) => e._id)
  if (elapsed.length) await ScheduleEvent.updateMany({ _id: { $in: elapsed } }, { $set: { status: 'Missed' } })

  /* 2. Drop the un-started future plan; it is regenerated below. */
  await ScheduleEvent.deleteMany({
    user: userId, locked: false, generatedBy: 'engine', status: 'Not Started', date: { $gte: today },
  })

  /* 3. What has really been achieved so far. */
  const history = await ScheduleEvent.find({
    user: userId, locked: false, type: { $in: LEARNING_TYPES },
  }).lean()

  const credited = {}
  const carryMap = {}
  const keptByDate = {}

  for (const e of history) {
    const share = e.status === 'Completed' ? 1 : e.status === 'Partially Completed' ? 0.5 : 0
    if (share && e.topicKey && e.type !== 'revision') {
      credited[e.topicKey] ||= {}
      credited[e.topicKey][e.subtopic || ''] = (credited[e.topicKey][e.subtopic || ''] || 0) + eventMinutes(e) * share
    }
    if (['Missed', 'Skipped', 'Partially Completed'].includes(e.status) && e.topicKey) {
      const k = `${e.topicKey}::${e.subtopic || ''}`
      carryMap[k] = (carryMap[k] || 0) + 1
    }
    if (e.date >= today && ['In Progress', 'Completed', 'Partially Completed'].includes(e.status)) {
      ;(keptByDate[toDayString(e.date)] ||= []).push({ start: e.start, end: e.end })
    }
  }

  const progress = await UserTopicProgress.find({ user: userId }).lean()
  const verified = {}
  const completedTopics = new Set()
  const revisionSeeds = []

  for (const p of progress) {
    verified[p.topicKey] = new Set(p.completedSubtopics || [])
    if (p.status === 'completed') completedTopics.add(p.topicKey)
    if (p.status === 'weak') revisionSeeds.push({ topicKey: p.topicKey, date: addDays(today, 1) })
  }

  const dueRevisions = await Revision.find({ user: userId, completed: false, scheduledFor: { $gte: today } }).lean()
  dueRevisions.forEach((r) => revisionSeeds.push({ topicKey: r.topicKey, date: parseDay(toDayString(r.scheduledFor)) }))

  /* 4. Plan from today (or the goal start, whichever is later) to the goal end. */
  const goalStart = parseDay(toDayString(goal.startDate))
  const startDate = goalStart > today ? goalStart : today

  const plan = buildPlan({
    profile,
    topics,
    credited,
    verified,
    completedTopics,
    startDate,
    endDate: parseDay(toDayString(goal.endDate)),
    nowMinutes: startDate.getTime() === today.getTime() ? nowMinutes : 0,
    keptByDate,
    revisionSeeds,
    carryMap,
    interviewAreas: (blueprint.interviewAreas || []).map((a) => a.name),
  })

  if (plan.blocks.length) {
    await ScheduleEvent.insertMany(
      plan.blocks.map((b) => ({
        user: userId,
        date: parseDay(b.date),
        start: b.start,
        end: b.end,
        title: b.title,
        type: b.type,
        topicKey: b.topicKey,
        subtopic: b.subtopic || undefined,
        carryOver: b.carryOver || 0,
        generatedBy: 'engine',
        locked: false,
        status: 'Not Started',
      }))
    )
  }

  /* 5. Persist the weekly goals + projection on the goal. */
  const titleByKey = new Map(topics.map((t) => [t.key, t.title]))
  const all = await ScheduleEvent.find({ user: userId, locked: false, type: { $in: LEARNING_TYPES } }).lean()
  const weeks = computeWeeklyGoals(all, {
    startDate: parseDay(toDayString(goal.startDate)),
    endDate: parseDay(toDayString(goal.endDate)),
    today,
    titleByKey,
  })

  goal.projectedCompletionDate = plan.summary.projectedCompletionDate
  goal.learningEndDate = plan.summary.learningEndDate
  goal.overflowDays = plan.summary.overflowDays
  goal.plannedMinutes = plan.summary.plannedMinutes
  goal.lastPlannedAt = new Date()
  goal.weeklyGoals = weeks.map((w) => ({
    week: w.week, startDate: w.startDate, endDate: w.endDate,
    targetMinutes: w.targetMinutes, focus: w.focus, headline: w.headline,
  }))
  const check = realityCheck({ topics, deadlineDays: goal.deadlineDays, weekSlots: computeFreeSlots(profile) })
  goal.requiredHours = check.requiredHours
  goal.availableHours = check.availableHours
  goal.feasibility = plan.summary.overflowDays > 0 ? (plan.summary.overflowDays > 14 ? 'unrealistic' : 'tight') : check.feasibility
  await goal.save()

  return {
    blocks: plan.blocks.length,
    missedRescheduled: Object.keys(carryMap).length,
    summary: {
      startDate: toDayString(plan.summary.startDate),
      deadline: toDayString(goal.endDate),
      learningEndDate: toDayString(plan.summary.learningEndDate),
      projectedCompletionDate: toDayString(plan.summary.projectedCompletionDate),
      overflowDays: plan.summary.overflowDays,
      finished: plan.summary.finished,
      estimated: plan.summary.estimated,
      demandHours: Math.round(plan.summary.demandMinutes / 60),
      feasibility: goal.feasibility,
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Routine events (virtual)                                                   */
/* -------------------------------------------------------------------------- */

export function routineEventsForRange(profile, from, to) {
  if (!profile) return []

  const busyByDay = computeBusyBlocks(profile)
  const out = []
  const days = Math.min(diffDays(to, from) + 1, 100)

  for (let i = 0; i < days; i += 1) {
    const date = addDays(from, i)
    const key = toDayString(date)
    ;(busyByDay[dayNameOf(date)] || []).forEach((b, idx) => {
      out.push({
        _id: `routine-${key}-${idx}`,
        date,
        start: b.start,
        end: b.end,
        title: b.title,
        type: b.type,
        status: 'Not Started',
        locked: true,
        virtual: true,
        generatedBy: 'engine',
      })
    })
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

export async function getOverview(userId, { today, nowMinutes = 0 }) {
  const { topics, goal } = await loadContext(userId, today)

  const events = await ScheduleEvent.find({
    user: userId, locked: false, type: { $in: LEARNING_TYPES },
  }).lean()

  const titleByKey = new Map(topics.map((t) => [t.key, t.title]))
  const weeks = computeWeeklyGoals(events, {
    startDate: parseDay(toDayString(goal.startDate)),
    endDate: parseDay(toDayString(goal.endDate)),
    today,
    titleByKey,
  })

  let completed = 0, remaining = 0, missed = 0, needsSync = false
  for (const e of events) {
    const m = eventMinutes(e)
    if (e.status === 'Completed') completed += m
    else if (e.status === 'Partially Completed') completed += m / 2
    else if (['Missed', 'Skipped'].includes(e.status)) missed += m
    else remaining += m

    if (OPEN.includes(e.status)) {
      if (e.date < today) needsSync = true
      else if (e.date.getTime() === today.getTime() && e.status === 'Not Started' && nowMinutes > 0 && toMin(e.end) <= nowMinutes) needsSync = true
    }
  }
  if (!events.some((e) => e.date >= today && e.status === 'Not Started') && remaining === 0 && !goal.lastPlannedAt) needsSync = true

  const start = parseDay(toDayString(goal.startDate))
  const end = parseDay(toDayString(goal.endDate))
  const projected = goal.projectedCompletionDate ? parseDay(toDayString(goal.projectedCompletionDate)) : null

  const currentWeek = weeks.find((w) => w.status === 'current') || null

  return {
    goal: {
      role: goal.role,
      startDate: toDayString(start),
      deadline: toDayString(end),
      totalDays: goal.deadlineDays,
      dayNumber: Math.max(1, Math.min(goal.deadlineDays, diffDays(today, start) + 1)),
      daysLeft: Math.max(0, diffDays(end, today)),
      learningEndDate: goal.learningEndDate ? toDayString(goal.learningEndDate) : null,
      projectedCompletionDate: projected ? toDayString(projected) : null,
      overflowDays: goal.overflowDays || 0,
      feasibility: goal.feasibility,
      requiredHours: goal.requiredHours,
      availableHours: goal.availableHours,
      lastPlannedAt: goal.lastPlannedAt,
    },
    totals: {
      completedMinutes: Math.round(completed),
      remainingMinutes: remaining,
      missedMinutes: missed,
      percent: completed + remaining ? Math.round((completed / (completed + remaining + missed)) * 100) : 0,
    },
    currentWeek,
    weeks,
    needsSync,
  }
}

/* -------------------------------------------------------------------------- */
/* Completion credit                                                          */
/* -------------------------------------------------------------------------- */

export async function applyCompletionCredit(userId, event, fraction = 1) {
  if (!event.topicKey || !LEARNING_TYPES.includes(event.type)) return

  const existing = await UserTopicProgress.findOne({ user: userId, topicKey: event.topicKey })
  const minutes = Math.round(eventMinutes(event) * fraction)

  const update = {
    $set: {
      lastStudiedAt: new Date(),
      confidence: Math.min(100, (existing?.confidence ?? 50) + (event.type === 'revision' ? 2 : 3)),
    },
    $inc: event.type === 'revision' ? { revisionCount: 1 } : { studiedMinutes: minutes },
  }

  if (!existing || ['locked', 'upcoming'].includes(existing.status)) update.$set.status = 'current'

  await UserTopicProgress.findOneAndUpdate({ user: userId, topicKey: event.topicKey }, update, { upsert: true })
}
