import Task from '../models/Task.js'
import ScheduleEvent from '../models/ScheduleEvent.js'
import DSAProgress from '../models/DSAProgress.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import Activity from '../models/Activity.js'
import catchAsync from '../utils/catchAsync.js'

export const getAnalytics = catchAsync(async (req, res) => {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const completedEvents = await ScheduleEvent.find({ user: req.user._id, status: 'Completed', date: { $gte: since } })
  const totalEvents = await ScheduleEvent.find({ user: req.user._id, date: { $gte: since } })

  const byDay = {}
  for (const e of totalEvents) {
    const key = e.date.toISOString().slice(0, 10)
    byDay[key] = byDay[key] || { total: 0, completed: 0 }
    byDay[key].total += 1
  }
  for (const e of completedEvents) {
    const key = e.date.toISOString().slice(0, 10)
    byDay[key].completed += 1
  }

  const dailyConsistency = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, completionRate: v.total ? Math.round((v.completed / v.total) * 100) : 0 }))

  const taskCompletionTotal = await Task.countDocuments({ user: req.user._id })
  const taskCompletionDone = await Task.countDocuments({ user: req.user._id, status: 'Completed' })

  const dsaProgress = await DSAProgress.find({ user: req.user._id }).populate('problem')
  const dsaSolvedByTopic = {}
  for (const d of dsaProgress) {
    if (!d.solved || !d.problem) continue
    dsaSolvedByTopic[d.problem.topic] = (dsaSolvedByTopic[d.problem.topic] || 0) + 1
  }

  const topicProgress = await UserTopicProgress.find({ user: req.user._id })
  const weakTopics = topicProgress.filter((t) => t.status === 'weak').map((t) => t.topicKey)

  const recentActivity = await Activity.find({ user: req.user._id }).sort('-createdAt').limit(20)

  res.status(200).json({
    success: true,
    dailyConsistency,
    taskCompletion: { total: taskCompletionTotal, completed: taskCompletionDone, rate: taskCompletionTotal ? Math.round((taskCompletionDone / taskCompletionTotal) * 100) : 0 },
    dsaSolvedByTopic,
    weakTopics,
    recentActivity,
  })
})
