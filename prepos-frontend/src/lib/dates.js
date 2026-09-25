/** Local calendar helpers. The server stores days as YYYY-MM-DD (UTC-midnight). */

const pad = (n) => String(n).padStart(2, '0')

export function toDayString(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse "YYYY-MM-DD" (or an ISO string from the API) as a LOCAL date at midnight. */
export function fromDayString(value) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function nowHHMM(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Query string that tells the server what "today" is for this user. */
export function clockParams() {
  return { today: toDayString(), now: nowHHMM() }
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function diffDays(a, b) {
  return Math.round((fromDayString(toDayString(a)) - fromDayString(toDayString(b))) / 86400000)
}

export function fmtDate(value, opts = { month: 'short', day: 'numeric' }) {
  return fromDayString(value).toLocaleDateString(undefined, opts)
}

export function fmtMinutes(min) {
  const m = Math.round(min || 0)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export function eventMinutes(e) {
  const [sh, sm] = e.start.split(':').map(Number)
  const [eh, em] = e.end.split(':').map(Number)
  return (eh * 60 + em - (sh * 60 + sm) + 1440) % 1440
}
