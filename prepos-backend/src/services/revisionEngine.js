/**
 * revisionEngine.js
 * -------------------------------------------------------------------------
 * Decides what deserves revision, and how urgently.
 *
 *   revisionPriority = timeSinceStudy + weakness + importance - confidence
 *
 * This is a heuristic, not a validated spaced-repetition model (e.g. SM-2) —
 * it is documented as such rather than oversold. It's good enough to keep
 * weak topics resurfacing at sensible intervals without a full review
 * scheduler.
 * -------------------------------------------------------------------------
 */

export function computeRevisionPriority({ lastStudiedAt, confidence = 50, importance = 5, quizScore }) {
  const daysSinceStudy = lastStudiedAt
    ? Math.min(30, Math.floor((Date.now() - new Date(lastStudiedAt)) / 86400000))
    : 15
  const weakness = 100 - confidence
  const quizPenalty = typeof quizScore === 'number' && quizScore < 60 ? (60 - quizScore) * 0.5 : 0

  const priorityScore = daysSinceStudy * 1.2 + weakness * 0.5 + importance * 2 + quizPenalty - confidence * 0.2

  return Math.round(priorityScore)
}

/**
 * Builds a ranked revision queue from a list of topic progress records.
 * records: [{ topicKey, title, lastStudiedAt, confidence, importance, quizScore }]
 */
export function buildRevisionQueue(records, limit = 10) {
  return records
    .map((r) => ({ ...r, priorityScore: computeRevisionPriority(r) }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit)
}

/**
 * Spaced schedule for a single freshly-identified weak topic, following the
 * "tomorrow / after 3 days / after 7 days" cadence described in the product
 * spec. Returns an array of { topicKey, offsetDays, label }.
 */
export function spacedRevisionPlan(topicKey, title) {
  return [
    { topicKey, offsetDays: 1, label: `${title} revision`, durationMinutes: 30 },
    { topicKey, offsetDays: 3, label: `${title} practice`, durationMinutes: 30 },
    { topicKey, offsetDays: 7, label: `${title} quiz`, durationMinutes: 20 },
  ]
}
