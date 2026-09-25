import Notification from '../models/Notification.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'

export const listNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(100)
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false })
  res.status(200).json({ success: true, notifications, unreadCount })
})

export const markRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true })
  if (!notification) return next(new AppError('Notification not found.', 404))
  res.status(200).json({ success: true, notification })
})

export const markAllRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true })
  res.status(200).json({ success: true })
})
