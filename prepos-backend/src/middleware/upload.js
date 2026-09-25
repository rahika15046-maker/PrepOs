import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir =
  process.env.UPLOAD_DIR ||
  'uploads'

fs.mkdirSync(
  uploadDir,
  {
    recursive: true,
  }
)

const storage =
  multer.diskStorage({
    destination:
      (_req, _file, cb) => {
        cb(null, uploadDir)
      },

    filename:
      (_req, file, cb) => {
        const extension =
          path.extname(
            file.originalname
          )

        const baseName =
          path
            .basename(
              file.originalname,
              extension
            )
            .replace(
              /[^a-zA-Z0-9_-]/g,
              '_'
            )
            .slice(0, 80)

        cb(
          null,
          `${Date.now()}-${baseName}${extension}`
        )
      },
  })

const allowedMimeTypes =
  new Set([
    'application/pdf',

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    'text/plain',

    'image/png',
    'image/jpeg',
    'image/webp',
  ])

const fileFilter =
  (_req, file, cb) => {
    if (
      allowedMimeTypes.has(
        file.mimetype
      )
    ) {
      cb(null, true)
      return
    }

    cb(
      new Error(
        'Unsupported file type. Supported files: PDF, DOCX, PPTX, TXT, PNG, JPEG and WEBP.'
      )
    )
  }

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize:
      15 * 1024 * 1024,
  },
})

export default upload