import rateLimit from 'express-rate-limit'

const generalLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: Number(
      process.env.GENERAL_RATE_LIMIT ||
        300
    ),

    standardHeaders: 'draft-7',
    legacyHeaders: false,

    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message:
          'Too many requests. Please try again later.',
      },
    },
  })

const authLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: Number(
      process.env.AUTH_RATE_LIMIT ||
        20
    ),

    standardHeaders: 'draft-7',
    legacyHeaders: false,

    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMITED',
        message:
          'Too many authentication attempts. Please try again later.',
      },
    },
  })

const aiLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: Number(
      process.env.AI_RATE_LIMIT ||
        30
    ),

    standardHeaders: 'draft-7',
    legacyHeaders: false,

    message: {
      success: false,
      error: {
        code: 'AI_RATE_LIMITED',
        message:
          'Too many AI requests. Please try again later.',
      },
    },
  })

export {
  generalLimiter,
  authLimiter,
  aiLimiter,
}