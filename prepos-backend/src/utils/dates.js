/**
 * Calendar-day helpers.
 *
 * Every schedule date is stored as UTC-midnight of the *calendar day the user
 * sees* ("2026-09-21"). That makes the plan immune to server time zones: the
 * client tells us what "today" is, and weekday maths always uses getUTCDay().
 */

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseDay(value) {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDayString(date) {
  return new Date(date).toISOString().slice(0, 10)
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function diffDays(later, earlier) {
  return Math.round((new Date(later) - new Date(earlier)) / 86400000)
}

export function dayNameOf(date) {
  return DAY_NAMES[new Date(date).getUTCDay()]
}

/** Monday of the week containing `date` (weeks run Mon–Sun). */
export function weekStartOf(date) {
  const d = new Date(date)
  const offset = (d.getUTCDay() + 6) % 7
  return addDays(d, -offset)
}

/** Server-local calendar day expressed as UTC midnight (fallback only). */
export function serverToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

/**
 * Reads the client's calendar day from `today` (YYYY-MM-DD) in body/query.
 * Also reads `now` (HH:mm) so today's already-elapsed hours are not scheduled.
 */
export function clientClock(req) {
  const raw = req.body?.today ?? req.query?.today
  const today = parseDay(raw) || serverToday()

  const nowRaw = req.body?.now ?? req.query?.now
  let nowMinutes = 0
  if (typeof nowRaw === 'string' && /^\d{2}:\d{2}$/.test(nowRaw)) {
    const [h, m] = nowRaw.split(':').map(Number)
    if (h < 24 && m < 60) nowMinutes = h * 60 + m
  }
  return { today, nowMinutes }
}

export function parseRangeBound(value, endOfDay = false) {
  if (!value) return null
  const day = parseDay(String(value).slice(0, 10))
  if (day && DAY_RE.test(String(value))) {
    return endOfDay ? addDays(day, 1) : day
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
