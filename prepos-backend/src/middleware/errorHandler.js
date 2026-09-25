import AppError from '../utils/AppError.js'

function normalizeError(error) {
  if (error instanceof AppError) {
    return error
  }

  if (error?.name === 'ValidationError') {
    const details = Object.values(
      error.errors || {}
    ).map((item) => ({
      field: item.path,
      message: item.message,
    }))

    return new AppError(
      'Request validation failed.',
      400,
      {
        code: 'VALIDATION_ERROR',
        details,
      }
    )
  }

  if (error?.name === 'CastError') {
    return new AppError(
      'Invalid resource identifier.',
      400,
      {
        code: 'INVALID_ID',
      }
    )
  }

  if (error?.code === 11000) {
    return new AppError(
      'A record with the same value already exists.',
      409,
      {
        code: 'DUPLICATE_RESOURCE',
      }
    )
  }

  if (error?.name === 'MulterError') {
    if (
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      return new AppError(
        'Uploaded file is too large.',
        413,
        {
          code: 'FILE_TOO_LARGE',
        }
      )
    }

    return new AppError(
      error.message ||
        'File upload failed.',
      400,
      {
        code: 'UPLOAD_ERROR',
      }
    )
  }

  return new AppError(
    process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : error?.message ||
          'Internal server error.',
    500,
    {
      code: 'INTERNAL_ERROR',
      isOperational: false,
    }
  )
}

export function notFound(
  req,
  res,
  next
) {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      {
        code: 'ROUTE_NOT_FOUND',
      }
    )
  )
}

export function errorHandler(
  error,
  req,
  res,
  next
) {
  const normalized =
    normalizeError(error)

  if (
    normalized.statusCode >= 500
  ) {
    console.error(
      '[PrepOS ERROR]',
      {
        requestId:
          req.requestId,
        method: req.method,
        path: req.originalUrl,
        error:
          error?.stack || error,
      }
    )
  }

  res.status(
    normalized.statusCode
  ).json({
    success: false,

    error: {
      code: normalized.code,
      message: normalized.message,

      ...(normalized.details
        ? {
            details:
              normalized.details,
          }
        : {}),

      ...(req.requestId
        ? {
            requestId:
              req.requestId,
          }
        : {}),
    },
  })
}