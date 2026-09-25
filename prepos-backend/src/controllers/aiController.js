import UserProfile from '../models/UserProfile.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import ScheduleEvent from '../models/ScheduleEvent.js'
import Project from '../models/Project.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { askPrepAI, getProviderStatus } from '../services/aiService.js'

export const aiStatus = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, ...getProviderStatus() })
})

export const askAssistant = catchAsync(async (req, res, next) => {
  const { question } = req.body
  if (!question) return next(new AppError('question is required.', 400))

  const profile = await UserProfile.findOne({ user: req.user._id })
  const progress = await UserTopicProgress.find({ user: req.user._id })
  const weakTopics = progress.filter((p) => p.status === 'weak').map((p) => p.topicKey)

  const now = new Date()
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const todaySchedule = await ScheduleEvent.find({ user: req.user._id, date: { $gte: today, $lt: tomorrow } }).sort('start')

  const projects = await Project.find({ user: req.user._id })

  const userContext = {
    role: profile?.role,
    stack: profile?.stack,
    weakTopics,
    todaySchedule: todaySchedule.map((e) => ({ title: e.title, start: e.start, end: e.end, status: e.status })),
    projects: projects.map((p) => ({ name: p.name, status: p.status })),
  }

  const answer = await askPrepAI(userContext, question)
  res.status(200).json({ success: true, answer, contextUsed: userContext })
})
