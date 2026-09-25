import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

function sanitize(user) {
  const obj = user.toObject ? user.toObject() : user
  delete obj.password
  return obj
}

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return next(new AppError('Name, email, and password are required.', 400))
  if (password.length < 8) return next(new AppError('Password must be at least 8 characters.', 400))

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) return next(new AppError('An account with this email already exists.', 409))

  const user = await User.create({ name, email, password })
  const token = signToken(user._id)
  res.status(201).json({ success: true, token, user: sanitize(user) })
})

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body
  if (!email || !password) return next(new AppError('Email and password are required.', 400))

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401))
  }

  const token = signToken(user._id)
  res.status(200).json({ success: true, token, user: sanitize(user) })
})

export const me = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user })
})

export const logout = catchAsync(async (req, res) => {
  // Stateless JWT — logout is a client-side token discard. Endpoint kept for
  // symmetry and to support future refresh-token / blacklist strategies.
  res.status(200).json({ success: true, message: 'Logged out.' })
})
