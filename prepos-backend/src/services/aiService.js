/**
 * PrepOS AI Service
 * ---------------------------------------------------------------------------
 * Single provider-agnostic AI layer for the application.
 *
 * Supported providers:
 *   AI_PROVIDER=gemini
 *   AI_PROVIDER=openai
 *
 * IMPORTANT:
 * - No mock AI.
 * - No silent fallback.
 * - AI failures are thrown to the controller.
 * - Structured AI responses are parsed and validated.
 * - API keys never leave the backend.
 * - Provider requests have timeouts.
 * - All feature-specific AI calls use this service.
 * ---------------------------------------------------------------------------
 */

const PROVIDER = String(process.env.AI_PROVIDER || 'gemini')
  .trim()
  .toLowerCase()

const MODEL =
  process.env.AI_MODEL ||
  (PROVIDER === 'openai' ? 'gpt-4o-mini' : 'gemini-3.5-flash-lite')

const OPENAI_BASE_URL = (
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
).replace(/\/+$/, '')

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45_000)

const MAX_INPUT_CHARS = Number(
  process.env.AI_MAX_INPUT_CHARS || 120_000
)

const MAX_OUTPUT_TOKENS = Number(
  process.env.AI_MAX_OUTPUT_TOKENS || 8_000
)

/* -------------------------------------------------------------------------- */
/* Error helpers                                                               */
/* -------------------------------------------------------------------------- */

class AIServiceError extends Error {
  constructor(message, {
    code = 'AI_SERVICE_ERROR',
    statusCode = 503,
    provider = PROVIDER,
    cause = undefined,
  } = {}) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
    this.statusCode = statusCode
    this.provider = provider
    this.cause = cause
  }
}

function createTimeoutSignal(timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

function sanitizeInput(value, maxChars = MAX_INPUT_CHARS) {
  const text = String(value ?? '').trim()

  if (!text) {
    throw new AIServiceError('AI input cannot be empty.', {
      code: 'AI_EMPTY_INPUT',
      statusCode: 400,
    })
  }

  if (text.length > maxChars) {
    throw new AIServiceError(
      `AI input is too large. Maximum supported input is ${maxChars} characters.`,
      {
        code: 'AI_INPUT_TOO_LARGE',
        statusCode: 400,
      }
    )
  }

  return text
}

function cleanMarkdownJson(text) {
  let value = String(text ?? '').trim()

  value = value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  /*
   * Some models occasionally add a short sentence before/after JSON.
   * We remove only obvious surrounding text rather than silently accepting
   * malformed content.
   */
  const firstObject = value.indexOf('{')
  const firstArray = value.indexOf('[')

  let start = -1

  if (firstObject === -1) {
    start = firstArray
  } else if (firstArray === -1) {
    start = firstObject
  } else {
    start = Math.min(firstObject, firstArray)
  }

  if (start > 0) {
    value = value.slice(start)
  }

  const lastObject = value.lastIndexOf('}')
  const lastArray = value.lastIndexOf(']')

  const end = Math.max(lastObject, lastArray)

  if (end !== -1 && end < value.length - 1) {
    value = value.slice(0, end + 1)
  }

  return value.trim()
}

function parseJSON(raw) {
  const cleaned = cleanMarkdownJson(raw)

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    throw new AIServiceError(
      'AI returned invalid structured data. Please retry.',
      {
        code: 'AI_INVALID_JSON',
        statusCode: 503,
        cause: error,
      }
    )
  }
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new AIServiceError(
      `AI response field '${fieldName}' must be an array.`,
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }
}

function assertObject(value, fieldName) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new AIServiceError(
      `AI response field '${fieldName}' must be an object.`,
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AIServiceError(
      `AI response field '${fieldName}' must be a non-empty string.`,
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }
}

function clampCount(value, min = 1, max = 20) {
  const count = Number(value)

  if (!Number.isFinite(count)) return min

  return Math.min(
    max,
    Math.max(min, Math.floor(count))
  )
}

/* -------------------------------------------------------------------------- */
/* Provider configuration                                                      */
/* -------------------------------------------------------------------------- */

function assertProviderConfigured() {
  if (!['gemini', 'openai'].includes(PROVIDER)) {
    throw new AIServiceError(
      `Unsupported AI_PROVIDER '${PROVIDER}'. Use 'gemini' or 'openai'.`,
      {
        code: 'AI_PROVIDER_UNSUPPORTED',
        statusCode: 500,
      }
    )
  }

  if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    throw new AIServiceError(
      'Gemini AI is not configured. Set GEMINI_API_KEY on the backend.',
      {
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        statusCode: 503,
      }
    )
  }

  if (PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new AIServiceError(
      'OpenAI AI is not configured. Set OPENAI_API_KEY on the backend.',
      {
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        statusCode: 503,
      }
    )
  }
}

/* -------------------------------------------------------------------------- */
/* Gemini                                                                       */
/* -------------------------------------------------------------------------- */

async function callGemini(prompt, {
  systemInstruction = null,
  temperature = 0.2,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
} = {}) {
  const key = process.env.GEMINI_API_KEY

  if (!key) {
    throw new AIServiceError(
      'GEMINI_API_KEY is not configured.',
      {
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        statusCode: 503,
      }
    )
  }

  const timeout = createTimeoutSignal()

  try {
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [
          {
            text: systemInstruction,
          },
        ],
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        MODEL
      )}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: timeout.signal,
      }
    )

    const rawText = await response.text()

    let data

    try {
      data = rawText ? JSON.parse(rawText) : {}
    } catch {
      data = {}
    }

    if (!response.ok) {
      const providerMessage =
        data?.error?.message ||
        `Gemini request failed with status ${response.status}.`

      throw new AIServiceError(providerMessage, {
        code:
          response.status === 429
            ? 'AI_RATE_LIMITED'
            : 'AI_PROVIDER_ERROR',
        statusCode:
          response.status === 429
            ? 503
            : 503,
      })
    }

    const text = data?.candidates
      ?.flatMap((candidate) => candidate?.content?.parts || [])
      ?.map((part) => part?.text || '')
      ?.join('')
      ?.trim()

    if (!text) {
      throw new AIServiceError(
        'Gemini returned an empty AI response.',
        {
          code: 'AI_EMPTY_RESPONSE',
          statusCode: 503,
        }
      )
    }

    return text
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AIServiceError(
        'AI request timed out. Please retry.',
        {
          code: 'AI_TIMEOUT',
          statusCode: 503,
          cause: error,
        }
      )
    }

    if (error instanceof AIServiceError) {
      throw error
    }

    throw new AIServiceError(
      'AI provider is temporarily unavailable. Please retry.',
      {
        code: 'AI_PROVIDER_UNAVAILABLE',
        statusCode: 503,
        cause: error,
      }
    )
  } finally {
    timeout.clear()
  }
}

/* -------------------------------------------------------------------------- */
/* OpenAI-compatible                                                           */
/* -------------------------------------------------------------------------- */

async function callOpenAICompatible(prompt, {
  systemInstruction = null,
  temperature = 0.2,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
} = {}) {
  const key = process.env.OPENAI_API_KEY

  if (!key) {
    throw new AIServiceError(
      'OPENAI_API_KEY is not configured.',
      {
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        statusCode: 503,
      }
    )
  }

  const messages = []

  if (systemInstruction) {
    messages.push({
      role: 'system',
      content: systemInstruction,
    })
  }

  messages.push({
    role: 'user',
    content: prompt,
  })

  const timeout = createTimeoutSignal()

  try {
    const response = await fetch(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature,
          max_tokens: maxOutputTokens,
        }),
        signal: timeout.signal,
      }
    )

    const rawText = await response.text()

    let data

    try {
      data = rawText ? JSON.parse(rawText) : {}
    } catch {
      data = {}
    }

    if (!response.ok) {
      const providerMessage =
        data?.error?.message ||
        `OpenAI-compatible request failed with status ${response.status}.`

      throw new AIServiceError(providerMessage, {
        code:
          response.status === 429
            ? 'AI_RATE_LIMITED'
            : 'AI_PROVIDER_ERROR',
        statusCode: 503,
      })
    }

    const text = data?.choices?.[0]?.message?.content

    if (typeof text !== 'string' || !text.trim()) {
      throw new AIServiceError(
        'OpenAI-compatible provider returned an empty AI response.',
        {
          code: 'AI_EMPTY_RESPONSE',
          statusCode: 503,
        }
      )
    }

    return text.trim()
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AIServiceError(
        'AI request timed out. Please retry.',
        {
          code: 'AI_TIMEOUT',
          statusCode: 503,
          cause: error,
        }
      )
    }

    if (error instanceof AIServiceError) {
      throw error
    }

    throw new AIServiceError(
      'AI provider is temporarily unavailable. Please retry.',
      {
        code: 'AI_PROVIDER_UNAVAILABLE',
        statusCode: 503,
        cause: error,
      }
    )
  } finally {
    timeout.clear()
  }
}

/* -------------------------------------------------------------------------- */
/* Generic completion                                                           */
/* -------------------------------------------------------------------------- */

export async function complete(prompt, options = {}) {
  const safePrompt = sanitizeInput(prompt)

  assertProviderConfigured()

  if (PROVIDER === 'gemini') {
    return callGemini(safePrompt, options)
  }

  if (PROVIDER === 'openai') {
    return callOpenAICompatible(safePrompt, options)
  }

  throw new AIServiceError(
    `Unsupported AI provider: ${PROVIDER}`,
    {
      code: 'AI_PROVIDER_UNSUPPORTED',
      statusCode: 500,
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Structured completion                                                       */
/* -------------------------------------------------------------------------- */

export async function completeJSON(
  prompt,
  {
    schemaDescription = '',
    systemInstruction = null,
    temperature = 0.1,
    maxOutputTokens = MAX_OUTPUT_TOKENS,
    retries = 1,
  } = {}
) {
  const safePrompt = sanitizeInput(prompt)

  const structuredInstruction = `
You are a structured-output engine.

Return ONLY valid JSON.

Rules:
- No markdown.
- No code fences.
- No explanation outside JSON.
- Do not omit required fields.
- Do not invent user achievements.
- Do not return null where an array/object is required.
${schemaDescription ? `\nRequired structure:\n${schemaDescription}` : ''}
`.trim()

  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = await complete(
        `${safePrompt}\n\n${structuredInstruction}`,
        {
          systemInstruction,
          temperature,
          maxOutputTokens,
        }
      )

      return parseJSON(raw)
    } catch (error) {
      lastError = error

      /*
       * Provider errors are not JSON-format errors.
       * Retrying them unnecessarily can make outages worse.
       */
      if (
        error?.code === 'AI_PROVIDER_NOT_CONFIGURED' ||
        error?.code === 'AI_RATE_LIMITED' ||
        error?.code === 'AI_TIMEOUT' ||
        error?.code === 'AI_PROVIDER_UNAVAILABLE'
      ) {
        throw error
      }

      if (attempt === retries) {
        break
      }
    }
  }

  throw new AIServiceError(
    lastError?.message ||
      'AI structured output failed. Please retry.',
    {
      code: 'AI_STRUCTURED_OUTPUT_FAILED',
      statusCode: 503,
      cause: lastError,
    }
  )
}

/* ========================================================================= */
/* DOCUMENT AI                                                               */
/* ========================================================================= */

/* -------------------------------------------------------------------------- */
/* Clean notes                                                                */
/* -------------------------------------------------------------------------- */

export async function generateCleanNotes(rawText) {
  const text = sanitizeInput(rawText)

  return complete(
    `
Transform the following extracted study material into clean, structured
learning notes.

Requirements:
- Preserve factual meaning.
- Remove obvious OCR noise.
- Use Markdown headings.
- Use concise bullet points.
- Explain important terminology.
- Preserve code and syntax where present.
- Do not invent information.
- Do not add facts that are absent from the source.
- Make the result useful for technical interview preparation.

SOURCE:

${text}
`.trim(),
    {
      temperature: 0.15,
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Pointwise summary                                                          */
/* -------------------------------------------------------------------------- */

export async function generatePointwiseSummary(rawText) {
  const text = sanitizeInput(rawText)

  const result = await completeJSON(
    `
Analyze the following study material.

Return a JSON object with exactly these fields:

{
  "concepts": [],
  "definitions": [],
  "keyPoints": [],
  "syntax": [],
  "commonMistakes": [],
  "interviewPoints": []
}

Each field must contain concise strings.

SOURCE:

${text}
`,
    {
      schemaDescription: `
{
  "concepts": ["string"],
  "definitions": ["string"],
  "keyPoints": ["string"],
  "syntax": ["string"],
  "commonMistakes": ["string"],
  "interviewPoints": ["string"]
}
`,
      temperature: 0.1,
    }
  )

  assertArray(result.concepts, 'concepts')
  assertArray(result.definitions, 'definitions')
  assertArray(result.keyPoints, 'keyPoints')
  assertArray(result.syntax, 'syntax')
  assertArray(result.commonMistakes, 'commonMistakes')
  assertArray(result.interviewPoints, 'interviewPoints')

  return result
}

/* -------------------------------------------------------------------------- */
/* Explanation                                                                */
/* -------------------------------------------------------------------------- */

export async function generateExplanation(rawText, level = 'beginner') {
  const text = sanitizeInput(rawText)

  const allowedLevels = [
    'beginner',
    'intermediate',
    'advanced',
    'interview',
  ]

  const normalizedLevel = allowedLevels.includes(
    String(level).toLowerCase()
  )
    ? String(level).toLowerCase()
    : 'beginner'

  return complete(
    `
Explain the following material at a ${normalizedLevel} level.

Requirements:
- Start from the concepts actually present in the source.
- Explain difficult terms simply.
- Use examples when helpful.
- Do not invent facts.
- For interview level, include practical and trade-off considerations.

SOURCE:

${text}
`.trim(),
    {
      temperature: 0.2,
    }
  )
}

/* -------------------------------------------------------------------------- */
/* Flashcards                                                                  */
/* -------------------------------------------------------------------------- */

export async function generateFlashcards(
  rawText,
  count = 8
) {
  const text = sanitizeInput(rawText)
  const safeCount = clampCount(count, 3, 20)

  const result = await completeJSON(
    `
Create exactly ${safeCount} useful study flashcards from the source.

Return:

[
  {
    "question": "string",
    "answer": "string"
  }
]

Requirements:
- Questions must test understanding.
- Avoid trivial wording.
- Answers must be grounded in the source.
- Do not invent facts.

SOURCE:

${text}
`,
    {
      schemaDescription: `
[
  {
    "question": "string",
    "answer": "string"
  }
]
`,
      temperature: 0.2,
    }
  )

  assertArray(result, 'flashcards')

  if (result.length !== safeCount) {
    throw new AIServiceError(
      `AI returned ${result.length} flashcards instead of ${safeCount}.`,
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }

  result.forEach((card, index) => {
    assertObject(card, `flashcards[${index}]`)
    assertNonEmptyString(
      card.question,
      `flashcards[${index}].question`
    )
    assertNonEmptyString(
      card.answer,
      `flashcards[${index}].answer`
    )
  })

  return result
}

/* -------------------------------------------------------------------------- */
/* Document quiz                                                              */
/* -------------------------------------------------------------------------- */

export async function generateQuiz(
  rawText,
  {
    mcqCount = 4,
    tfCount = 2,
    shortCount = 2,
  } = {}
) {
  const text = sanitizeInput(rawText)

  const mcq = clampCount(mcqCount, 0, 10)
  const tf = clampCount(tfCount, 0, 10)
  const short = clampCount(shortCount, 0, 10)

  if (mcq + tf + short === 0) {
    throw new AIServiceError(
      'At least one quiz question is required.',
      {
        code: 'AI_INVALID_INPUT',
        statusCode: 400,
      }
    )
  }

  const result = await completeJSON(
    `
Create a technical study quiz from the following source.

Question counts:
- MCQ: ${mcq}
- True/False: ${tf}
- Short answer: ${short}

Return ONLY:

[
  {
    "type": "mcq | true_false | short_answer",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]

Rules:
- Questions must test actual understanding.
- MCQ must have exactly 4 options.
- true_false must have exactly ["True", "False"].
- short_answer may have an empty correctAnswer because it requires human/AI evaluation later.
- Ground every question in the source.
- Do not invent source facts.
`,
    {
      schemaDescription: `
[
  {
    "type": "mcq | true_false | short_answer",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]
`,
      temperature: 0.15,
    }
  )

  assertArray(result, 'quiz')

  const expectedCount = mcq + tf + short

  if (result.length !== expectedCount) {
    throw new AIServiceError(
      `AI returned ${result.length} questions instead of ${expectedCount}.`,
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }

  let mcqSeen = 0
  let tfSeen = 0
  let shortSeen = 0

  result.forEach((question, index) => {
    assertObject(question, `quiz[${index}]`)
    assertNonEmptyString(
      question.prompt,
      `quiz[${index}].prompt`
    )

    if (question.type === 'mcq') {
      mcqSeen += 1

      if (
        !Array.isArray(question.options) ||
        question.options.length !== 4
      ) {
        throw new AIServiceError(
          `Quiz MCQ ${index} must contain exactly 4 options.`,
          {
            code: 'AI_INVALID_SCHEMA',
            statusCode: 503,
          }
        )
      }

      assertNonEmptyString(
        question.correctAnswer,
        `quiz[${index}].correctAnswer`
      )
    } else if (question.type === 'true_false') {
      tfSeen += 1

      question.options = ['True', 'False']

      if (
        !['True', 'False'].includes(question.correctAnswer)
      ) {
        throw new AIServiceError(
          `Quiz true/false question ${index} has an invalid answer.`,
          {
            code: 'AI_INVALID_SCHEMA',
            statusCode: 503,
          }
        )
      }
    } else if (question.type === 'short_answer') {
      shortSeen += 1

      if (question.correctAnswer == null) {
        question.correctAnswer = ''
      }
    } else {
      throw new AIServiceError(
        `Quiz question ${index} has invalid type.`,
        {
          code: 'AI_INVALID_SCHEMA',
          statusCode: 503,
        }
      )
    }
  })

  if (
    mcqSeen !== mcq ||
    tfSeen !== tf ||
    shortSeen !== short
  ) {
    throw new AIServiceError(
      'AI returned an incorrect quiz distribution.',
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }

  return result
}

/* ========================================================================= */
/* VERIFIED LEARNING ASSESSMENTS                                             */
/* ========================================================================= */

/* -------------------------------------------------------------------------- */
/* Subtopic assessment                                                        */
/* -------------------------------------------------------------------------- */

export async function generateSubtopicQuiz(
  topicTitle,
  subtopic,
  count = 5,
  concepts = []
) {
  const topic = sanitizeInput(topicTitle, 500)
  const childTopic = sanitizeInput(subtopic, 500)
  const safeCount = clampCount(count, 3, 10)

  const result = await completeJSON(
    `
Create exactly ${safeCount} assessment questions to verify genuine
understanding of:

Main topic: ${topic}
Subtopic: ${childTopic}
${Array.isArray(concepts) && concepts.length ? `Concepts this subtopic covers (spread questions across them): ${concepts.slice(0, 12).map((c) => sanitizeInput(c, 120)).join('; ')}` : ''}

Return a JSON array.

Use:
- mcq
- true_false

Do not make questions that can be answered merely by recognizing the
subtopic's name.

Test:
- understanding
- application
- misconceptions
- edge cases where appropriate

Return:

[
  {
    "type": "mcq | true_false",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]
`,
    {
      schemaDescription: `
[
  {
    "type": "mcq | true_false",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]
`,
      temperature: 0.2,
    }
  )

  validateAssessmentQuestions(result, safeCount)

  return result
}

/* -------------------------------------------------------------------------- */
/* Whole-topic mastery exam                                                   */
/* -------------------------------------------------------------------------- */

export async function generateTopicExamQuiz(topicTitle, subtopics = [], count = 8) {
  const topic = sanitizeInput(topicTitle, 500)
  const safeCount = clampCount(count, 5, 12)
  const names = subtopics.slice(0, 15).map((x) => sanitizeInput(x, 120)).join('; ')

  const result = await completeJSON(
    `
Create exactly ${safeCount} mastery-exam questions for the topic "${topic}".
The exam must cover ALL of these subtopics, at least one question each where possible:
${names}

Mix conceptual, applied and "what happens if" questions. Avoid trivia.
Use only mcq and true_false. MCQs have exactly four options and the correctAnswer must equal one option verbatim.

Return a JSON array:
[
  { "type": "mcq | true_false", "prompt": "string", "options": ["string"], "correctAnswer": "string" }
]
`,
    {
      schemaDescription: '[ { "type": "mcq | true_false", "prompt": "string", "options": ["string"], "correctAnswer": "string" } ]',
      temperature: 0.2,
    }
  )

  validateAssessmentQuestions(result, safeCount)
  return result
}

/* -------------------------------------------------------------------------- */
/* Skill calibration                                                          */
/* -------------------------------------------------------------------------- */

export async function generateSkillCalibrationQuiz(
  skillName,
  claimedLevel,
  count = 5
) {
  const skill = sanitizeInput(skillName, 500)
  const level = sanitizeInput(claimedLevel, 100)
  const safeCount = clampCount(count, 3, 10)

  const result = await completeJSON(
    `
Create exactly ${safeCount} questions to assess a learner's actual
proficiency in:

Skill: ${skill}
Self-reported level: ${level}

The self-reported level is only a claim.
Do NOT treat it as verified.

The questions should genuinely distinguish proficiency.

Return:

[
  {
    "type": "mcq | true_false",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]

Requirements:
- Avoid trivial definition-only questions.
- Difficulty should be appropriate for the claimed level.
- Include practical understanding.
- Do not reveal the answer in the question.
`,
    {
      schemaDescription: `
[
  {
    "type": "mcq | true_false",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]
`,
      temperature: 0.2,
    }
  )

  validateAssessmentQuestions(result, safeCount)

  return result
}

/* -------------------------------------------------------------------------- */
/* Core CS assessment                                                         */
/* -------------------------------------------------------------------------- */

export async function generateCoreCsQuiz(
  subject,
  count = 5
) {
  const safeSubject = sanitizeInput(subject, 500)
  const safeCount = clampCount(count, 3, 10)

  const result = await completeJSON(
    `
Create exactly ${safeCount} technical interview assessment questions
for the computer-science subject:

${safeSubject}

Questions should test:
- conceptual understanding
- practical understanding
- common misconceptions
- interview-level reasoning

Return:

[
  {
    "type": "mcq | true_false",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]
`,
    {
      schemaDescription: `
[
  {
    "type": "mcq | true_false",
    "prompt": "string",
    "options": ["string"],
    "correctAnswer": "string"
  }
]
`,
      temperature: 0.2,
    }
  )

  validateAssessmentQuestions(result, safeCount)

  return result
}

function validateAssessmentQuestions(
  questions,
  expectedCount
) {
  assertArray(questions, 'questions')

  if (questions.length !== expectedCount) {
    throw new AIServiceError(
      `AI returned ${questions.length} assessment questions instead of ${expectedCount}.`,
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }

  questions.forEach((question, index) => {
    assertObject(question, `questions[${index}]`)

    if (
      !['mcq', 'true_false'].includes(question.type)
    ) {
      throw new AIServiceError(
        `Invalid assessment question type at index ${index}.`,
        {
          code: 'AI_INVALID_SCHEMA',
          statusCode: 503,
        }
      )
    }

    assertNonEmptyString(
      question.prompt,
      `questions[${index}].prompt`
    )

    if (question.type === 'mcq') {
      if (
        !Array.isArray(question.options) ||
        question.options.length !== 4
      ) {
        throw new AIServiceError(
          `MCQ ${index} must have exactly four options.`,
          {
            code: 'AI_INVALID_SCHEMA',
            statusCode: 503,
          }
        )
      }
    }

    if (
      typeof question.correctAnswer !== 'string' ||
      !question.correctAnswer.trim()
    ) {
      throw new AIServiceError(
        `Question ${index} is missing correctAnswer.`,
        {
          code: 'AI_INVALID_SCHEMA',
          statusCode: 503,
        }
      )
    }
  })
}

/* ========================================================================= */
/* CONCEPT MAP                                                               */
/* ========================================================================= */

export async function generateConceptMap(rawText) {
  const text = sanitizeInput(rawText)

  const result = await completeJSON(
    `
Create a concept map from the following study material.

Return:

{
  "nodes": [
    {
      "id": "string",
      "label": "string"
    }
  ],
  "edges": [
    {
      "source": "node-id",
      "target": "node-id",
      "label": "relationship"
    }
  ]
}

Rules:
- Nodes represent meaningful concepts.
- Edges represent meaningful relationships.
- Every edge source and target must reference an existing node.
- Do not invent concepts not supported by the source.

SOURCE:

${text}
`,
    {
      schemaDescription: `
{
  "nodes": [
    {
      "id": "string",
      "label": "string"
    }
  ],
  "edges": [
    {
      "source": "string",
      "target": "string",
      "label": "string"
    }
  ]
}
`,
      temperature: 0.15,
    }
  )

  assertArray(result.nodes, 'nodes')
  assertArray(result.edges, 'edges')

  const nodeIds = new Set()

  result.nodes.forEach((node, index) => {
    assertObject(node, `nodes[${index}]`)
    assertNonEmptyString(node.id, `nodes[${index}].id`)
    assertNonEmptyString(node.label, `nodes[${index}].label`)

    if (nodeIds.has(node.id)) {
      throw new AIServiceError(
        `Duplicate concept-map node id '${node.id}'.`,
        {
          code: 'AI_INVALID_SCHEMA',
          statusCode: 503,
        }
      )
    }

    nodeIds.add(node.id)
  })

  result.edges.forEach((edge, index) => {
    assertObject(edge, `edges[${index}]`)

    if (!nodeIds.has(edge.source)) {
      throw new AIServiceError(
        `Concept-map edge ${index} references unknown source '${edge.source}'.`,
        {
          code: 'AI_INVALID_SCHEMA',
          statusCode: 503,
        }
      )
    }

    if (!nodeIds.has(edge.target)) {
      throw new AIServiceError(
        `Concept-map edge ${index} references unknown target '${edge.target}'.`,
        {
          code: 'AI_INVALID_SCHEMA',
          statusCode: 503,
        }
      )
    }

    assertNonEmptyString(
      edge.label,
      `edges[${index}].label`
    )
  })

  return result
}

/* ========================================================================= */
/* DOCUMENT INTERVIEW QUESTIONS                                             */
/* ========================================================================= */

export async function generateInterviewQuestions(
  rawText
) {
  const text = sanitizeInput(rawText)

  const result = await completeJSON(
    `
Generate technical interview questions based only on the following
study material.

Return:

{
  "beginner": ["string"],
  "intermediate": ["string"],
  "advanced": ["string"]
}

Questions should test understanding and application rather than simply
asking for copied definitions.

SOURCE:

${text}
`,
    {
      schemaDescription: `
{
  "beginner": ["string"],
  "intermediate": ["string"],
  "advanced": ["string"]
}
`,
      temperature: 0.2,
    }
  )

  assertArray(result.beginner, 'beginner')
  assertArray(result.intermediate, 'intermediate')
  assertArray(result.advanced, 'advanced')

  return result
}

/* ========================================================================= */
/* DOCUMENT RETRIEVAL                                                        */
/* ========================================================================= */

export function retrieveRelevantChunks(
  chunks,
  question,
  topK = 4
) {
  if (!Array.isArray(chunks)) {
    return []
  }

  const safeQuestion = String(question || '')
    .toLowerCase()
    .trim()

  if (!safeQuestion) {
    return []
  }

  const qWords = new Set(
    safeQuestion
      .split(/\W+/)
      .filter((word) => word.length > 1)
  )

  const safeTopK = clampCount(topK, 1, 10)

  return chunks
    .map((chunk) => {
      const text = String(chunk?.text || '')

      const words = text
        .toLowerCase()
        .split(/\W+/)
        .filter(Boolean)

      const uniqueWords = new Set(words)

      let overlap = 0

      for (const word of qWords) {
        if (uniqueWords.has(word)) {
          overlap += 1
        }
      }

      return {
        chunk,
        score: overlap,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, safeTopK)
    .map((item) => item.chunk)
}

/* -------------------------------------------------------------------------- */
/* Ask document                                                               */
/* -------------------------------------------------------------------------- */

export async function answerFromDocument(
  chunks,
  question
) {
  const safeQuestion = sanitizeInput(question, 5_000)

  const relevant = retrieveRelevantChunks(
    chunks,
    safeQuestion,
    5
  )

  if (!relevant.length) {
    return 'I could not find enough relevant information in this document to answer that question.'
  }

  const context = relevant
    .map((chunk) => String(chunk?.text || '').trim())
    .filter(Boolean)
    .join('\n\n--- DOCUMENT SECTION ---\n\n')

  if (!context.trim()) {
    return 'I could not find enough readable content in this document to answer that question.'
  }

  return complete(
    `
Answer the user's question using ONLY the supplied document context.

Rules:
- Do not use outside knowledge.
- If the answer is not supported by the context, explicitly say that the
  document does not contain enough information.
- Do not invent citations.
- Explain clearly and concisely.

DOCUMENT CONTEXT:

${context}

QUESTION:

${safeQuestion}
`.trim(),
    {
      temperature: 0.1,
    }
  )
}

/* ========================================================================= */
/* PREP AI                                                                   */
/* ========================================================================= */

export async function askPrepAI(
  userContext,
  question
) {
  const safeQuestion = sanitizeInput(question, 8_000)

  const context =
    userContext &&
    typeof userContext === 'object'
      ? userContext
      : {}

  return complete(
    `
You are Prep AI inside PrepOS, an adaptive technology-career
preparation operating system.

Your job is to help the learner make decisions based on their actual
PrepOS data.

USER CONTEXT:

${JSON.stringify(context, null, 2)}

USER QUESTION:

${safeQuestion}

RULES:

1. Use the user's actual context.
2. Do not invent completed topics.
3. Do not invent quiz scores.
4. Do not invent DSA problems solved.
5. Do not invent projects.
6. Do not claim the learner is job-ready unless the supplied evidence supports
   that statement.
7. If information is missing, say what is missing.
8. Prefer actionable next steps.
9. Respect the user's target technology career.
10. Do not replace verified progress with self-reported mastery.
11. Keep answers practical and career-focused.
`.trim(),
    {
      temperature: 0.2,
    }
  )
}

/* ========================================================================= */
/* ROLE INTELLIGENCE                                                         */
/* ========================================================================= */

export async function generateRoleBlueprint(
  requestedRole
) {
  const role = sanitizeInput(requestedRole, 500)

  const blueprintShape = `
{
  "normalizedRole": "string",
  "category": "string",
  "summary": "string",

  "technologies": [
    {
      "name": "string",
      "category": "string",
      "priority": 1,
      "why": "string",
      "prerequisites": ["string"]
    }
  ],

  "skills": [
    {
      "name": "string",
      "category": "string",
      "priority": 1,
      "why": "string",
      "prerequisites": ["string"]
    }
  ],

  "csSubjects": [
    {
      "name": "string",
      "category": "string",
      "priority": 1,
      "why": "string",
      "prerequisites": ["string"]
    }
  ],

  "dsa": {
    "required": true,
    "importance": 1,
    "patterns": [
      {
        "name": "string",
        "category": "string",
        "priority": 1,
        "why": "string",
        "prerequisites": ["string"]
      }
    ],
    "difficultyRange": ["Easy"]
  },

  "interviewAreas": [
    {
      "name": "string",
      "category": "string",
      "priority": 1,
      "why": "string",
      "prerequisites": ["string"]
    }
  ],

  "projectRequirements": [
    {
      "name": "string",
      "category": "string",
      "priority": 1,
      "why": "string",
      "prerequisites": ["string"]
    }
  ],

  "roadmap": [
    {
      "key": "stable-slug",
      "title": "string",
      "stage": "string",
      "description": "string",
      "prerequisites": ["stable-slug"],
      "subtopics": ["string"],
      "estimatedHours": 1,
      "importance": 1
    }
  ],

  "assessmentPlan": {
    "skills": ["string"],
    "csSubjects": ["string"],
    "dsaPatterns": ["string"]
  }
}
`

  const result = await completeJSON(
    `
You are the career-intelligence engine for PrepOS.

TARGET TECHNOLOGY CAREER:

${role}

Generate a practical, role-specific blueprint for becoming job-ready.

IMPORTANT:

The user selected ONLY the target career role.

Do NOT ask the user to choose:
- MERN
- MEVN
- Java/Spring
- Python/Django
- AWS
- Azure
- any other predefined technology stack

Instead, determine the technologies and competencies that genuinely belong
to the target role.

Examples of role categories include:
- Frontend Engineering
- Backend Engineering
- Full-Stack Engineering
- DevOps
- Site Reliability Engineering
- Cloud Engineering
- Cybersecurity
- Data Analysis
- Data Engineering
- Machine Learning
- AI Engineering
- Mobile Development
- QA / Test Automation
- Database Engineering
- Solutions Architecture

These are examples only. Do not restrict the output to them.

The blueprint must include:

1. Relevant technologies
2. Role-specific technical skills
3. Relevant computer-science subjects
4. Appropriate DSA intensity and patterns
5. Interview areas
6. Project requirements
7. A staged roadmap
8. Prerequisites
9. Assessment plan

ROADMAP REQUIREMENTS:

- Every roadmap key must be unique.
- Roadmap prerequisite values must reference roadmap keys only.
- Do not create cycles.
- Do not create dangling prerequisites.
- Each roadmap topic must have meaningful subtopics.
- Estimated hours must be realistic positive numbers.
- Importance must be between 1 and 10.

ASSESSMENT REQUIREMENTS:

The assessment plan must reference items that actually exist in the generated
blueprint.

ROLE INTELLIGENCE REQUIREMENTS:

- Do not assume a universal stack.
- Do not force technologies that are irrelevant to the role.
- Distinguish core requirements from optional requirements using priority.
- DSA must be included only to the extent appropriate to the role.
- Do not invent employers, job vacancies, certifications, or user achievements.
- The result is a proposal that PrepOS will validate before persistence.

Return ONLY valid JSON matching this structure:

${blueprintShape}
`,
    {
      schemaDescription: blueprintShape,
      temperature: 0.15,
      maxOutputTokens: 10_000,
      retries: 1,
    }
  )

  validateRoleBlueprintShape(result)

  return result
}

function validateRoleBlueprintShape(
  blueprint
) {
  assertObject(blueprint, 'blueprint')

  assertNonEmptyString(
    blueprint.normalizedRole,
    'normalizedRole'
  )

  assertNonEmptyString(
    blueprint.category,
    'category'
  )

  assertNonEmptyString(
    blueprint.summary,
    'summary'
  )

  const arrayFields = [
    'technologies',
    'skills',
    'csSubjects',
    'interviewAreas',
    'projectRequirements',
    'roadmap',
  ]

  for (const field of arrayFields) {
    assertArray(blueprint[field], field)
  }

  assertObject(blueprint.dsa, 'dsa')

  if (typeof blueprint.dsa.required !== 'boolean') {
    throw new AIServiceError(
      'AI blueprint dsa.required must be boolean.',
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }

  if (
    !Number.isFinite(Number(blueprint.dsa.importance)) ||
    Number(blueprint.dsa.importance) < 1 ||
    Number(blueprint.dsa.importance) > 10
  ) {
    throw new AIServiceError(
      'AI blueprint DSA importance must be between 1 and 10.',
      {
        code: 'AI_INVALID_SCHEMA',
        statusCode: 503,
      }
    )
  }

  assertArray(
    blueprint.dsa.patterns,
    'dsa.patterns'
  )

  assertArray(
    blueprint.dsa.difficultyRange,
    'dsa.difficultyRange'
  )

  for (const field of arrayFields.filter(
    (field) => field !== 'roadmap'
  )) {
    blueprint[field].forEach((item, index) => {
      validateBlueprintItem(
        item,
        `${field}[${index}]`
      )
    })
  }

  blueprint.dsa.patterns.forEach(
    (item, index) => {
      validateBlueprintItem(
        item,
        `dsa.patterns[${index}]`
      )
    }
  )

  blueprint.roadmap.forEach(
    (topic, index) => {
      assertObject(
        topic,
        `roadmap[${index}]`
      )

      assertNonEmptyString(
        topic.key,
        `roadmap[${index}].key`
      )

      assertNonEmptyString(
        topic.title,
        `roadmap[${index}].title`
      )

      assertNonEmptyString(
        topic.stage,
        `roadmap[${index}].stage`
      )

      assertArray(
        topic.prerequisites,
        `roadmap[${index}].prerequisites`
      )

      assertArray(
        topic.subtopics,
        `roadmap[${index}].subtopics`
      )

      const hours = Number(topic.estimatedHours)

      if (
        !Number.isFinite(hours) ||
        hours <= 0
      ) {
        throw new AIServiceError(
          `Invalid estimatedHours at roadmap[${index}].`,
          {
            code: 'AI_INVALID_SCHEMA',
            statusCode: 503,
          }
        )
      }

      const importance = Number(topic.importance)

      if (
        !Number.isFinite(importance) ||
        importance < 1 ||
        importance > 10
      ) {
        throw new AIServiceError(
          `Invalid importance at roadmap[${index}].`,
          {
            code: 'AI_INVALID_SCHEMA',
            statusCode: 503,
          }
        )
      }
    }
  )

  assertObject(
    blueprint.assessmentPlan,
    'assessmentPlan'
  )

  assertArray(
    blueprint.assessmentPlan.skills,
    'assessmentPlan.skills'
  )

  assertArray(
    blueprint.assessmentPlan.csSubjects,
    'assessmentPlan.csSubjects'
  )

  assertArray(
    blueprint.assessmentPlan.dsaPatterns,
    'assessmentPlan.dsaPatterns'
  )

  validateRoadmapDependencies(
    blueprint.roadmap
  )

  return blueprint
}

function validateBlueprintItem(
  item,
  path
) {
  assertObject(item, path)

  assertNonEmptyString(
    item.name,
    `${path}.name`
  )

  if (item.priority != null) {
    const priority = Number(item.priority)

    if (
      !Number.isFinite(priority) ||
      priority < 1 ||
      priority > 10
    ) {
      throw new AIServiceError(
        `Invalid priority at ${path}.`,
        {
          code: 'AI_INVALID_SCHEMA',
          statusCode: 503,
        }
      )
    }
  }

  if (item.prerequisites != null) {
    assertArray(
      item.prerequisites,
      `${path}.prerequisites`
    )
  }
}

function validateRoadmapDependencies(
  roadmap
) {
  const keys = roadmap.map(
    (topic) => String(topic.key).trim()
  )

  const keySet = new Set(keys)

  if (keySet.size !== keys.length) {
    throw new AIServiceError(
      'AI blueprint contains duplicate roadmap keys.',
      {
        code: 'AI_INVALID_DEPENDENCY_GRAPH',
        statusCode: 503,
      }
    )
  }

  for (const topic of roadmap) {
    for (const prerequisite of topic.prerequisites) {
      if (!keySet.has(prerequisite)) {
        throw new AIServiceError(
          `AI blueprint contains unknown roadmap prerequisite '${prerequisite}'.`,
          {
            code: 'AI_INVALID_DEPENDENCY_GRAPH',
            statusCode: 503,
          }
        )
      }

      if (prerequisite === topic.key) {
        throw new AIServiceError(
          `Roadmap topic '${topic.key}' cannot depend on itself.`,
          {
            code: 'AI_INVALID_DEPENDENCY_GRAPH',
            statusCode: 503,
          }
        )
      }
    }
  }

  const graph = new Map(
    roadmap.map((topic) => [
      topic.key,
      topic.prerequisites,
    ])
  )

  const visiting = new Set()
  const visited = new Set()

  function visit(key) {
    if (visiting.has(key)) {
      throw new AIServiceError(
        `AI blueprint contains a prerequisite cycle involving '${key}'.`,
        {
          code: 'AI_INVALID_DEPENDENCY_GRAPH',
          statusCode: 503,
        }
      )
    }

    if (visited.has(key)) {
      return
    }

    visiting.add(key)

    for (const prerequisite of graph.get(key) || []) {
      visit(prerequisite)
    }

    visiting.delete(key)
    visited.add(key)
  }

  for (const key of graph.keys()) {
    visit(key)
  }
}

/* ========================================================================= */
/* PROVIDER STATUS                                                           */
/* ========================================================================= */

export function getProviderStatus() {
  const configured =
    PROVIDER === 'gemini'
      ? Boolean(process.env.GEMINI_API_KEY)
      : PROVIDER === 'openai'
        ? Boolean(process.env.OPENAI_API_KEY)
        : false

  return {
    provider: PROVIDER,
    model: MODEL,
    configured,
    live: configured,
    timeoutMs: AI_TIMEOUT_MS,
  }
}

/* ========================================================================= */
/* OPTIONAL IMAGE/VISION SUPPORT                                             */
/* ========================================================================= */

/**
 * Vision support for image/scanned-document workflows.
 *
 * This uses the configured provider.
 *
 * Gemini:
 *   Sends an inline base64 image.
 *
 * OpenAI-compatible:
 *   Uses the multimodal message format.
 *
 * The caller must provide:
 *   - base64 image data WITHOUT data:image/... prefix
 *   - MIME type such as image/png
 */

export async function extractTextFromImage(
  imageBase64,
  mimeType = 'image/png'
) {
  const data = String(imageBase64 || '').trim()

  if (!data) {
    throw new AIServiceError(
      'Image data is required.',
      {
        code: 'AI_IMAGE_INPUT_INVALID',
        statusCode: 400,
      }
    )
  }

  if (
    ![
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ].includes(mimeType)
  ) {
    throw new AIServiceError(
      `Unsupported image MIME type '${mimeType}'.`,
      {
        code: 'AI_IMAGE_TYPE_UNSUPPORTED',
        statusCode: 400,
      }
    )
  }

  assertProviderConfigured()

  const prompt = `
Extract all readable text from this image.

Requirements:
- Preserve the original wording as accurately as possible.
- Preserve headings.
- Preserve bullet points.
- Preserve code where readable.
- Do not summarize.
- Do not explain.
- Do not invent unreadable text.
- If a section is genuinely unreadable, omit it rather than hallucinating.

Return ONLY the extracted text.
`.trim()

  if (PROVIDER === 'gemini') {
    return extractImageWithGemini(
      prompt,
      data,
      mimeType
    )
  }

  return extractImageWithOpenAI(
    prompt,
    data,
    mimeType
  )
}

async function extractImageWithGemini(
  prompt,
  base64,
  mimeType
) {
  const key = process.env.GEMINI_API_KEY
  const timeout = createTimeoutSignal()

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        MODEL
      )}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
        signal: timeout.signal,
      }
    )

    const rawText = await response.text()

    let result

    try {
      result = rawText
        ? JSON.parse(rawText)
        : {}
    } catch {
      result = {}
    }

    if (!response.ok) {
      throw new AIServiceError(
        result?.error?.message ||
          'Gemini vision request failed.',
        {
          code: 'AI_VISION_PROVIDER_ERROR',
          statusCode: 503,
        }
      )
    }

    const text = result?.candidates
      ?.flatMap(
        (candidate) =>
          candidate?.content?.parts || []
      )
      ?.map((part) => part?.text || '')
      ?.join('')
      ?.trim()

    if (!text) {
      throw new AIServiceError(
        'AI vision returned no readable text.',
        {
          code: 'AI_EMPTY_VISION_RESPONSE',
          statusCode: 503,
        }
      )
    }

    return text
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AIServiceError(
        'AI vision request timed out. Please retry.',
        {
          code: 'AI_TIMEOUT',
          statusCode: 503,
          cause: error,
        }
      )
    }

    if (error instanceof AIServiceError) {
      throw error
    }

    throw new AIServiceError(
      'AI vision service is temporarily unavailable.',
      {
        code: 'AI_VISION_UNAVAILABLE',
        statusCode: 503,
        cause: error,
      }
    )
  } finally {
    timeout.clear()
  }
}

async function extractImageWithOpenAI(
  prompt,
  base64,
  mimeType
) {
  const key = process.env.OPENAI_API_KEY
  const timeout = createTimeoutSignal()

  try {
    const response = await fetch(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0,
          max_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: timeout.signal,
      }
    )

    const rawText = await response.text()

    let result

    try {
      result = rawText
        ? JSON.parse(rawText)
        : {}
    } catch {
      result = {}
    }

    if (!response.ok) {
      throw new AIServiceError(
        result?.error?.message ||
          'OpenAI vision request failed.',
        {
          code: 'AI_VISION_PROVIDER_ERROR',
          statusCode: 503,
        }
      )
    }

    const text =
      result?.choices?.[0]?.message?.content

    if (
      typeof text !== 'string' ||
      !text.trim()
    ) {
      throw new AIServiceError(
        'AI vision returned no readable text.',
        {
          code: 'AI_EMPTY_VISION_RESPONSE',
          statusCode: 503,
        }
      )
    }

    return text.trim()
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AIServiceError(
        'AI vision request timed out. Please retry.',
        {
          code: 'AI_TIMEOUT',
          statusCode: 503,
          cause: error,
        }
      )
    }

    if (error instanceof AIServiceError) {
      throw error
    }

    throw new AIServiceError(
      'AI vision service is temporarily unavailable.',
      {
        code: 'AI_VISION_UNAVAILABLE',
        statusCode: 503,
        cause: error,
      }
    )
  } finally {
    timeout.clear()
  }
}

/* ========================================================================= */
/* DEFAULT EXPORT                                                            */
/* ========================================================================= */

export default {
  complete,
  completeJSON,

  generateCleanNotes,
  generatePointwiseSummary,
  generateExplanation,
  generateFlashcards,
  generateQuiz,

  generateSubtopicQuiz,
  generateTopicExamQuiz,
  generateSkillCalibrationQuiz,
  generateCoreCsQuiz,

  generateConceptMap,
  generateInterviewQuestions,

  retrieveRelevantChunks,
  answerFromDocument,

  askPrepAI,

  generateRoleBlueprint,

  extractTextFromImage,

  getProviderStatus,
}