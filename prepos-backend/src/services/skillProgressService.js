import UserSkill from '../models/UserSkill.js'

/**
 * Maps a calibration quiz score to a level. This is what actually decides
 * the skill's level and progress — not whatever the person clicked in
 * onboarding or the Skills page. That claim only determines which
 * difficulty of quiz gets generated; passing (or not) it is what counts.
 */
export function levelFromScore(score) {
  if (score >= 85) return 'Strong'
  if (score >= 55) return 'Intermediate'
  if (score >= 25) return 'Beginner'
  return 'Never Learned'
}

export async function calibrateSkillFromQuiz(userId, skillName, score) {
  const level = levelFromScore(score)
  return UserSkill.findOneAndUpdate(
    { user: userId, skillName },
    { level, progress: score },
    { upsert: true, new: true }
  )
}
