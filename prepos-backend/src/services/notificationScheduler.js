/**
 * notificationScheduler.js
 * -------------------------------------------------------------------------
 * Registers node-cron jobs for recurring reminders. Called once from
 * server.js after the DB connects.
 * -------------------------------------------------------------------------
 */

import cron from 'node-cron'
import User from '../models/User.js'
import ScheduleEvent from '../models/ScheduleEvent.js'
import Revision from '../models/Revision.js'
import Notification from '../models/Notification.js'
import LinkedInActivity from '../models/LinkedInActivity.js'
import Activity from '../models/Activity.js'
import { askPrepAI } from './aiService.js'

async function notify(userId, type, title, body) {
  await Notification.create({ user: userId, type, title, body, scheduledFor: new Date() })
}

export function startNotificationScheduler() {
  // Every day at 07:30 — daily task reminder
  cron.schedule('30 7 * * *', async () => {
    const users = await User.find({}, '_id name')
    // Schedule dates are stored as UTC-midnight of the calendar day.
    const now = new Date()
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    for (const user of users) {
      const count = await ScheduleEvent.countDocuments({ user: user._id, date: { $gte: today, $lt: tomorrow }, type: { $in: ['study', 'dsa', 'project'] }, status: 'Not Started' })
      if (count > 0) {
        await notify(user._id, 'task_reminder', 'Your day is planned', `You have ${count} study block(s) scheduled today.`)
      }
    }
  })

  // Every day at 18:00 — revision due reminder
  cron.schedule('0 18 * * *', async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dueRevisions = await Revision.find({ scheduledFor: { $gte: today, $lt: tomorrow }, completed: false })
    for (const rev of dueRevisions) {
      await notify(rev.user, 'revision_due', 'Revision due today', `${rev.topicKey} revision is scheduled for today.`)
    }
  })

  // Every day at 21:00 — DSA + streak-warning reminder
  cron.schedule('0 21 * * *', async () => {
    const users = await User.find({}, '_id name streak lastActiveDate')
    const today = new Date()
    for (const user of users) {
      const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null
      const isToday = last && last.toDateString() === today.toDateString()
      if (!isToday) {
        await notify(user._id, 'streak_warning', "Don't lose your streak", `You haven't logged activity today — your ${user.streak}-day streak is at risk.`)
      }
    }
  })

  // Every day at 09:00 — auto-draft a LinkedIn post idea for anyone who's
  // connected their account and opted into auto-drafting. Still never
  // posts anything — just prepares a draft and notifies them it's ready.
  cron.schedule('0 9 * * *', async () => {
    const activities = await LinkedInActivity.find({ connected: true, autoDraftEnabled: true })
    for (const activity of activities) {
      try {
        const recentActivity = await Activity.find({ user: activity.user }).sort('-createdAt').limit(5)
        const topic = recentActivity[0]?.type?.replace(/_/g, ' ') || 'a recent milestone in your tech prep'
        const draft = await askPrepAI(
          { note: 'This is a LinkedIn post draft — the user copies/pastes it themselves, nothing is posted automatically.' },
          `Write a short, professional LinkedIn post about: ${topic}`
        )
        activity.draftIdeas.push({ prompt: topic, draft })
        await activity.save()
        await notify(activity.user, 'system', 'Your daily LinkedIn draft is ready', 'A new post idea was drafted based on your recent progress — review and post it yourself whenever you like.')
      } catch (err) {
        console.error('[cron] auto-draft failed for user', activity.user, err.message)
      }
    }
  })

  console.log('[cron] notification scheduler started (07:30 tasks, 09:00 LinkedIn auto-draft, 18:00 revision, 21:00 streak check)')
}
