import { completeJSON } from './aiService.js'

export const CATEGORIES = [
  'Technical',
  'DSA',
  'CS Fundamentals',
  'System Design',
  'Project',
  'Behavioral',
]
export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const list = (v, max, n = 200) =>
  (Array.isArray(v) ? v : []).map((x) => clip(x, n)).filter(Boolean).slice(0, max)

/**
 * Generates a role-specific interview question set grounded in the learner's
 * blueprint (interview areas, skills, CS subjects) and weak topics.
 */
export async function generateInterviewSet({
  role,
  categories,
  difficulty,
  count,
  blueprint,
  weakTopics = [],
  projects = [],
}) {
  const areas = (blueprint?.interviewAreas || []).map((a) => a.name).slice(0, 12)
  const skills = (blueprint?.skills || []).map((a) => a.name).slice(0, 15)
  const cs = (blueprint?.csSubjects || []).map((a) => a.name).slice(0, 8)
  const patterns = (blueprint?.dsa?.patterns || []).map((a) => a.name).slice(0, 8)

  const result = await completeJSON(
    `
You are a senior interviewer at a product company interviewing a fresher for the role: "${role}".

Create exactly ${count} interview questions.

Categories to draw from (spread evenly): ${categories.join(', ')}
Difficulty: ${difficulty}

Context about this role (use it to make questions realistic):
- Interview areas: ${areas.join(', ') || 'general'}
- Key skills: ${skills.join(', ') || 'general'}
- CS subjects: ${cs.join(', ') || 'general'}
- DSA patterns: ${patterns.join(', ') || 'general'}
${weakTopics.length ? `- The candidate is weak in: ${weakTopics.join(', ')} (include some questions here)` : ''}
${projects.length ? `- The candidate's projects: ${projects.join('; ')} (use for Project questions)` : ''}

Rules:
- Questions must be answerable in speech/text without running code.
- DSA questions: ask to explain an approach + complexity, not to write 50 lines of code.
- Behavioral questions should be answerable with the STAR method.
- No duplicates, no yes/no questions.

Return ONLY JSON:
{
  "questions": [
    {
      "category": "one of: ${CATEGORIES.join(' | ')}",
      "difficulty": "Beginner | Intermediate | Advanced",
      "question": "string",
      "expectedAreas": ["key points a strong answer covers (3-5)"],
      "evaluationCriteria": ["how to judge it (2-3)"],
      "tags": ["1-3 short tags"]
    }
  ]
}
`,
    { temperature: 0.5, maxOutputTokens: 6000 }
  )

  const questions = (Array.isArray(result?.questions) ? result.questions : [])
    .map((q) => ({
      category: CATEGORIES.includes(q?.category) ? q.category : categories[0],
      difficulty: DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : difficulty,
      question: clip(q?.question, 600),
      expectedAreas: list(q?.expectedAreas, 6),
      evaluationCriteria: list(q?.evaluationCriteria, 4),
      tags: list(q?.tags, 3, 40),
    }))
    .filter((q) => q.question.length > 10)

  if (questions.length < Math.min(3, count)) {
    throw new Error('The AI returned too few valid interview questions. Please retry.')
  }

  return questions.slice(0, count)
}

/** Grades one answer like a strict-but-fair interviewer and coaches the candidate. */
export async function evaluateAnswer({ role, question, answer }) {
  const result = await completeJSON(
    `
You are a strict but supportive interviewer for a "${role}" fresher role.

Question (${question.category}, ${question.difficulty}):
${question.question}

A strong answer covers: ${(question.expectedAreas || []).join('; ') || 'correct, clear, complete reasoning'}
Judging criteria: ${(question.evaluationCriteria || []).join('; ') || 'accuracy, depth, clarity'}

Candidate's answer:
"""
${clip(answer, 4000)}
"""

Score honestly 0-100 (0-30 wrong/empty, 31-55 partial, 56-75 acceptable, 76-90 strong, 91-100 exceptional).
Do NOT reward length or buzzwords. Penalise factual errors.

Return ONLY JSON:
{
  "score": 0,
  "feedback": "2-3 sentences, direct, addressed to the candidate",
  "strengths": ["what they did well (0-3)"],
  "improvements": ["specific, actionable fixes (1-3)"],
  "idealAnswer": "a concise model answer (4-7 sentences)"
}
`,
    { temperature: 0.2, maxOutputTokens: 2500 }
  )

  const score = Math.round(Number(result?.score))
  if (!Number.isFinite(score)) throw new Error('The AI evaluation was malformed. Please retry.')

  return {
    score: Math.min(100, Math.max(0, score)),
    feedback: clip(result.feedback, 800),
    strengths: list(result.strengths, 3),
    improvements: list(result.improvements, 3),
    idealAnswer: clip(result.idealAnswer, 1500),
  }
}

/** Overall coaching report for a completed session. */
export async function summarizeSession({ role, items, overallScore }) {
  const result = await completeJSON(
    `
You are an interview coach. A candidate for "${role}" just finished a mock interview
with an overall score of ${overallScore}/100.

Per-question results:
${JSON.stringify(
      items.map((i) => ({
        category: i.category,
        question: i.question,
        score: i.score,
        improvements: i.improvements,
      })),
      null,
      2
    )}

Return ONLY JSON:
{
  "summary": "3-4 honest sentences on performance",
  "strengths": ["up to 3"],
  "weakAreas": ["up to 4, specific topics to study"],
  "nextSteps": ["3 concrete actions for the coming week"]
}
`,
    { temperature: 0.3, maxOutputTokens: 1500 }
  )

  return {
    summary: clip(result?.summary, 900),
    strengths: list(result?.strengths, 3),
    weakAreas: list(result?.weakAreas, 4),
    nextSteps: list(result?.nextSteps, 3),
  }
}
