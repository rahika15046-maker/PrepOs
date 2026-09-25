import UserTopicProgress from '../models/UserTopicProgress.js'
import UserProfile from '../models/UserProfile.js'
import catchAsync from '../utils/catchAsync.js'
import { getUserBlueprint, getBlueprintTopics } from '../services/careerBlueprintService.js'
import { isPrerequisiteMet, UNLOCK_THRESHOLD } from '../services/topicProgressService.js'
import { isExpanding } from '../services/roleIntelligenceService.js'

export function buildNodes(topics, progressRows) {
  const byKey = Object.fromEntries(progressRows.map((p) => [p.topicKey, p]))

  return topics.map((topic) => {
    const p = byKey[topic.key]
    const unlocked = (topic.prerequisites || []).every((k) => isPrerequisiteMet(byKey[k]))

    let status = p?.status
    if (!status || status === 'locked' || status === 'upcoming') {
      status = unlocked ? 'current' : 'locked'
    }
    if (status === 'current' && !unlocked && !p?.progress) status = 'locked'

    const total = topic.subtopics.length
    const done = (p?.completedSubtopics || []).filter((s) => topic.subtopics.includes(s)).length

    return {
      key: topic.key,
      title: topic.title,
      stage: topic.stage,
      stageOrder: topic.stageOrder || 0,
      track: topic.track,
      difficulty: topic.difficulty,
      description: topic.description,
      importance: topic.importance,
      estimatedHours: topic.estimatedHours,
      prerequisites: topic.prerequisites,
      unlockedBy: (topic.prerequisites || []).map((k) => {
        const req = topics.find((t) => t.key === k)
        return { key: k, title: req?.title || k, met: isPrerequisiteMet(byKey[k]) }
      }),
      subtopics: topic.subtopics,
      subtopicDetails: topic.subtopicDetails,
      outcomes: topic.outcomes || [],
      resources: topic.resources || [],
      miniProject: topic.miniProject || '',
      interviewFocus: topic.interviewFocus || [],
      catalogTopic: topic.catalogTopic || null,
      detailed: Boolean(topic.detailed),
      status,
      progress: p?.progress || 0,
      confidence: p?.confidence || 0,
      quizScore: p?.quizScore ?? null,
      studiedHours: Math.round(((p?.studiedMinutes || 0) / 60) * 10) / 10,
      completedSubtopics: p?.completedSubtopics || [],
      completedConcepts: p?.completedConcepts || [],
      subtopicsDone: done,
      subtopicsTotal: total,
    }
  })
}

export const getRoadmap = catchAsync(async (req, res) => {
  const [profile, blueprint, progress] = await Promise.all([
    UserProfile.findOne({ user: req.user._id }).lean(),
    getUserBlueprint(req.user._id),
    UserTopicProgress.find({ user: req.user._id }).lean(),
  ])

  const topics = getBlueprintTopics(blueprint)
  const nodes = buildNodes(topics, progress)

  const phases = []
  for (const node of nodes) {
    let phase = phases.find((p) => p.name === node.stage)
    if (!phase) {
      phase = { name: node.stage, order: node.stageOrder, topicKeys: [], hours: 0, subtopicsDone: 0, subtopicsTotal: 0 }
      phases.push(phase)
    }
    phase.topicKeys.push(node.key)
    phase.hours += node.estimatedHours || 0
    phase.subtopicsDone += node.subtopicsDone
    phase.subtopicsTotal += node.subtopicsTotal
  }
  phases.forEach((p) => {
    p.progress = p.subtopicsTotal ? Math.round((p.subtopicsDone / p.subtopicsTotal) * 100) : 0
    p.hours = Math.round(p.hours)
  })

  const stats = nodes.reduce(
    (a, n) => ({
      topics: a.topics + 1,
      completed: a.completed + (n.status === 'completed' ? 1 : 0),
      subtopicsTotal: a.subtopicsTotal + n.subtopicsTotal,
      subtopicsDone: a.subtopicsDone + n.subtopicsDone,
      hoursTotal: a.hoursTotal + (n.estimatedHours || 0),
      hoursStudied: a.hoursStudied + n.studiedHours,
    }),
    { topics: 0, completed: 0, subtopicsTotal: 0, subtopicsDone: 0, hoursTotal: 0, hoursStudied: 0 }
  )
  stats.hoursTotal = Math.round(stats.hoursTotal)
  stats.overallProgress = stats.subtopicsTotal
    ? Math.round((stats.subtopicsDone / stats.subtopicsTotal) * 100)
    : 0

  const detail = blueprint.toObject().detail || {}
  const detailedCount = topics.filter((t) => t.detailed).length
  const legacy = topics.every((t) => !t.detailed) && topics.every((t) => t.track === 'learn')

  res.status(200).json({
    success: true,
    role: profile?.role || blueprint.normalizedRole,
    blueprintId: blueprint._id,
    blueprintVersion: blueprint.version,
    roleSummary: blueprint.summary,
    careerOutcome: blueprint.careerOutcome || '',
    technologies: (blueprint.technologies || []).map((t) => t.name),
    skills: (blueprint.skills || []).map((t) => t.name),
    dsaRequired: Boolean(blueprint.dsa?.required),
    dsaPriority: blueprint.dsa?.importance >= 7 ? 'high' : blueprint.dsa?.importance >= 4 ? 'medium' : 'low',
    unlockThreshold: UNLOCK_THRESHOLD,
    needsUpgrade: legacy,
    detail: {
      status: detail.status || 'pending',
      total: topics.length,
      done: detailedCount,
      error: detail.error || '',
      running: isExpanding(req.user._id),
    },
    phases,
    stats,
    nodes,
  })
})
