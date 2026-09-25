import { useEffect, useState } from 'react'
import GlassCard from '../components/ui/GlassCard'
import ProgressBar from '../components/ui/ProgressBar'
import SectionHeader from '../components/ui/SectionHeader'
import LoadingState from '../components/ui/LoadingState'
import QuizModal from '../components/QuizModal'
import { api } from '../lib/api'

const LEVELS = ['Never Learned', 'Beginner', 'Intermediate', 'Strong']

export default function Skills() {
  const [skills, setSkills] = useState(null)
  const [error, setError] = useState('')
  const [quizTarget, setQuizTarget] = useState(null) // { skillName, level }

  function load() {
    setError('')
    api.get('/skills')
      .then((res) => setSkills(res.skills))
      .catch((err) => setError(err?.message || 'Unable to load skills.'))
  }
  useEffect(load, [])

  function selectLevel(skillName, level) {
    if (level === 'Never Learned') {
      // Nothing to verify — a claim of zero knowledge is set directly.
      api.put('/skills', { skillName, level, progress: 0 })
        .then(load)
        .catch((err) => setError(err?.message || 'Unable to update skill.'))
      return
    }
    // Any other level must be backed up by a calibration quiz — the score
    // (not the claim) decides the real level and progress.
    setQuizTarget({ skillName, level })
  }

  if (error && !skills) {
    return (
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-6 text-sm text-red-300 text-center">
          {error}
          <button onClick={load} className="block mx-auto mt-3 text-xs underline text-ink-faint hover:text-white">
            Retry
          </button>
        </GlassCard>
      </div>
    )
  }

  if (!skills) return <LoadingState label="Loading your skills…" />

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SectionHeader title="Skills" subtitle="Claim a level, back it up with a quick quiz — the score decides your real progress." />

      {error && (
        <GlassCard className="p-3 text-xs text-red-300 text-center">{error}</GlassCard>
      )}

      {skills.length === 0 ? (
        <GlassCard className="p-6 text-sm text-ink-faint text-center">No skills recorded yet — complete onboarding to seed this list.</GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {skills.map((s) => (
            <GlassCard key={s._id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">{s.skillName}</h3>
              </div>
              <ProgressBar value={s.progress} color="blue" showValue className="mb-3" />
              <div className="flex gap-1.5">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => selectLevel(s.skillName, lvl)}
                    className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-colors ${
                      s.level === lvl ? 'border-cyan-400/50 bg-cyan-500/10 text-white' : 'border-white/10 text-ink-faint hover:border-white/20'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {quizTarget && (
        <QuizModal
          title={`Confirm: ${quizTarget.skillName} (${quizTarget.level})`}
          generateEndpoint={`/skills/${encodeURIComponent(quizTarget.skillName)}/quiz`}
          generateBody={{ level: quizTarget.level }}
          onClose={() => { setQuizTarget(null); load() }}
          onResult={load}
        />
      )}
    </div>
  )
}
