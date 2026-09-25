import { DAY_NAMES, addDays, toDayString, diffDays, dayNameOf, weekStartOf } from '../utils/dates.js'

const DAYS = DAY_NAMES

const MIN_SLOT = 20
const STUDY_BLOCK_MIN = 45
const REVISION_BLOCK_MIN = 30
const BREAK_AFTER_MIN = 90
const BREAK_LEN_MIN = 10
const MAX_DAILY_STUDY_MIN = 240
const MIN_BLOCK = 15
const OVERFLOW_DAYS = 120

function toMinutes(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{2}:\d{2}$/.test(value)
  ) {
    return null
  }

  const [h, m] = value.split(':').map(Number)

  if (h > 23 || m > 59) return null

  return h * 60 + m
}

function minutesToHHMM(mins) {
  const normalized =
    ((Math.round(mins) % 1440) + 1440) % 1440

  const h = Math.floor(normalized / 60)
  const m = normalized % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizeRelative(value, wake) {
  const minutes = toMinutes(value)

  if (minutes === null) return null

  return minutes < wake
    ? minutes + 1440
    : minutes
}

function normalizeBlock(start, end, wake) {
  const s = normalizeRelative(start, wake)
  const e = normalizeRelative(end, wake)

  if (s === null || e === null) {
    return null
  }

  return {
    start: s,
    end: e < s ? e + 1440 : e,
  }
}

function mergeBusy(blocks) {
  const sorted = [...blocks]
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start)

  const merged = []

  for (const block of sorted) {
    const last = merged[merged.length - 1]

    if (last && block.start <= last.end) {
      last.end = Math.max(
        last.end,
        block.end
      )
    } else {
      merged.push({
        ...block,
      })
    }
  }

  return merged
}

/* -------------------------------------------------------------------------- */
/* Routine                                                                    */
/* -------------------------------------------------------------------------- */

function routineBusyBlocks(profile, day) {
  const rhythm = profile.dailyRhythm || {}

  const wake = toMinutes(
    rhythm.wakeTime || '07:00'
  )

  const sleepRaw = toMinutes(
    rhythm.sleepTime || '23:00'
  )

  const sleep =
    sleepRaw <= wake
      ? sleepRaw + 1440
      : sleepRaw

  const busy = []

  /* College */
  if (
    profile.collegeDays?.includes(day) &&
    rhythm.collegeStart &&
    rhythm.collegeEnd
  ) {
    const college = normalizeBlock(
      rhythm.collegeStart,
      rhythm.collegeEnd,
      wake
    )

    if (college) {
      busy.push({
        ...college,
        type: 'college',
        title: 'College',
      })

      const travel = Number(
        rhythm.travelMinutes || 0
      )

      if (travel > 0) {
        busy.push({
          start: college.start - travel,
          end: college.start,
          type: 'travel',
          title: 'Travel',
        })

        busy.push({
          start: college.end,
          end: college.end + travel,
          type: 'travel',
          title: 'Travel',
        })
      }
    }
  }

  /* User fixed events */
  for (const event of profile.fixedEvents || []) {
    if (event.day !== day) continue

    const fixed = normalizeBlock(
      event.start,
      event.end,
      wake
    )

    if (fixed) {
      busy.push({
        ...fixed,
        type: 'fixed',
        title:
          event.title ||
          'Fixed event',
      })
    }
  }

  /* Actual meal/exercise timings */
  for (const [key, label] of [
    ['breakfast', 'Breakfast'],
    ['lunch', 'Lunch'],
    ['dinner', 'Dinner'],
    ['exercise', 'Exercise'],
  ]) {
    const item = rhythm[key]

    if (
      !item?.start ||
      !Number(item.durationMinutes)
    ) {
      continue
    }

    const start = normalizeRelative(
      item.start,
      wake
    )

    if (start === null) continue

    busy.push({
      start,
      end:
        start +
        Number(item.durationMinutes),
      type:
        key === 'exercise'
          ? 'fixed'
          : 'meal',
      title: label,
    })
  }

  /*
   * Backward compatibility for older profiles.
   *
   * Old profiles only have mealMinutesPerDay.
   * New profiles use actual meal timings above.
   */
  const hasActualMeals =
    rhythm.breakfast?.start ||
    rhythm.lunch?.start ||
    rhythm.dinner?.start

  if (
    !hasActualMeals &&
    Number(rhythm.mealMinutesPerDay || 0) > 0
  ) {
    const total =
      Number(rhythm.mealMinutesPerDay)

    const each =
      Math.round(total / 3)

    const dayLength =
      sleep - wake

    const mealStarts = [
      wake + 30,
      wake +
        Math.round(dayLength / 2),
      sleep - 90,
    ]

    for (const start of mealStarts) {
      busy.push({
        start,
        end: start + each,
        type: 'meal',
        title: 'Meal',
      })
    }
  }

  return {
    wake,
    sleep,
    busy,
  }
}

/* -------------------------------------------------------------------------- */
/* Free Slots                                                                 */
/* -------------------------------------------------------------------------- */

export function computeFreeSlots(profile) {
  const weekSlots = {}

  for (const day of DAYS) {
    const {
      wake,
      sleep,
      busy,
    } = routineBusyBlocks(
      profile,
      day
    )

    const merged =
      mergeBusy(busy)

    const free = []

    let cursor = wake

    for (const block of merged) {
      if (
        block.end <= wake ||
        block.start >= sleep
      ) {
        continue
      }

      const start =
        Math.max(
          block.start,
          wake
        )

      const end =
        Math.min(
          block.end,
          sleep
        )

      if (start > cursor) {
        free.push({
          start: cursor,
          end: start,
        })
      }

      cursor =
        Math.max(
          cursor,
          end
        )

      if (cursor >= sleep) {
        break
      }
    }

    if (cursor < sleep) {
      free.push({
        start: cursor,
        end: sleep,
      })
    }

    weekSlots[day] =
      free.filter(
        (slot) =>
          slot.end - slot.start >=
          MIN_SLOT
      )
  }

  return weekSlots
}

/* -------------------------------------------------------------------------- */
/* Busy Blocks                                                                */
/* -------------------------------------------------------------------------- */

export function computeBusyBlocks(profile) {
  const weekBusy = {}

  for (const day of DAYS) {
    const { busy } =
      routineBusyBlocks(
        profile,
        day
      )

    weekBusy[day] =
      [...busy]
        .sort(
          (a, b) =>
            a.start - b.start
        )
        .map((block) => ({
          start:
            minutesToHHMM(
              block.start
            ),
          end:
            minutesToHHMM(
              block.end
            ),
          type: block.type,
          title: block.title,
        }))
  }

  return weekBusy
}


/* ========================================================================== */
/* Full-horizon planner                                                       */
/* ========================================================================== */

const BLOCK_TYPE_BY_TRACK = {
  learn: 'study',
  'core-cs': 'study',
  dsa: 'dsa',
  project: 'project',
  interview: 'interview',
  career: 'application',
}

const round5 = (n) => Math.max(0, Math.round(n / 5) * 5)
const hhmmToMin = (v) => {
  const [h, m] = v.split(':').map(Number)
  return h * 60 + m
}

/** Stable topological order: roadmap order, but never before a prerequisite. */
export function orderTopics(topics) {
  const byKey = new Map(topics.map((t) => [t.key, t]))
  const seen = new Set()
  const out = []

  const visit = (topic, stack = new Set()) => {
    if (seen.has(topic.key) || stack.has(topic.key)) return
    stack.add(topic.key)
    for (const key of topic.prerequisites || []) {
      if (byKey.has(key)) visit(byKey.get(key), stack)
    }
    stack.delete(topic.key)
    seen.add(topic.key)
    out.push(topic)
  }

  ;[...topics].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((t) => visit(t))
  return out
}

/** Splits every topic into subtopic-sized work units with remaining minutes. */
export function buildUnits(topics, { credited = {}, verified = {}, completedTopics = new Set() } = {}) {
  const units = []

  for (const topic of orderTopics(topics)) {
    if (completedTopics.has(topic.key)) continue

    const details = topic.subtopicDetails?.length
      ? topic.subtopicDetails
      : (topic.subtopics || []).map((name) => ({ name }))

    const items = details.length ? details : [{ name: '' }]
    const perItemHours = (Number(topic.estimatedHours) || 4) / items.length

    for (const item of items) {
      const hours = Number(item.estimatedHours) || perItemHours
      const total = Math.max(15, round5(hours * 60))
      const done = credited[topic.key]?.[item.name || ''] || 0
      const isVerified = verified[topic.key]?.has(item.name)
      const remaining = isVerified ? 0 : Math.max(0, total - done)

      if (remaining >= 10) {
        units.push({
          topicKey: topic.key,
          topicTitle: topic.title,
          subtopic: item.name || '',
          track: topic.track || 'learn',
          remaining: round5(remaining) || 10,
        })
      }
    }
  }

  return units
}

function subtractBusy(slots, busy) {
  let free = slots.map((s) => ({ ...s }))

  for (const b of busy) {
    const next = []
    for (const s of free) {
      if (b.end <= s.start || b.start >= s.end) {
        next.push(s)
        continue
      }
      if (b.start > s.start) next.push({ start: s.start, end: b.start })
      if (b.end < s.end) next.push({ start: b.end, end: s.end })
    }
    free = next
  }

  return free.filter((s) => s.end - s.start >= MIN_BLOCK)
}

/**
 * Builds the plan from `startDate` until the goal's end date (and beyond, up to
 * OVERFLOW_DAYS, if the workload cannot fit — that overflow is reported honestly).
 *
 * Pure: no database access. Everything already done is passed in as `credited`
 * / `verified`, so re-running it is idempotent — the mechanism that removes
 * duplicated blocks on regeneration and re-plans missed work automatically.
 */
export function buildPlan({
  profile,
  topics = [],
  credited = {},
  verified = {},
  completedTopics = new Set(),
  startDate,
  endDate,
  nowMinutes = 0,
  keptByDate = {},
  revisionSeeds = [],
  carryMap = {},
  interviewAreas = [],
}) {
  const weekSlots = computeFreeSlots(profile)
  const titleByKey = new Map(topics.map((t) => [t.key, t.title]))

  const allUnits = buildUnits(topics, { credited, verified, completedTopics })
  const main = allUnits.filter((u) => u.track !== 'dsa')
  const dsa = allUnits.filter((u) => u.track === 'dsa')

  const mainMinutes = main.reduce((s, u) => s + u.remaining, 0)
  const dsaMinutes = dsa.reduce((s, u) => s + u.remaining, 0)
  const rawDemand = mainMinutes + dsaMinutes

  const last = diffDays(endDate, startDate) < 13 ? addDays(startDate, 13) : endDate
  const horizon = diffDays(last, startDate) + 1
  const bufferDays = horizon >= 28 ? Math.ceil(horizon * 0.1) : 0
  const learnEnd = addDays(last, -bufferDays)

  const slotsFor = (date) => {
    const key = toDayString(date)
    const isStart = key === toDayString(startDate)
    const busy = (keptByDate[key] || []).map((b) => ({ start: hhmmToMin(b.start), end: hhmmToMin(b.end) }))
    let slots = subtractBusy(weekSlots[dayNameOf(date)] || [], busy)
    if (isStart && nowMinutes > 0) {
      const from = Math.ceil(nowMinutes / 5) * 5
      slots = subtractBusy(slots, [{ start: 0, end: from }])
    }
    return slots
  }

  const capacityOf = (slots) =>
    Math.min(
      MAX_DAILY_STUDY_MIN,
      Math.floor(slots.reduce((s, x) => s + (x.end - x.start), 0) * 0.9)
    )

  let windowCapacity = 0
  for (let i = 0; i < horizon - bufferDays; i += 1) {
    windowCapacity += capacityOf(slotsFor(addDays(startDate, i)))
  }

  const demand = rawDemand * 1.12
  const ratio = windowCapacity > 0 ? Math.min(1, demand / windowCapacity) : 1
  const dsaShare = rawDemand ? Math.min(0.35, dsaMinutes / rawDemand) : 0

  /* Spaced revision: +1, +3, +7, +14 days after a topic's last study block. */
  const revisionCalendar = {}
  const addRevision = (dateKey, topicKey) => {
    ;(revisionCalendar[dateKey] ||= []).push(topicKey)
  }
  revisionSeeds.forEach((seed) => {
    const d = seed.date && toDayString(seed.date) > toDayString(startDate) ? seed.date : addDays(startDate, 1)
    addRevision(toDayString(d), seed.topicKey)
  })

  const remainingByTopic = {}
  allUnits.forEach((u) => {
    remainingByTopic[u.topicKey] = (remainingByTopic[u.topicKey] || 0) + 1
  })

  const blocks = []
  const studiedTopics = []
  let mainIdx = 0
  let dsaIdx = 0
  let lastLearningDate = null
  let rotation = 0

  const pushBlock = (date, start, end, type, title, extra = {}) => {
    blocks.push({ date: toDayString(date), start: minutesToHHMM(start), end: minutesToHHMM(end), type, title, ...extra })
  }

  const finishUnit = (unit, date) => {
    remainingByTopic[unit.topicKey] -= 1
    if (remainingByTopic[unit.topicKey] === 0) {
      studiedTopics.push(unit.topicKey)
      for (const offset of [1, 3, 7, 14]) addRevision(toDayString(addDays(date, offset)), unit.topicKey)
    }
  }

  const maxDay = OVERFLOW_DAYS + horizon

  for (let i = 0; i < maxDay; i += 1) {
    const date = addDays(startDate, i)
    const key = toDayString(date)
    const unitsLeft = mainIdx < main.length || dsaIdx < dsa.length

    if (!unitsLeft && date > last) break

    const slots = slotsFor(date)
    const cap = capacityOf(slots)
    if (!slots.length || cap < MIN_BLOCK) continue

    const learning = unitsLeft
    const inWindow = date <= learnEnd
    let budget = learning ? round5(cap * (inWindow ? ratio : 1)) : round5(cap * 0.5)
    if (learning && budget < 30) budget = Math.min(cap, 30)

    let dsaBudget = learning && dsa.length && dsaIdx < dsa.length ? round5(budget * dsaShare) : 0
    if (dsaBudget < 30) dsaBudget = 0

    const dueRevisions = [...new Set(revisionCalendar[key] || [])]
    let revisionsLeft = learning ? 1 : 2
    let interviewLeft = !learning && ['Wed', 'Sat'].includes(dayNameOf(date)) ? 1 : 0
    let sinceBreak = 0

    for (const slot of slots) {
      let cursor = slot.start

      while (slot.end - cursor >= MIN_BLOCK && budget >= MIN_BLOCK) {
        if (sinceBreak >= BREAK_AFTER_MIN) {
          cursor += BREAK_LEN_MIN
          sinceBreak = 0
          continue
        }

        const room = slot.end - cursor

        /* 1. spaced revision */
        if (revisionsLeft > 0 && dueRevisions.length && room >= 25 && budget >= 25) {
          const topicKey = dueRevisions.shift()
          pushBlock(date, cursor, cursor + 25, 'revision', `Revision: ${titleByKey.get(topicKey) || topicKey}`, { topicKey })
          cursor += 25; budget -= 25; sinceBreak += 25; revisionsLeft -= 1
          continue
        }

        /* 2. buffer period: rotate revision over everything studied so far */
        if (!learning) {
          if (interviewLeft > 0 && room >= 45 && budget >= 45) {
            const focus = interviewAreas.length ? interviewAreas[rotation % interviewAreas.length] : 'mixed topics'
            pushBlock(date, cursor, cursor + 45, 'interview', `Mock interview — ${focus}`)
            rotation += 1
            cursor += 45; budget -= 45; sinceBreak += 45; interviewLeft -= 1
            continue
          }
          if (studiedTopics.length && revisionsLeft > 0 && room >= 30 && budget >= 30) {
            const topicKey = studiedTopics[rotation % studiedTopics.length]
            rotation += 1
            pushBlock(date, cursor, cursor + 30, 'revision', `Final revision: ${titleByKey.get(topicKey) || topicKey}`, { topicKey })
            cursor += 30; budget -= 30; sinceBreak += 30; revisionsLeft -= 1
            continue
          }
          break
        }

        /* 3. DSA track */
        const useDsa = dsaBudget >= MIN_BLOCK && dsaIdx < dsa.length
        const unit = useDsa ? dsa[dsaIdx] : main[mainIdx]
        if (!unit) {
          if (useDsa) break
          if (dsaIdx < dsa.length && dsaBudget < MIN_BLOCK) { dsaBudget = budget; continue }
          break
        }

        const allowance = useDsa ? Math.min(budget, dsaBudget) : budget
        let len = Math.min(STUDY_BLOCK_MIN, room, allowance, unit.remaining)
        if (len < MIN_BLOCK && unit.remaining <= room && unit.remaining >= 10) len = unit.remaining
        len = round5(len)
        if (len < 10) break

        const carry = carryMap[`${unit.topicKey}::${unit.subtopic}`] || 0
        pushBlock(
          date, cursor, cursor + len,
          BLOCK_TYPE_BY_TRACK[unit.track] || 'study',
          unit.subtopic ? `${unit.topicTitle} — ${unit.subtopic}` : unit.topicTitle,
          { topicKey: unit.topicKey, subtopic: unit.subtopic, carryOver: carry }
        )

        cursor += len; budget -= len; sinceBreak += len
        if (useDsa) dsaBudget -= len
        unit.remaining -= len
        lastLearningDate = date

        if (unit.remaining <= 5) {
          finishUnit(unit, date)
          if (useDsa) dsaIdx += 1
          else mainIdx += 1
        }
      }
    }
  }

  const finished = mainIdx >= main.length && dsaIdx >= dsa.length
  let projected = lastLearningDate || startDate
  let estimated = false

  if (!finished) {
    // Workload does not fit even after the overflow window: extrapolate honestly.
    const left =
      main.slice(mainIdx).reduce((s, u) => s + u.remaining, 0) +
      dsa.slice(dsaIdx).reduce((s, u) => s + u.remaining, 0)
    const planned = blocks.reduce((s, b) => s + ((hhmmToMin(b.end) - hhmmToMin(b.start) + 1440) % 1440), 0)
    const activeDays = Math.max(1, new Set(blocks.map((b) => b.date)).size)
    const perDay = Math.max(30, planned / activeDays)
    const lastDate = blocks.length ? new Date(`${blocks[blocks.length - 1].date}T00:00:00Z`) : startDate
    projected = addDays(lastDate, Math.ceil(left / perDay))
    estimated = true
  }
  const learningMinutes = blocks
    .filter((b) => ['study', 'dsa', 'project', 'interview', 'application', 'revision'].includes(b.type))
    .reduce((s, b) => s + (hhmmToMin(b.end) - hhmmToMin(b.start) + 1440) % 1440, 0)

  return {
    blocks,
    summary: {
      startDate,
      endDate: last,
      learningEndDate: learnEnd,
      bufferDays,
      demandMinutes: rawDemand,
      windowCapacityMinutes: windowCapacity,
      dailyPaceRatio: Math.round(ratio * 100) / 100,
      plannedMinutes: learningMinutes,
      finished,
      estimated,
      projectedCompletionDate: projected,
      overflowDays: Math.max(0, diffDays(projected, last)),
    },
  }
}

/* ========================================================================== */
/* Weekly goals (Mon–Sun). There are deliberately no monthly goals.           */
/* ========================================================================== */

const LEARNING_TYPES = ['study', 'dsa', 'project', 'revision', 'interview', 'application']

const minutesOf = (e) => (hhmmToMin(e.end) - hhmmToMin(e.start) + 1440) % 1440

export function computeWeeklyGoals(events, { startDate, endDate, today, titleByKey = new Map() }) {
  const learning = events.filter((e) => !e.locked && LEARNING_TYPES.includes(e.type))
  const lastEvent = learning.reduce((m, e) => (new Date(e.date) > m ? new Date(e.date) : m), endDate)
  const finalDay = lastEvent > endDate ? lastEvent : endDate

  const weeks = []
  let cursor = weekStartOf(startDate)
  let n = 1

  while (cursor <= finalDay) {
    const weekEnd = addDays(cursor, 6)
    const inWeek = learning.filter((e) => {
      const d = new Date(e.date)
      return d >= cursor && d <= weekEnd
    })

    let completed = 0, remaining = 0, missed = 0
    const focus = new Map()

    for (const e of inWeek) {
      const m = minutesOf(e)
      if (e.status === 'Completed') completed += m
      else if (e.status === 'Partially Completed') completed += Math.round(m / 2)
      else if (e.status === 'Missed' || e.status === 'Skipped') { missed += m; continue }
      else remaining += m

      if (e.topicKey && e.type !== 'revision') {
        focus.set(e.topicKey, (focus.get(e.topicKey) || 0) + m)
      }
    }

    const topFocus = [...focus.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, minutes]) => ({ key: k, title: titleByKey.get(k) || k, minutes }))

    const target = completed + remaining
    const lastWeek = weekEnd >= finalDay
    const status = today > weekEnd ? 'past' : today >= cursor ? 'current' : 'upcoming'

    weeks.push({
      week: n,
      startDate: cursor < startDate ? startDate : cursor,
      endDate: weekEnd > finalDay ? finalDay : weekEnd,
      targetMinutes: target,
      completedMinutes: completed,
      remainingMinutes: remaining,
      missedMinutes: missed,
      focus: topFocus,
      headline: topFocus.length
        ? `Focus: ${topFocus.slice(0, 2).map((f) => f.title).join(' + ')}`
        : lastWeek ? 'Final revision & mock interviews' : 'Light week',
      status,
    })

    cursor = addDays(cursor, 7)
    n += 1
  }

  return weeks
}

/* ========================================================================== */
/* Reality check                                                              */
/* ========================================================================== */

export function realityCheck({ topics = [], deadlineDays = 30, weekSlots = {} }) {
  const requiredHours = Math.round(
    topics.reduce((sum, t) => sum + Number(t.estimatedHours || 4), 0) * 1.12
  )

  const dailyCap = Object.values(weekSlots).map((slots) =>
    Math.min(MAX_DAILY_STUDY_MIN, Math.floor(slots.reduce((s, x) => s + (x.end - x.start), 0) * 0.9))
  )
  const weeklyMinutes = dailyCap.reduce((s, x) => s + x, 0)
  const days = Number(deadlineDays || 30)
  const availableHours = Math.round(((weeklyMinutes / 7) * days) / 60)

  const ratio = requiredHours > 0 ? availableHours / requiredHours : 1
  const feasibility = ratio < 0.6 ? 'unrealistic' : ratio < 0.95 ? 'tight' : 'comfortable'
  const recommendedDeadlineDays = Math.max(days, Math.ceil(days / Math.max(ratio, 0.3)))

  return {
    requiredHours,
    availableHours,
    feasibility,
    options: {
      intensivePlan: feasibility !== 'comfortable',
      recommendedTimelineDays: recommendedDeadlineDays,
      extendDeadlineDays: recommendedDeadlineDays,
    },
  }
}
