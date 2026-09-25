import UserProfile from '../models/UserProfile.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { calculateJobReadiness } from '../services/jobReadinessService.js'

export const getJobReadiness = catchAsync(async (req, res, next) => {
  const profile = await UserProfile.findOne({ user: req.user._id }).lean()

  if (!profile?.role) return next(new AppError('Complete onboarding first.', 400))

  const result = await calculateJobReadiness(req.user._id)

  res.status(200).json({
    success: true,
    role: result.blueprint.role || profile.role,
    ...result,
    // Backwards-compatible alias (Dashboard reads `readiness`).
    readiness: result.overall,
  })
})
