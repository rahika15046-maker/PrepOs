import User from '../models/User.js'
import Activity from '../models/Activity.js'
import Achievement from '../models/Achievement.js'
import DSAProgress from '../models/DSAProgress.js'
import Task from '../models/Task.js'
import Project from '../models/Project.js'
import JobApplication from '../models/JobApplication.js'
import { XP_TABLE, xpToLevel, updateStreak, checkAchievementTriggers, ACHIEVEMENTS } from './gamificationService.js'

/**
 * Central place every controller calls after a "real" action happens
 * (task completed, DSA problem solved, quiz taken, project milestone hit).
 * Updates XP/level/streak, logs an Activity row, and unlocks any newly
 * earned achievements.
 */
export async function recordActivityAndXp(userId, type, meta = {}) {
  const xpEarned = XP_TABLE[type] || 0
  await Activity.create({ user: userId, type, meta, xpEarned })

  const user = await User.findById(userId)
  if (!user) return

  const newStreak = updateStreak(user.lastActiveDate, user.streak)
  const newXp = user.xp + xpEarned
  const { level } = xpToLevel(newXp)

  user.xp = newXp
  user.level = level
  user.streak = newStreak
  user.lastActiveDate = new Date()
  await user.save()

  const [dsaSolvedCount, taskCompletedCount, projectCount, interviewCount] = await Promise.all([
    DSAProgress.countDocuments({ user: userId, solved: true }),
    Task.countDocuments({ user: userId, status: 'Completed' }),
    Project.countDocuments({ user: userId }),
    JobApplication.countDocuments({ user: userId, stage: 'Interview' }),
  ])

  const unlockedKeys = checkAchievementTriggers({
    streak: newStreak,
    dsaSolvedCount,
    taskCompletedCount,
    projectCount,
    interviewCount,
  })

  for (const key of unlockedKeys) {
    const def = ACHIEVEMENTS.find((a) => a.key === key)
    if (!def) continue
    await Achievement.findOneAndUpdate(
      { user: userId, key },
      { user: userId, key, title: def.title, description: def.description },
      { upsert: true, setDefaultsOnInsert: true }
    )
  }

  return { xp: user.xp, level: user.level, streak: user.streak }
}
