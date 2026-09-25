import RoleBlueprint from '../models/RoleBlueprint.js'
import AppError from '../utils/AppError.js'

export async function getUserBlueprint(userId) {
  const blueprint = await RoleBlueprint.findOne({ user: userId })

  if (!blueprint) {
    throw new AppError(
      'Career blueprint not found. Complete AI onboarding first.',
      400,
      { code: 'BLUEPRINT_MISSING' }
    )
  }

  return blueprint
}

/**
 * Flattens the blueprint roadmap into plain topic objects, always guaranteeing
 * that `subtopics` (names) and `subtopicDetails` agree with each other.
 */
export function getBlueprintTopics(blueprint) {
  return (blueprint.roadmap || []).map((topic, index) => {
    const value =
      typeof topic.toObject === 'function' ? topic.toObject() : topic

    const details = value.subtopicDetails || []
    const subtopics = details.length
      ? details.map((item) => item.name)
      : value.subtopics || []

    return {
      ...value,
      order: index + 1,
      key: value.key,
      title: value.title,
      stage: value.stage,
      track: value.track || 'learn',
      difficulty: value.difficulty || 'beginner',
      description: value.description || '',
      subtopics,
      subtopicDetails: details,
      prerequisites: value.prerequisites || [],
      importance: value.importance ?? 5,
      estimatedHours: value.estimatedHours ?? 1,
    }
  })
}
