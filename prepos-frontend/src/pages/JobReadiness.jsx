import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react'

import GlassCard from '../components/ui/GlassCard'
import ProgressRing from '../components/ui/ProgressRing'
import ProgressBar from '../components/ui/ProgressBar'
import SectionHeader from '../components/ui/SectionHeader'
import LoadingState from '../components/ui/LoadingState'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

import { api } from '../lib/api'

const RING_COLOR = (v) => (v >= 70 ? '#34d399' : v >= 40 ? '#a855f7' : '#f59e0b')

export default function JobReadiness() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.get('/job-readiness')
      setData(result)
    } catch (err) {
      setError(err.message || 'Unable to calculate readiness.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (!data && !error) return <LoadingState label="Calculating your verified job readiness…" />

  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-6">
          <div className="flex items-start gap-2 text-sm text-red-300"><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>
          <Button size="sm" className="mt-4" icon={RefreshCw} onClick={load}>Retry</Button>
        </GlassCard>
      </div>
    )
  }

  const evidence = data.evidence || {}

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SectionHeader
        title="Job readiness"
        subtitle={`Evidence-based preparation for ${data.role}`}
        action={<Button size="sm" variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>}
      />

      {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error} — showing last known result.</div>}

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="p-8 flex flex-col items-center justify-center" glow="purple">
          <ProgressRing value={data.overall} size={140} color={RING_COLOR(data.overall)} />
          <p className="text-sm text-white mt-4 font-medium">{data.readinessLevel}</p>
          <p className="text-xs text-ink-faint mt-1">{data.overall}% verified readiness</p>
        </GlassCard>

        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-white text-[15px] mb-4">Evidence-based breakdown</h3>
          <div className="space-y-4">
            {(data.dimensions || []).filter((d) => d.applicable).map((d) => (
              <div key={d.key}>
                <ProgressBar label={d.label} value={d.score} color={d.score >= 70 ? 'green' : d.score >= 40 ? 'blue' : 'amber'} />
                <p className="text-[11px] text-ink-faint mt-1">{d.detail}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {data.gaps?.length > 0 && (
        <GlassCard className="p-6">
          <SectionHeader title="Biggest opportunities" subtitle="Ordered by how much each would move your overall score." />
          <div className="grid sm:grid-cols-2 gap-3">
            {data.gaps.slice(0, 4).map((g) => (
              <div key={g.type} className="rounded-xl bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white font-medium">{g.title}</p>
                  <Badge tone={g.score < 30 ? 'red' : 'amber'}>{g.score}%</Badge>
                </div>
                <p className="text-xs text-ink-faint mt-1.5">{g.message}</p>
                {g.action?.to && (
                  <Link to={g.action.to} className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 mt-2.5">
                    {g.action.label} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <SectionHeader title="What this score is based on" subtitle="PrepOS uses recorded, verified progress — never a self-reported claim of mastery." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Evidence label="Subtopics verified" value={evidence.subtopicsVerified} />
          <Evidence label="Topics completed" value={evidence.topicsCompleted} />
          <Evidence label="DSA solved" value={evidence.dsaSolved} />
          <Evidence label="Core CS subjects" value={evidence.coreCsSubjects} />
          <Evidence label="Projects" value={evidence.projects} />
          <Evidence label="Mock interviews" value={evidence.interviewSessions} />
          <Evidence label="Skills tracked" value={evidence.skills} />
        </div>
      </GlassCard>
    </div>
  )
}

function Evidence({ label, value = 0 }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-ink-dim px-3 py-3 rounded-xl bg-white/[0.02]">
      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
      <div><p className="text-white">{value}</p><p className="text-[11px] text-ink-faint">{label}</p></div>
    </div>
  )
}
