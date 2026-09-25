/**
 * LeetCode public-profile client.
 *
 * Uses only data LeetCode exposes publicly for a username (no login, no cookies):
 * solved counts, topic tag counts, submission calendar, contest rating and the
 * most recent accepted submissions. LeetCode does NOT publish a user's full list
 * of solved problems, so per-problem status for older solves is tracked in PrepOS
 * (manually or via recent submissions) — the UI says so plainly.
 */

const ENDPOINT = 'https://leetcode.com/graphql'
const TIMEOUT_MS = 12000

const HEADERS = {
  'Content-Type': 'application/json',
  Referer: 'https://leetcode.com/',
  Origin: 'https://leetcode.com',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json',
}

const PROFILE_QUERY = `
query userPublicProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking realName userAvatar }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    submissionCalendar
    tagProblemCounts {
      fundamental { tagName tagSlug problemsSolved }
      intermediate { tagName tagSlug problemsSolved }
      advanced { tagName tagSlug problemsSolved }
    }
  }
}`

const RECENT_QUERY = `
query recentAc($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) { title titleSlug timestamp }
}`

const CONTEST_QUERY = `
query contest($username: String!) {
  userContestRanking(username: $username) { rating attendedContestsCount topPercentage }
}`

export class LeetCodeError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'LeetCodeError'
    this.status = status
  }
}

async function gql(query, variables) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    })
  } catch (error) {
    throw new LeetCodeError(
      error.name === 'AbortError'
        ? 'LeetCode took too long to respond. Try again in a minute.'
        : 'LeetCode could not be reached from the server. Check the server\'s internet access.'
    )
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new LeetCodeError(
      response.status === 403 || response.status === 429
        ? 'LeetCode is temporarily rate-limiting requests from this server. Try again later.'
        : `LeetCode returned an unexpected response (HTTP ${response.status}).`
    )
  }

  if (!response.ok && !json?.data) {
    throw new LeetCodeError(`LeetCode returned HTTP ${response.status}.`)
  }

  return json
}

/** "YYYY-MM-DD" in UTC — LeetCode's calendar is UTC-based. */
const dayKey = (ts) => new Date(ts * 1000).toISOString().slice(0, 10)

export function analyzeCalendar(rawCalendar, now = Date.now()) {
  let parsed = {}
  try {
    parsed = typeof rawCalendar === 'string' ? JSON.parse(rawCalendar || '{}') : rawCalendar || {}
  } catch {
    parsed = {}
  }

  const perDay = {}
  for (const [ts, count] of Object.entries(parsed)) {
    const key = dayKey(Number(ts))
    perDay[key] = (perDay[key] || 0) + Number(count || 0)
  }

  const days = Object.keys(perDay).filter((d) => perDay[d] > 0).sort()
  const daySet = new Set(days)

  // Longest streak over all history.
  let longest = 0
  let run = 0
  let prev = null
  for (const d of days) {
    const gap = prev ? Math.round((Date.parse(d) - Date.parse(prev)) / 86400000) : 0
    run = prev && gap === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = d
  }

  // Current streak: counts back from today (or yesterday if today is still empty).
  const todayKey = new Date(now).toISOString().slice(0, 10)
  let cursor = daySet.has(todayKey) ? Date.parse(todayKey) : Date.parse(todayKey) - 86400000
  let current = 0
  while (daySet.has(new Date(cursor).toISOString().slice(0, 10))) {
    current += 1
    cursor -= 86400000
  }

  const cutoff90 = new Date(now - 90 * 86400000).toISOString().slice(0, 10)
  const cutoff120 = new Date(now - 120 * 86400000).toISOString().slice(0, 10)
  const calendar = {}
  days.filter((d) => d >= cutoff120).forEach((d) => { calendar[d] = perDay[d] })

  return {
    totalActiveDays: days.length,
    activeDaysLast90: days.filter((d) => d >= cutoff90).length,
    currentStreak: current,
    longestStreak: longest,
    calendar,
  }
}

export async function fetchLeetCodeProfile(username) {
  const main = await gql(PROFILE_QUERY, { username })
  const user = main?.data?.matchedUser

  if (!user) {
    throw new LeetCodeError(
      'That LeetCode username was not found — or the profile is private. Check the spelling (it is case-sensitive on leetcode.com).',
      404
    )
  }

  // Optional data: never let these break the sync.
  const [recentRes, contestRes] = await Promise.allSettled([
    gql(RECENT_QUERY, { username, limit: 30 }).then((r) => (r?.errors ? gql(RECENT_QUERY, { username, limit: 15 }) : r)),
    gql(CONTEST_QUERY, { username }),
  ])

  const counts = Object.fromEntries(
    (user.submitStatsGlobal?.acSubmissionNum || []).map((x) => [x.difficulty, Number(x.count)])
  )

  const tags = []
  for (const level of ['fundamental', 'intermediate', 'advanced']) {
    for (const t of user.tagProblemCounts?.[level] || []) {
      if (t.problemsSolved > 0) tags.push({ name: t.tagName, slug: t.tagSlug, level, solved: t.problemsSolved })
    }
  }
  tags.sort((a, b) => b.solved - a.solved)

  const recent =
    recentRes.status === 'fulfilled'
      ? (recentRes.value?.data?.recentAcSubmissionList || []).map((r) => ({
          title: r.title,
          slug: r.titleSlug,
          at: new Date(Number(r.timestamp) * 1000),
        }))
      : []

  const contestRaw = contestRes.status === 'fulfilled' ? contestRes.value?.data?.userContestRanking : null

  return {
    username: user.username,
    realName: user.profile?.realName || '',
    avatar: user.profile?.userAvatar || '',
    stats: {
      totalSolved: counts.All || 0,
      easySolved: counts.Easy || 0,
      mediumSolved: counts.Medium || 0,
      hardSolved: counts.Hard || 0,
      ranking: user.profile?.ranking || undefined,
    },
    tags,
    recent,
    contest: contestRaw
      ? {
          rating: Math.round(contestRaw.rating),
          attended: contestRaw.attendedContestsCount,
          topPercentage: contestRaw.topPercentage,
        }
      : undefined,
    activity: analyzeCalendar(user.submissionCalendar),
  }
}
