import jwt from 'jsonwebtoken'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import User from '../models/User.js'

export const protect = catchAsync(async (req, res, next) => {
  let token
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) token = header.split(' ')[1]

  if (!token) return next(new AppError('You are not logged in. Please log in to continue.', 401))

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return next(new AppError('Invalid or expired session. Please log in again.', 401))
  }

  const user = await User.findById(decoded.id).select('-password')
  if (!user) return next(new AppError('The user for this session no longer exists.', 401))

  req.user = user
  next()
})
