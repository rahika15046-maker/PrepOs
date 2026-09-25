import fs from 'fs/promises'
import path from 'path'
import JSZip from 'jszip'
import {PDFParse} from 'pdf-parse'
import mammoth from 'mammoth'

import AppError from '../utils/AppError.js'


const MAX_TEXT_LENGTH =
  Number(
    process.env.MAX_DOCUMENT_TEXT_LENGTH ||
      2_000_000
  )

const MAX_CHUNK_LENGTH =
  Number(
    process.env.DOCUMENT_CHUNK_LENGTH ||
      12000
  )

async function extractPdfText(
  filePath
) {
  const buffer =
    await fs.readFile(
      filePath
    )

  // pdf-parse v2 uses a class + async methods, not the old v1 pdf(buffer) call.
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    return result.text || ''
  } finally {
    // v2 requires explicit cleanup or it leaks the underlying pdf.js worker.
    await parser.destroy()
  }
}

async function extractDocxText(
  filePath
) {
  const result =
    await mammoth.extractRawText({
      path: filePath,
    })

  return result.value || ''
}

async function extractTxtText(
  filePath
) {
  return fs.readFile(
    filePath,
    'utf8'
  )
}

async function extractPptxText(
  filePath
) {
  const buffer =
    await fs.readFile(
      filePath
    )

  const zip =
    await JSZip.loadAsync(
      buffer
    )

  const slideNames =
    Object.keys(
      zip.files
    )
      .filter(
        (name) =>
          /^ppt\/slides\/slide\d+\.xml$/i.test(
            name
          )
      )
      .sort(
        (a, b) => {
          const aNumber =
            Number(
              a.match(
                /slide(\d+)\.xml/i
              )?.[1] || 0
            )

          const bNumber =
            Number(
              b.match(
                /slide(\d+)\.xml/i
              )?.[1] || 0
            )

          return (
            aNumber -
            bNumber
          )
        }
      )

  const slides = []

  for (
    const slideName
    of slideNames
  ) {
    const xml =
      await zip.files[
        slideName
      ].async('text')

    const matches =
      xml.match(
        /<a:t>([\s\S]*?)<\/a:t>/g
      ) || []

    const text =
      matches
        .map(
          (match) =>
            match
              .replace(
                /^<a:t>/,
                ''
              )
              .replace(
                /<\/a:t>$/,
                ''
              )
        )
        .join(' ')

    if (text.trim()) {
      slides.push(
        text.trim()
      )
    }
  }

  return slides.join(
    '\n\n'
  )
}

async function extractImageText(
  filePath
) {
  const provider =
    (
      process.env.OCR_PROVIDER ||
      ''
    ).toLowerCase()

  if (
    provider === 'google-vision'
  ) {
    return extractWithGoogleVision(
      filePath
    )
  }

  if (
    provider === 'ai-vision'
  ) {
    return extractWithAIVision(
      filePath
    )
  }

  throw new AppError(
    'Image OCR is not configured. Configure OCR_PROVIDER before uploading scanned images.',
    503,
    {
      code: 'OCR_NOT_CONFIGURED',
    }
  )
}

async function extractWithGoogleVision(
  filePath
) {
  if (
    !process.env.GOOGLE_VISION_API_KEY
  ) {
    throw new AppError(
      'Google Vision OCR is not configured.',
      503,
      {
        code:
          'OCR_PROVIDER_NOT_CONFIGURED',
      }
    )
  }

  const imageBuffer =
    await fs.readFile(
      filePath
    )

  const content =
    imageBuffer.toString(
      'base64'
    )

  const response =
    await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(
        process.env.GOOGLE_VISION_API_KEY
      )}`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          requests: [
            {
              image: {
                content,
              },

              features: [
                {
                  type:
                    'DOCUMENT_TEXT_DETECTION',
                },
              ],
            },
          ],
        }),
      }
    )

  if (!response.ok) {
    throw new AppError(
      'Image OCR provider failed.',
      502,
      {
        code:
          'OCR_PROVIDER_ERROR',
      }
    )
  }

  const data =
    await response.json()

  return (
    data?.responses?.[0]
      ?.fullTextAnnotation
      ?.text || ''
  )
}

/*
 * Do not silently fake image text.
 *
 * If your AI provider supports vision,
 * implement the provider-specific
 * multimodal request here.
 */
async function extractWithAIVision(
  filePath
) {
  throw new AppError(
    'AI vision OCR is not configured for this deployment.',
    503,
    {
      code:
        'AI_VISION_NOT_CONFIGURED',
    }
  )
}

export async function extractText(
  filePath,
  mimeType
) {
  if (!filePath) {
    throw new AppError(
      'Document path is missing.',
      400,
      {
        code:
          'DOCUMENT_PATH_MISSING',
      }
    )
  }

  try {
    if (
      mimeType ===
      'application/pdf'
    ) {
      return extractPdfText(
        filePath
      )
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return extractDocxText(
        filePath
      )
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return extractPptxText(
        filePath
      )
    }

    if (
      mimeType ===
      'text/plain'
    ) {
      return extractTxtText(
        filePath
      )
    }

    if (
      mimeType.startsWith(
        'image/'
      )
    ) {
      return extractImageText(
        filePath
      )
    }

    throw new AppError(
      'Unsupported document type.',
      400,
      {
        code:
          'UNSUPPORTED_DOCUMENT_TYPE',
      }
    )
  } catch (error) {
    if (
      error instanceof AppError
    ) {
      throw error
    }

    throw new AppError(
      'Document text extraction failed.',
      422,
      {
        code:
          'DOCUMENT_EXTRACTION_FAILED',
        details:
          process.env.NODE_ENV ===
          'production'
            ? null
            : error.message,
      }
    )
  }
}

export function cleanExtractedText(
  text
) {
  if (
    typeof text !== 'string'
  ) {
    throw new AppError(
      'Extracted document content is invalid.',
      422,
      {
        code:
          'INVALID_EXTRACTED_TEXT',
      }
    )
  }

  const cleaned =
    text
      .replace(
        /\u0000/g,
        ''
      )
      .replace(
        /\r\n/g,
        '\n'
      )
      .replace(
        /[ \t]+/g,
        ' '
      )
      .replace(
        /\n{3,}/g,
        '\n\n'
      )
      .trim()

  if (!cleaned) {
    throw new AppError(
      'No readable text could be extracted from this document.',
      422,
      {
        code:
          'EMPTY_DOCUMENT_TEXT',
      }
    )
  }

  if (
    cleaned.length >
    MAX_TEXT_LENGTH
  ) {
    throw new AppError(
      'Document contains too much text to process safely.',
      413,
      {
        code:
          'DOCUMENT_TEXT_TOO_LARGE',
      }
    )
  }

  return cleaned
}

export function chunkText(
  text,
  chunkSize = MAX_CHUNK_LENGTH
) {
  if (
    !text ||
    typeof text !== 'string'
  ) {
    return []
  }

  const chunks = []

  let start = 0

  while (
    start < text.length
  ) {
    let end =
      Math.min(
        start +
          chunkSize,
        text.length
      )

    if (
      end < text.length
    ) {
      const newline =
        text.lastIndexOf(
          '\n',
          end
        )

      const space =
        text.lastIndexOf(
          ' ',
          end
        )

      const boundary =
        Math.max(
          newline,
          space
        )

      if (
        boundary > start +
          chunkSize * 0.6
      ) {
        end = boundary
      }
    }

    chunks.push(
      text
        .slice(
          start,
          end
        )
        .trim()
    )

    start = end
  }

  return chunks.filter(Boolean)
}