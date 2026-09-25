import { Router } from 'express'
import { register, login, me, logout } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = Router()
router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', protect, me)
router.post('/logout', protect, logout)

export default router
