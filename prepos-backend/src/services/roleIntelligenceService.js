import RoleBlueprint from '../models/RoleBlueprint.js'
import { completeJSON } from './aiService.js'
import {
  selectCoreCsTopics,
  getDsaTopics,
  getProjectTopic,
  getCareerTopics,
  resourceWithUrl,
} from './curriculum/index.js'

/* ========================================================================= */
/* Validation of the AI outline                                              */
/* ========================================================================= */

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function validateItem(item, path) {
  if (!item || typeof item !== 'object') {
    throw new Error(`Invalid AI object at ${path}`)
  }

  if (!String(item.name || '').trim()) {
    throw new Error(`Missing name at ${path}`)
  }

  if (
    item.priority !== undefined &&
    (
      Number.isNaN(Number(item.priority)) ||
      Number(item.priority) < 1 ||
      Number(item.priority) > 10
    )
  ) {
    throw new Error(`Invalid priority at ${path}`)
  }
}

function validateBlueprint(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('AI returned an invalid blueprint.')
  }

  if (!String(data.normalizedRole || '').trim()) {
    throw new Error('AI blueprint is missing normalizedRole.')
  }

  if (!String(data.summary || '').trim()) {
    throw new Error('AI blueprint is missing summary.')
  }

  const arrays = [
    'technologies',
    'skills',
    'csSubjects',
    'interviewAreas',
    'projectRequirements',
    'roadmap',
  ]

  for (const field of arrays) {
    if (!Array.isArray(data[field])) {
      throw new Error(`AI blueprint field "${field}" must be an array.`)
    }
  }

  for (const field of arrays.filter((x) => x !== 'roadmap')) {
    data[field].forEach((item, index) => {
      validateItem(item, `${field}[${index}]`)
    })
  }

  if (!data.dsa || typeof data.dsa !== 'object') {
    throw new Error('AI blueprint DSA section is missing.')
  }

  if (!Array.isArray(data.dsa.patterns)) {
    throw new Error('AI blueprint DSA patterns must be an array.')
  }

  data.dsa.patterns.forEach((item, index) => {
    validateItem(item, `dsa.patterns[${index}]`)
  })

  if (!data.assessmentPlan) {
    throw new Error('AI blueprint assessmentPlan is missing.')
  }

  if (!Array.isArray(data.assessmentPlan.skills)) {
    throw new Error('assessmentPlan.skills must be an array.')
  }

  if (!Array.isArray(data.assessmentPlan.csSubjects)) {
    throw new Error('assessmentPlan.csSubjects must be an array.')
  }

  if (!Array.isArray(data.assessmentPlan.dsaPatterns)) {
    throw new Error('assessmentPlan.dsaPatterns must be an array.')
  }

  // Normalize roadmap keys BEFORE duplicate validation.
  const roadmapKeys = new Set()

  for (const [index, topic] of data.roadmap.entries()) {
    if (!topic || typeof topic !== 'object') {
      throw new Error(`Invalid roadmap item at roadmap[${index}].`)
    }

    topic.key = slugify(topic.key || topic.title)

    if (!topic.key) {
      throw new Error(`Roadmap item ${index} has no valid key.`)
    }

    if (!String(topic.title || '').trim()) {
      throw new Error(`Roadmap item ${index} has no title.`)
    }

    if (!String(topic.stage || '').trim()) {
      throw new Error(`Roadmap item ${index} has no stage.`)
    }

    if (roadmapKeys.has(topic.key)) {
      let n = 2
      while (roadmapKeys.has(`${topic.key}-${n}`)) n += 1
      topic.key = `${topic.key}-${n}`
    }

    roadmapKeys.add(topic.key)

    topic.prerequisites = Array.isArray(topic.prerequisites)
      ? topic.prerequisites.map(slugify).filter(Boolean)
      : []

    topic.subtopics = Array.isArray(topic.subtopics)
      ? topic.subtopics.map(String).map((x) => x.trim()).filter(Boolean)
      : []

    topic.estimatedHours = Number(topic.estimatedHours || 0)

    if (topic.estimatedHours <= 0) {
      throw new Error(
        `Roadmap topic "${topic.key}" must have estimatedHours > 0.`
      )
    }
  }

  // Repair prerequisites: drop unknown / self references.
  for (const topic of data.roadmap) {
    topic.prerequisites = [...new Set(topic.prerequisites)].filter(
      (prerequisite) => roadmapKeys.has(prerequisite) && prerequisite !== topic.key
    )
  }

  // Break prerequisite cycles by removing the back-edge (never fail onboarding).
  const graph = new Map(
    data.roadmap.map((topic) => [topic.key, topic])
  )

  const state = new Map()

  function visit(key) {
    state.set(key, 'visiting')
    const topic = graph.get(key)

    topic.prerequisites = topic.prerequisites.filter((prerequisite) => {
      if (state.get(prerequisite) === 'visiting') return false
      if (!state.has(prerequisite)) visit(prerequisite)
      return true
    })

    state.set(key, 'done')
  }

  for (const key of graph.keys()) {
    if (!state.has(key)) visit(key)
  }

  // Validate assessment references.
  const skillNames = new Set(
    data.skills.map((item) => String(item.name).trim().toLowerCase())
  )

  const csNames = new Set(
    data.csSubjects.map((item) => String(item.name).trim().toLowerCase())
  )

  const dsaNames = new Set(
    data.dsa.patterns.map((item) => String(item.name).trim().toLowerCase())
  )

  // Repair (don't reject) assessment references the model got slightly wrong.
  const keepKnown = (list, known) =>
    list.filter((name) => known.has(String(name).trim().toLowerCase()))

  data.assessmentPlan.skills = keepKnown(data.assessmentPlan.skills, skillNames)
  data.assessmentPlan.csSubjects = keepKnown(data.assessmentPlan.csSubjects, csNames)
  data.assessmentPlan.dsaPatterns = keepKnown(data.assessmentPlan.dsaPatterns, dsaNames)

  return data
}


const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert']

function normalizeOutlineRoadmap(data) {
  const stageOrder = new Map()

  data.roadmap.forEach((topic) => {
    topic.difficulty = DIFFICULTIES.includes(String(topic.difficulty).toLowerCase())
      ? String(topic.difficulty).toLowerCase()
      : 'beginner'

    topic.importance = Math.min(10, Math.max(1, Number(topic.importance) || 5))
    topic.title = String(topic.title).trim()
    topic.stage = String(topic.stage).trim()
    topic.description = String(topic.description || '').trim()
    topic.track = 'learn'
    topic.detailed = false

    if (!stageOrder.has(topic.stage)) stageOrder.set(topic.stage, stageOrder.size + 1)
    topic.stageOrder = stageOrder.get(topic.stage)
  })

  return data
}

/* ========================================================================= */
/* Outline generation (fast: one AI call)                                    */
/* ========================================================================= */

const ITEM = {
  name: 'string',
  category: 'string',
  priority: 'number 1-10',
  why: 'string',
  prerequisites: ['string'],
}

const OUTLINE_SCHEMA = {
  normalizedRole: 'string',
  category: 'string',
  summary: 'string (3-4 sentences: what this role does day to day)',
  careerOutcome: 'string (1-2 sentences: what the learner can do after completing the roadmap)',
  technologies: [ITEM],
  skills: [ITEM],
  csSubjects: [ITEM],
  dsa: {
    required: 'boolean',
    importance: 'number 1-10',
    patterns: [ITEM],
    difficultyRange: ['Easy | Medium | Hard'],
  },
  interviewAreas: [ITEM],
  projectRequirements: [ITEM],
  roadmap: [
    {
      key: 'unique-stable-slug',
      title: 'string',
      stage: 'string (phase name, e.g. "Phase 1 · Programming Foundations")',
      description: 'string (2 sentences)',
      prerequisites: ['roadmap-key'],
      estimatedHours: 'number',
      importance: 'number 1-10',
      difficulty: 'beginner | intermediate | advanced | expert',
    },
  ],
  assessmentPlan: {
    skills: ['skill name'],
    csSubjects: ['CS subject name'],
    dsaPatterns: ['DSA pattern name'],
  },
}

export async function generateRoleBlueprint(requestedRole) {
  const role = String(requestedRole || '').trim()

  if (!role) throw new Error('Target role is required.')

  const prompt = `
You are the Career Intelligence Engine for PrepOS, an adaptive career-preparation
platform for technical students.

Target career role: "${role}"

Design the ROLE-SPECIFIC LEARNING ROADMAP that takes a complete beginner (assume
basic computer literacy only) all the way to being JOB-READY for this role.

Requirements for "roadmap":
- 16 to 26 topics, ordered from absolute basics to advanced/job-ready depth.
- Group them into 5-8 phases using the "stage" field
  (e.g. "Phase 1 · Programming Foundations", "Phase 2 · Core Web", ...).
- Cover EVERYTHING this role genuinely needs: languages, frameworks, tools, testing,
  deployment, security, cloud, version control — whatever applies to "${role}".
- Do NOT fix a stack unless the role implies it. Be role-specific, never generic MERN.
- Do NOT include these — PrepOS adds them automatically as curated tracks:
  OOP / DBMS / Operating Systems / Computer Networks / System Design theory,
  Data Structures & Algorithms, portfolio projects, resume/LinkedIn, interview
  preparation, and job search.
- Each topic needs a stable unique "key" slug, realistic "estimatedHours" for a
  beginner (typically 8-45), an "importance" 1-10 and a "difficulty".
- "prerequisites" must reference other roadmap keys only, and must not form cycles.
  Prefer few prerequisites — only real hard dependencies.

Other sections:
- technologies / skills: what the role uses, with priority.
- csSubjects: the CS theory this role needs (e.g. "Object-Oriented Programming",
  "Database Management Systems", "Operating Systems", "Computer Networks",
  "System Design") plus any role-specific theory (e.g. "Machine Learning Mathematics").
- dsa: whether DSA is asked in interviews for this role and how much (importance 1-10).
- interviewAreas and projectRequirements: what interviews and portfolios for this
  role actually test.
- assessmentPlan entries must copy names from skills / csSubjects / dsa.patterns.

Do not invent employers, vacancies or certifications. Do not claim the user knows anything.

Return ONLY JSON matching:
${JSON.stringify(OUTLINE_SCHEMA, null, 2)}
`

  const result = await completeJSON(prompt, {
    temperature: 0.2,
    maxOutputTokens: 8000,
  })

  return normalizeOutlineRoadmap(validateBlueprint(result))
}

/* ========================================================================= */
/* Assembly: AI topics + curated tracks -> one ordered roadmap               */
/* ========================================================================= */

const clone = (value) => JSON.parse(JSON.stringify(value))

const toPlain = (topic) =>
  typeof topic?.toObject === 'function' ? topic.toObject() : clone(topic)

/**
 * Builds (or upgrades) the complete roadmap.
 *
 * `existing` is the current roadmap array: on first generation these are just the
 * AI "learn" topics; on upgrade they may already contain curated tracks, which are
 * preserved (with their details) rather than duplicated.
 */
export function composeRoadmap(existing, context = {}) {
  const {
    role = '',
    csSubjects = [],
    dsaRequired = true,
    dsaImportance = 5,
  } = context

  const all = (existing || []).map(toPlain)
  const byTrack = (track) => all.filter((t) => (t.track || 'learn') === track)

  const learn = byTrack('learn')
  const have = new Set(all.map((t) => t.key))

  let coreCs = byTrack('core-cs')
  if (!coreCs.length) coreCs = selectCoreCsTopics({ csSubjects, role })

  let dsa = byTrack('dsa')
  if (!dsa.length && (dsaRequired || dsaImportance >= 5)) dsa = getDsaTopics()

  const project = byTrack('project')
  if (!project.length) project.push(getProjectTopic())

  const careerAll = [...byTrack('interview'), ...byTrack('career')]
  const careerByKey = new Map(careerAll.map((t) => [t.key, t]))
  const curatedCareer = getCareerTopics().map((t) => careerByKey.get(t.key) || t)
  const extraCareer = careerAll.filter(
    (t) => !curatedCareer.some((c) => c.key === t.key)
  )
  const career = [...curatedCareer, ...extraCareer]

  // Core CS is learned after the first ~45% of the role's technical topics.
  const split = learn.length ? Math.max(1, Math.round(learn.length * 0.45)) : 0

  const ordered = [
    ...learn.slice(0, split),
    ...coreCs,
    ...learn.slice(split),
    ...dsa,
    ...project,
    ...career,
  ]

  // Curated topics that were freshly added get sensible cross-track prerequisites.
  const learnKeys = learn.map((t) => t.key)
  const lastLearn = learnKeys.slice(-2)

  for (const t of ordered) {
    if (have.has(t.key)) continue
    if (t.key === 'career-portfolio-projects') t.prerequisites = lastLearn
    if (t.key === 'interview-technical' && dsa.length) t.prerequisites = ['dsa-arrays-strings']
  }

  const keys = new Set(ordered.map((t) => t.key))
  const stageOrder = new Map()

  ordered.forEach((t, index) => {
    t.prerequisites = (t.prerequisites || []).filter((k) => keys.has(k) && k !== t.key)
    t.track = t.track || 'learn'
    if (!stageOrder.has(t.stage)) stageOrder.set(t.stage, stageOrder.size + 1)
    t.stageOrder = stageOrder.get(t.stage)
    t.order = index + 1
  })

  return ordered
}

/* ========================================================================= */
/* Detail expansion (slow: batched AI calls, run in the background)          */
/* ========================================================================= */

const BATCH_SIZE = 3
const CONCURRENCY = 3
const running = new Set()

function cleanStrings(list, { max = 8, min = 0, maxLen = 140 } = {}) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []

  for (const item of list) {
    const text = String(item ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
    if (!text || seen.has(text.toLowerCase())) continue
    seen.add(text.toLowerCase())
    out.push(text)
    if (out.length >= max) break
  }

  return out.length >= min ? out : []
}

export function normalizeTopicDetail(raw, topic) {
  if (!raw || typeof raw !== 'object') return null

  const seen = new Set()
  const subs = []

  for (const item of Array.isArray(raw.subtopics) ? raw.subtopics : []) {
    const name = String(item?.name || '').replace(/\s+/g, ' ').trim().slice(0, 120)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())

    subs.push({
      name,
      summary: String(item.summary || '').trim().slice(0, 300),
      estimatedHours: Math.min(8, Math.max(0.5, Number(item.estimatedHours) || 1)),
      concepts: cleanStrings(item.concepts, { max: 9 }),
      practice: cleanStrings(item.practice, { max: 3, maxLen: 200 }),
    })
    if (subs.length >= 10) break
  }

  if (subs.length < 3) return null

  // Keep total effort consistent with the outline so deadline maths stays valid.
  const target = Number(topic.estimatedHours) || subs.length * 2
  const sum = subs.reduce((s, x) => s + x.estimatedHours, 0) || 1
  const factor = target / sum

  subs.forEach((s) => {
    s.estimatedHours = Math.max(0.5, Math.round(s.estimatedHours * factor * 2) / 2)
  })

  const resources = (Array.isArray(raw.resources) ? raw.resources : [])
    .filter((r) => r && String(r.title || '').trim())
    .slice(0, 4)
    .map((r) => resourceWithUrl({
      title: String(r.title).trim().slice(0, 140),
      type: String(r.type || 'article').toLowerCase(),
      query: String(r.query || r.title).trim().slice(0, 140),
    }))

  return {
    subtopicDetails: subs,
    subtopics: subs.map((s) => s.name),
    estimatedHours: Math.round(subs.reduce((s, x) => s + x.estimatedHours, 0) * 2) / 2,
    outcomes: cleanStrings(raw.outcomes, { max: 5, maxLen: 200 }),
    resources,
    miniProject: String(raw.miniProject || '').trim().slice(0, 400),
    interviewFocus: cleanStrings(raw.interviewFocus, { max: 6, maxLen: 200 }),
    detailed: true,
  }
}

async function expandBatch(role, batch) {
  const prompt = `
You are a senior mentor building a detailed curriculum for someone becoming a
"${role}" who starts from ZERO in each topic below.

Expand EVERY topic into a thorough, ordered learning plan.

Topics:
${JSON.stringify(
    batch.map((t) => ({
      key: t.key,
      title: t.title,
      description: t.description,
      estimatedHours: t.estimatedHours,
    })),
    null,
    2
  )}

For each topic return:
- "outcomes": 3-5 things the learner can DO afterwards.
- "subtopics": 6-9 ordered subtopics (from basics to advanced). Each has:
    "name" (unique, specific, <= 8 words),
    "summary" (one sentence),
    "estimatedHours" (0.5-6),
    "concepts": 4-8 concrete sub-points to learn inside that subtopic,
    "practice": 1-2 hands-on exercises.
- "resources": 2-4 items {"title","type": "documentation|video|course|article|book|practice","query": "a web search query that finds it"}. NEVER include URLs.
- "miniProject": one small project that proves the topic.
- "interviewFocus": 3-5 questions/areas interviewers ask about this topic.

Sum of subtopic hours should roughly equal the topic's estimatedHours.

Return ONLY JSON:
{
  "topics": [
    {
      "key": "same key as input",
      "outcomes": ["string"],
      "subtopics": [
        { "name": "string", "summary": "string", "estimatedHours": 1.5, "concepts": ["string"], "practice": ["string"] }
      ],
      "resources": [ { "title": "string", "type": "video", "query": "string" } ],
      "miniProject": "string",
      "interviewFocus": ["string"]
    }
  ]
}
`

  const result = await completeJSON(prompt, {
    temperature: 0.3,
    maxOutputTokens: 8000,
  })

  const list = Array.isArray(result?.topics) ? result.topics : []
  const byKey = new Map(list.map((t) => [String(t?.key || '').toLowerCase(), t]))

  return batch.map((topic) => ({
    topic,
    detail: normalizeTopicDetail(byKey.get(topic.key), topic),
  }))
}

async function setDetailState(blueprintId, patch) {
  const $set = { 'detail.updatedAt': new Date() }
  for (const [k, v] of Object.entries(patch)) $set[`detail.${k}`] = v
  await RoleBlueprint.updateOne({ _id: blueprintId }, { $set })
}

async function saveTopicDetail(blueprintId, key, detail) {
  await RoleBlueprint.updateOne(
    { _id: blueprintId, 'roadmap.key': key },
    {
      $set: {
        'roadmap.$.subtopicDetails': detail.subtopicDetails,
        'roadmap.$.subtopics': detail.subtopics,
        'roadmap.$.estimatedHours': detail.estimatedHours,
        'roadmap.$.outcomes': detail.outcomes,
        'roadmap.$.resources': detail.resources,
        'roadmap.$.miniProject': detail.miniProject,
        'roadmap.$.interviewFocus': detail.interviewFocus,
        'roadmap.$.detailed': true,
      },
    }
  )
}

/**
 * Expands every not-yet-detailed topic. Safe to call repeatedly: it only works
 * on topics still missing detail, so it doubles as the "resume" operation.
 * Never throws — failures are recorded on blueprint.detail.
 */
export async function expandBlueprintDetails(userId) {
  const key = String(userId)
  if (running.has(key)) return { alreadyRunning: true }
  running.add(key)

  let blueprint = null

  try {
    blueprint = await RoleBlueprint.findOne({ user: userId })
    if (!blueprint) return { missing: true }

    const pending = blueprint.roadmap.filter((t) => !t.detailed)
    const total = blueprint.roadmap.length

    if (!pending.length) {
      await setDetailState(blueprint._id, { status: 'ready', total, done: total, error: '' })
      return { status: 'ready' }
    }

    await setDetailState(blueprint._id, {
      status: 'expanding',
      total,
      done: total - pending.length,
      error: '',
    })

    const role = blueprint.normalizedRole
    const batches = []
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      batches.push(pending.slice(i, i + BATCH_SIZE).map(toPlain))
    }

    let done = total - pending.length
    let lastError = ''
    let cursor = 0

    const worker = async () => {
      while (cursor < batches.length) {
        const batch = batches[cursor]
        cursor += 1

        let results = null

        for (let attempt = 0; attempt < 2 && !results; attempt += 1) {
          try {
            results = await expandBatch(role, batch)
          } catch (error) {
            lastError = error.message || 'AI expansion failed.'
          }
        }

        for (const { topic, detail } of results || []) {
          if (!detail) continue
          await saveTopicDetail(blueprint._id, topic.key, detail)
          done += 1
        }

        await setDetailState(blueprint._id, { done, error: lastError })
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))

    const remaining = total - done
    await setDetailState(blueprint._id, {
      status: remaining === 0 ? 'ready' : done > total - pending.length ? 'partial' : 'failed',
      done,
      error: remaining === 0 ? '' : lastError,
    })

    return { status: remaining === 0 ? 'ready' : 'partial', done, total }
  } catch (error) {
    console.error('[roadmap] expansion crashed:', error.message)
    if (blueprint) {
      await setDetailState(blueprint._id, { status: 'failed', error: error.message }).catch(() => {})
    }
    return { status: 'failed', error: error.message }
  } finally {
    running.delete(key)
  }
}

export function isExpanding(userId) {
  return running.has(String(userId))
}
