/** Compact builders for the curated curriculum. */

export const S = (name, hours, summary, concepts, practice = []) => ({
  name,
  estimatedHours: hours,
  summary,
  concepts,
  practice,
})

export const R = (title, type, query) => ({ title, type, query })

export function topic(def) {
  const subtopicDetails = def.subtopicDetails
  const estimatedHours = Math.round(
    subtopicDetails.reduce((sum, s) => sum + s.estimatedHours, 0) * 2
  ) / 2

  return {
    prerequisites: [],
    outcomes: [],
    resources: [],
    interviewFocus: [],
    miniProject: '',
    difficulty: 'intermediate',
    importance: 7,
    ...def,
    estimatedHours,
    subtopics: subtopicDetails.map((s) => s.name),
    detailed: true,
  }
}
