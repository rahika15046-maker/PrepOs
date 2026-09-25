import Task from '../models/Task.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { recordActivityAndXp } from '../services/activityHelper.js'

export const listTasks = catchAsync(async (req, res) => {
  const { date } = req.query
  const filter = { user: req.user._id }
  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    filter.date = { $gte: start, $lt: end }
  }
  const tasks = await Task.find(filter).sort('date')
  res.status(200).json({ success: true, tasks })
})

export const createTask = catchAsync(async (req, res) => {
  const task = await Task.create({ ...req.body, user: req.user._id })
  res.status(201).json({ success: true, task })
})

export const updateTaskStatus = catchAsync(async (req, res, next) => {
  const { status, progress } = req.body
  const valid = ['Not Started', 'In Progress', 'Completed', 'Partially Completed', 'Skipped']
  if (status && !valid.includes(status)) return next(new AppError('Invalid status.', 400))

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { ...(status && { status }), ...(progress !== undefined && { progress }) },
    { new: true }
  )
  if (!task) return next(new AppError('Task not found.', 404))

  if (status === 'Completed') {
    await recordActivityAndXp(req.user._id, 'task_completed', { taskId: task._id })
  }

  res.status(200).json({ success: true, task })
})
