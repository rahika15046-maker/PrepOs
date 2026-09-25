import DSAProblem from '../models/DSAProblem.js'
import DSAProgress from '../models/DSAProgress.js'
import UserProfile from '../models/UserProfile.js'

import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { recordActivityAndXp } from '../services/activityHelper.js'
import { fetchLeetCodeProfile, LeetCodeError } from '../services/leetcodeService.js'

/* ------------------------------------------------------------------ list */

export const listProblems = catchAsync(async (req, res) => {
  const { topic, pattern, difficulty } = req.query
  const filter = {}
  if (topic) filter.topic = topic
  if (pattern) filter.pattern = pattern
  if (difficulty) filter.difficulty = difficulty

  const problems = await DSAProblem.find(filter)
    .sort({ topic: 1, difficulty: 1, title: 1 })
    .lean()

  res.status(200).json({
    success: true,
    problems: problems.map((p) => ({
      ...p,
      url: p.url || (p.leetcodeSlug ? `https://leetcode.com/problems/${p.leetcodeSlug}/` : null),
    })),
  })
})

/* -------------------------------------------------------------- progress */

export const getUserDsaProgress = catchAsync(async (req, res) => {
  const [catalog, progress, profile] = await Promise.all([
    DSAProblem.find({}, 'topic pattern difficulty').lean(),
    DSAProgress.find({ user: req.user._id }).populate('problem').lean(),
    UserProfile.findOne({ user: req.user._id }).lean(),
  ])

  const solvedIds = new Set(progress.filter((p) => p.solved && p.problem).map((p) => String(p.problem._id)))

  const topicStats = {}
  const patternStats = {}
  const difficultyStats = { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } }

  for (const problem of catalog) {
    const solved = solvedIds.has(String(problem._id)) ? 1 : 0

    topicStats[problem.topic] ||= { solved: 0, total: 0 }
    topicStats[problem.topic].total += 1
    topicStats[problem.topic].solved += solved

    if (problem.pattern) {
      patternStats[problem.pattern] ||= { solved: 0, total: 0, topic: problem.topic }
      patternStats[problem.pattern].total += 1
      patternStats[problem.pattern].solved += solved
    }

    if (difficultyStats[problem.difficulty]) {
      difficultyStats[problem.difficulty].total += 1
      difficultyStats[problem.difficulty].solved += solved
    }
  }

  const lc = profile?.leetcode || {}
  const emptyStats = { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 }

  res.status(200).json({
    success: true,
    progress,
    topicStats,
    patternStats,
    difficultyStats,
    catalogSolved: solvedIds.size,
    catalogTotal: catalog.length,
    leetcode: {
      username: lc.username || '',
      syncStatus: lc.syncStatus || 'never',
      syncError: lc.syncError || '',
      lastSyncedAt: lc.lastSyncedAt || null,
      stats: lc.stats || emptyStats,
      contest: lc.contest || null,
      tags: lc.tags || [],
      recent: lc.recent || [],
      realName: lc.realName || '',
      avatar: lc.avatar || '',
      activity: lc.activity
        ? { ...lc.activity, calendar: lc.activity.calendar instanceof Map ? Object.fromEntries(lc.activity.calendar) : lc.activity.calendar || {} }
        : null,
    },
  })
})

/* ---------------------------------------------------------------- manual */

export const markProblemProgress = catchAsync(async (req, res) => {
  const { problemId, solved, timeSpentMinutes, confidence } = req.body
  if (!problemId) throw new AppError('problemId is required.', 400)

  const problem = await DSAProblem.findById(problemId)
  if (!problem) throw new AppError('DSA problem not found.', 404)

  const existing = await DSAProgress.findOne({ user: req.user._id, problem: problemId })

  const update = {
    ...(solved !== undefined && { solved }),
    ...(timeSpentMinutes !== undefined && { timeSpentMinutes, lastAttemptedAt: new Date() }),
    ...(confidence !== undefined && { confidence }),
  }

  if (solved === true && !existing?.solved) {
    update.solvedAt = new Date()
    update.source = 'manual'
  }

  const record = await DSAProgress.findOneAndUpdate(
    { user: req.user._id, problem: problemId },
    {
      $set: update,
      ...(timeSpentMinutes !== undefined && { $inc: { attempts: 1 } }),
    },
    { upsert: true, new: true, runValidators: true }
  ).populate('problem')

  // XP only when a problem is newly solved — un-ticking/re-ticking can't farm XP.
  if (solved === true && !existing?.solved) {
    await recordActivityAndXp(req.user._id, 'dsa_problem_solved', { problemId })
  }

  res.status(200).json({ success: true, progress: record })
})

/* -------------------------------------------------------------- LeetCode */

export const connectLeetCode = catchAsync(async (req, res) => {
  const username = String(req.body.username || '').trim()

  if (!username || username.length > 100 || !/^[A-Za-z0-9_-]+$/.test(username)) {
    throw new AppError('Enter a valid LeetCode username (letters, numbers, _ or -).', 400)
  }

  // Verify it exists before saving, so a typo fails immediately — not at first sync.
  let verified
  try {
    verified = await fetchLeetCodeProfile(username)
  } catch (error) {
    if (error instanceof LeetCodeError) throw new AppError(error.message, error.status)
    throw error
  }

  const profile = await UserProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        'leetcode.username': verified.username,
        'leetcode.syncStatus': 'never',
        'leetcode.syncError': '',
      },
    },
    { new: true, runValidators: true }
  )

  if (!profile) throw new AppError('User profile not found. Complete onboarding first.', 404)

  res.status(200).json({ success: true, leetcode: profile.leetcode, verified: true })
})

export const syncLeetCode = catchAsync(async (req, res) => {
  const profile = await UserProfile.findOne({ user: req.user._id })
  if (!profile?.leetcode?.username) throw new AppError('Connect your LeetCode username first.', 400)

  let data
  try {
    data = await fetchLeetCodeProfile(profile.leetcode.username)
  } catch (error) {
    profile.leetcode.syncStatus = 'error'
    profile.leetcode.syncError = error.message.slice(0, 480)
    await profile.save()
    if (error instanceof LeetCodeError) throw new AppError(error.message, error.status)
    throw error
  }

  const lc = profile.leetcode
  lc.stats = data.stats
  lc.tags = data.tags
  lc.recent = data.recent
  lc.contest = data.contest
  lc.realName = data.realName
  lc.avatar = data.avatar
  lc.profileUrl = `https://leetcode.com/u/${data.username}/`
  lc.activity = data.activity
  lc.lastSyncedAt = new Date()
  lc.syncStatus = 'success'
  lc.syncError = ''
  await profile.save()

  /* Recent accepted submissions that match the PrepOS catalog are marked solved. */
  const slugs = [...new Set(data.recent.map((r) => r.slug))]
  let matched = 0

  if (slugs.length) {
    const problems = await DSAProblem.find({ leetcodeSlug: { $in: slugs } })
    const when = new Map(data.recent.map((r) => [r.slug, r.at]))

    for (const problem of problems) {
      const existing = await DSAProgress.findOne({ user: req.user._id, problem: problem._id })
      if (existing?.solved) continue

      await DSAProgress.findOneAndUpdate(
        { user: req.user._id, problem: problem._id },
        { $set: { solved: true, source: 'leetcode', solvedAt: when.get(problem.leetcodeSlug) || new Date() } },
        { upsert: true }
      )
      await recordActivityAndXp(req.user._id, 'dsa_problem_solved', { problemId: problem._id, source: 'leetcode' })
      matched += 1
    }
  }

  res.status(200).json({
    success: true,
    leetcode: profile.leetcode,
    newlyMatched: matched,
    recentChecked: slugs.length,
  })
})

export const disconnectLeetCode = catchAsync(async (req, res) => {
  await UserProfile.updateOne({ user: req.user._id }, { $unset: { leetcode: '' } })
  res.status(200).json({ success: true })
})
