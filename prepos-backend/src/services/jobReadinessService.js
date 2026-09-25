import UserTopicProgress from '../models/UserTopicProgress.js'
import UserSkill from '../models/UserSkill.js'
import DSAProgress from '../models/DSAProgress.js'
import CoreCSProgress from '../models/CoreCSProgress.js'
import Project from '../models/Project.js'
import InterviewSession from '../models/InterviewSession.js'
import UserProfile from '../models/UserProfile.js'
import { getUserBlueprint, getBlueprintTopics } from './careerBlueprintService.js'

const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v))
const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

/** Hours-weighted average verified progress of a set of roadmap topics. */
function trackScore(topics, byKey) {
  const totalHours = topics.reduce((s, t) => s + (t.estimatedHours || 1), 0)
  if (!totalHours) return null
  return (
    topics.reduce((s, t) => {
      const p = byKey[t.key]
      const value = p?.status === 'completed' ? 100 : p?.progress || 0
      return s + value * (t.estimatedHours || 1)
    }, 0) / totalHours
  )
}

export function readinessLevel(score) {
  if (score >= 85) return 'Job ready'
  if (score >= 65) return 'Almost job ready'
  if (score >= 40) return 'Building momentum'
  if (score >= 15) return 'Learning the foundations'
  return 'Just getting started'
}

export async function calculateJobReadiness(userId) {
  const blueprint = await getUserBlueprint(userId)
  const topics = getBlueprintTopics(blueprint)

  const [progress, userSkills, dsaProgress, coreLegacy, projects, interviews, profile] = await Promise.all([
    UserTopicProgress.find({ user: userId }).lean(),
    UserSkill.find({ user: userId }).lean(),
    DSAProgress.find({ user: userId, solved: true }).lean(),
    CoreCSProgress.find({ user: userId }).lean(),
    Project.find({ user: userId }).lean(),
    InterviewSession.find({ user: userId, status: 'completed' }).sort({ completedAt: -1 }).limit(5).lean(),
    UserProfile.findOne({ user: userId }).lean(),
  ])

  const byKey = Object.fromEntries(progress.map((p) => [p.topicKey, p]))
  const trackTopics = (...tracks) => topics.filter((t) => tracks.includes(t.track))

  /* ---- Roadmap (role-specific learning) ---- */
  const roadmapScore = trackScore(trackTopics('learn'), byKey) ?? 0

  /* ---- Core CS ---- */
  const csTopics = trackTopics('core-cs')
  let coreScore = trackScore(csTopics, byKey)
  if (coreScore === null && coreLegacy.length) coreScore = avg(coreLegacy.map((c) => c.progress || 0))

  /* ---- DSA ---- */
  const dsaNeeded = Boolean(blueprint.dsa?.required) || (blueprint.dsa?.importance || 0) >= 5
  const leetSolved = profile?.leetcode?.stats?.totalSolved || 0
  const catalogSolved = dsaProgress.length
  const solvedTotal = Math.max(leetSolved, catalogSolved)
  const dsaTarget = (blueprint.dsa?.importance || 5) >= 7 ? 100 : 60
  const dsaTrack = trackScore(trackTopics('dsa'), byKey) ?? 0
  const dsaScore = clamp(0.6 * (solvedTotal / dsaTarget) * 100 + 0.4 * dsaTrack)

  /* ---- Skills (self-assessed then quiz-calibrated) ---- */
  const skillScore = userSkills.length ? avg(userSkills.map((s) => s.progress || 0)) : null

  /* ---- Projects ---- */
  const target = Math.min(3, Math.max(2, (blueprint.projectRequirements || []).length ? 2 : 2))
  const done = projects.filter((p) => p.status === 'Completed').length
  const building = projects.filter((p) => p.status === 'In Progress').length
  const projectScore = clamp(((done + building * 0.4) / target) * 100)

  /* ---- Interview performance (recent mocks) ---- */
  const mockScore = interviews.length ? avg(interviews.slice(0, 3).map((i) => i.overallScore || 0)) : 0

  /* ---- Career launch (resume, LinkedIn, applications, interview prep topics) ---- */
  const careerScore = trackScore(trackTopics('career', 'interview', 'project'), byKey) ?? 0

  const dimensions = [
    { key: 'roadmap', label: 'Role skills (roadmap)', weight: 0.30, score: roadmapScore, applicable: true,
      detail: `${Math.round(roadmapScore)}% of role-specific topics quiz-verified`, action: { label: 'Open roadmap', to: '/app/roadmap' } },
    { key: 'coreCs', label: 'Core CS', weight: 0.12, score: coreScore ?? 0, applicable: coreScore !== null,
      detail: csTopics.length ? `${csTopics.filter((t) => byKey[t.key]?.status === 'completed').length}/${csTopics.length} subjects completed` : 'Legacy subject tracking',
      action: { label: 'Study Core CS', to: '/app/core-cs' } },
    { key: 'dsa', label: 'DSA & problem solving', weight: 0.15, score: dsaScore, applicable: dsaNeeded,
      detail: `${solvedTotal} problems solved (target ${dsaTarget})`, action: { label: 'Practise DSA', to: '/app/dsa' } },
    { key: 'verifiedSkills', label: 'Verified skills', weight: 0.08, score: skillScore ?? 0, applicable: skillScore !== null,
      detail: `${userSkills.length} skills tracked`, action: { label: 'Calibrate skills', to: '/app/skills' } },
    { key: 'projects', label: 'Projects', weight: 0.10, score: projectScore, applicable: true,
      detail: `${done} completed, ${building} in progress (aim for ${target})`, action: { label: 'Build projects', to: '/app/projects' } },
    { key: 'interview', label: 'Mock interviews', weight: 0.15, score: mockScore, applicable: true,
      detail: interviews.length ? `Recent average ${Math.round(mockScore)}% over ${interviews.length} interview(s)` : 'No completed mock interviews yet',
      action: { label: 'Start a mock interview', to: '/app/interview' } },
    { key: 'career', label: 'Resume, portfolio & interview prep', weight: 0.10, score: careerScore, applicable: true,
      detail: 'Portfolio, resume/LinkedIn and interview-prep roadmap topics', action: { label: 'Continue roadmap', to: '/app/roadmap' } },
  ].map((d) => ({ ...d, score: Math.round(clamp(d.score)) }))

  // Dimensions that do not apply to this role are excluded, not counted as zero.
  const active = dimensions.filter((d) => d.applicable)
  const totalWeight = active.reduce((s, d) => s + d.weight, 0) || 1
  const overall = Math.round(active.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight)

  const gaps = active
    .filter((d) => d.score < 70)
    .map((d) => ({
      type: d.key,
      title: d.label,
      score: d.score,
      impact: Math.round(((100 - d.score) * d.weight * 100) / totalWeight) / 100,
      message: d.detail,
      action: d.action,
    }))
    .sort((a, b) => b.impact - a.impact)

  const breakdown = Object.fromEntries(dimensions.map((d) => [d.key, d.score]))

  return {
    overall,
    readinessLevel: readinessLevel(overall),
    breakdown,
    dimensions,
    gaps,
    evidence: {
      roadmapTopics: topics.filter((t) => t.track === 'learn').length,
      topicsCompleted: progress.filter((p) => p.status === 'completed').length,
      subtopicsVerified: progress.reduce((s, p) => s + (p.completedSubtopics?.length || 0), 0),
      dsaSolved: solvedTotal,
      coreCsSubjects: csTopics.length,
      projects: projects.length,
      interviewSessions: interviews.length,
      skills: userSkills.length,
    },
    blueprint: {
      role: blueprint.normalizedRole,
      technologies: (blueprint.technologies || []).map((t) => t.name),
      dsaRequired: dsaNeeded,
    },
  }
}
