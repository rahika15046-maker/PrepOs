import UserTopicProgress from '../models/UserTopicProgress.js'
import {
  getUserBlueprint,
  getBlueprintTopics,
} from './careerBlueprintService.js'

/** A prerequisite unlocks the next topic at this verified-progress level. */
export const UNLOCK_THRESHOLD = 60

export function isPrerequisiteMet(progress) {
  return (
    progress?.status === 'completed' ||
    Number(progress?.progress || 0) >= UNLOCK_THRESHOLD
  )
}

export async function markSubtopicComplete(userId, topicKey, subtopic) {
  const blueprint = await getUserBlueprint(userId)
  const topic = getBlueprintTopics(blueprint).find((t) => t.key === topicKey)

  if (!topic || !topic.subtopics.includes(subtopic)) return null

  const existing = await UserTopicProgress.findOne({ user: userId, topicKey })
  const completed = new Set(existing?.completedSubtopics || [])
  completed.add(subtopic)

  const completedSubtopics = [...completed].filter((name) => topic.subtopics.includes(name))
  const total = topic.subtopics.length || 1
  const progress = Math.min(100, Math.round((completedSubtopics.length / total) * 100))

  // Every subtopic was individually quiz-verified, so 100% is genuine completion.
  return UserTopicProgress.findOneAndUpdate(
    { user: userId, topicKey },
    {
      completedSubtopics,
      progress,
      confidence: existing?.confidence ?? 0,
      status: progress >= 100 ? 'completed' : existing?.status === 'weak' ? 'current' : 'current',
      lastStudiedAt: new Date(),
    },
    { upsert: true, new: true, runValidators: true }
  )
}

export async function prerequisitesMet(userId, topic) {
  if (!topic.prerequisites?.length) return true

  const rows = await UserTopicProgress.find({
    user: userId,
    topicKey: { $in: topic.prerequisites },
  })
  const byKey = Object.fromEntries(rows.map((r) => [r.topicKey, r]))

  return topic.prerequisites.every((key) => isPrerequisiteMet(byKey[key]))
}
