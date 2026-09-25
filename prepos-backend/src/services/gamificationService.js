/**
 * gamificationService.js
 * -------------------------------------------------------------------------
 * Deliberately understated: XP, levels, streaks, and a small set of
 * professional-sounding achievements. No badges shaped like cartoons, no
 * confetti-heavy language — this is styled to feel like a serious tool.
 * -------------------------------------------------------------------------
 */

export const XP_TABLE = {
  task_completed: 10,
  dsa_problem_solved: 15,
  quiz_taken: 8,
  project_milestone: 25,
  revision_completed: 6,
  interview_completed: 20,
}

export const ACHIEVEMENTS = [
  { key: 'first_commit', title: 'First Commit', description: 'Completed your first task on PrepOS.' },
  { key: 'seven_day_streak', title: '7-Day Streak', description: 'Stayed consistent for a full week.' },
  { key: 'fifty_dsa', title: '50 DSA Problems', description: 'Solved 50 data structures & algorithms problems.' },
  { key: 'first_project', title: 'First Project', description: 'Logged your first project.' },
  { key: 'first_interview', title: 'First Interview', description: 'Logged your first interview stage.' },
]

export function xpToLevel(xp) {
  // Each level requires progressively more XP: level n needs n*150 XP cumulative.
  let level = 1
  let remaining = xp
  while (remaining >= level * 150) {
    remaining -= level * 150
    level += 1
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: level * 150 }
}

export function updateStreak(lastActiveDate, currentStreak) {
  if (!lastActiveDate) return 1
  const last = new Date(lastActiveDate)
  const today = new Date()
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - last.setHours(0, 0, 0, 0)) / 86400000)

  if (diffDays === 0) return currentStreak // already logged today
  if (diffDays === 1) return currentStreak + 1
  return 1 // streak broken
}

export function checkAchievementTriggers({ streak, dsaSolvedCount, taskCompletedCount, projectCount, interviewCount }) {
  const unlocked = []
  if (taskCompletedCount >= 1) unlocked.push('first_commit')
  if (streak >= 7) unlocked.push('seven_day_streak')
  if (dsaSolvedCount >= 50) unlocked.push('fifty_dsa')
  if (projectCount >= 1) unlocked.push('first_project')
  if (interviewCount >= 1) unlocked.push('first_interview')
  return unlocked
}
