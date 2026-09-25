const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase()

function getProviderModel() {
  if (PROVIDER === 'gemini') {
    return process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  }

  if (PROVIDER === 'openai') {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }

  throw new Error(
    `Unsupported AI_PROVIDER "${PROVIDER}". Use "gemini" or "openai".`
  )
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY

  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured.')
  }

  const model = getProviderModel()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
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
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const raw = await response.text()

  if (!response.ok) {
    throw new Error(
      `Gemini request failed (${response.status}): ${raw.slice(0, 500)}`
    )
  }

  let data

  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Gemini returned an invalid HTTP JSON response.')
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim() || ''

  if (!text) {
    throw new Error('Gemini returned an empty AI response.')
  }

  return {
    text,
    provider: 'gemini',
    model,
  }
}

async function callOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY

  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const baseUrl =
    process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

  const model = getProviderModel()

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content:
            'Return valid JSON only. Do not wrap JSON in markdown fences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const raw = await response.text()

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed (${response.status}): ${raw.slice(0, 500)}`
    )
  }

  let data

  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('OpenAI returned an invalid HTTP JSON response.')
  }

  const text =
    data?.choices?.[0]?.message?.content?.trim() || ''

  if (!text) {
    throw new Error('OpenAI returned an empty AI response.')
  }

  return {
    text,
    provider: 'openai',
    model,
  }
}

export async function generateAIText(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('AI prompt must be a non-empty string.')
  }

  if (PROVIDER === 'gemini') {
    return callGemini(prompt)
  }

  if (PROVIDER === 'openai') {
    return callOpenAI(prompt)
  }

  throw new Error(
    `AI_PROVIDER "${PROVIDER}" is not supported.`
  )
}

function stripMarkdownFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export async function generateAIJson(prompt) {
  const result = await generateAIText(prompt)

  const cleaned = stripMarkdownFence(result.text)

  let parsed

  try {
    parsed = JSON.parse(cleaned)
  } catch (error) {
    throw new Error(
      `AI returned invalid JSON: ${error.message}`
    )
  }

  return {
    data: parsed,
    provider: result.provider,
    model: result.model,
  }
}

export function getStrictAIProviderStatus() {
  const configured =
    PROVIDER === 'gemini'
      ? Boolean(process.env.GEMINI_API_KEY)
      : PROVIDER === 'openai'
        ? Boolean(process.env.OPENAI_API_KEY)
        : false

  return {
    provider: PROVIDER,
    model:
      PROVIDER === 'gemini' || PROVIDER === 'openai'
        ? getProviderModel()
        : null,
    configured,
    live: configured && PROVIDER !== 'mock',
  }
}