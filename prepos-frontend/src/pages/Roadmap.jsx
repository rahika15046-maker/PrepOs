import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Lock, Loader2, RefreshCw, Sparkles, AlertTriangle, LayoutList, Columns3, Wand2 } from 'lucide-react'

import GlassCard from '../components/ui/GlassCard'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import TopicDetail, { TRACK_META } from '../components/roadmap/TopicDetail'

import { api } from '../lib/api'
import { clockParams } from '../lib/dates'

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'learn', label: 'Role skills' },
  { id: 'core-cs', label: 'Core CS' },
  { id: 'dsa', label: 'DSA' },
  { id: 'launch', label: 'Projects & career', tracks: ['project', 'career', 'interview'] },
]

function StatusIcon({ status }) {
  if (status === 'completed') return <CheckCircle2 size={16} className="text-emerald-400" />
  if (status === 'locked') return <Lock size={14} className="text-ink-faint" />
  if (status === 'weak') return <AlertTriangle size={15} className="text-amber-400" />
  return <Circle size={15} className="text-blue-300" />
}

export default function Roadmap() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('list')
  const [busy, setBusy] = useState(false)
  const wasExpanding = useRef(false)
  const detailRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/roadmap')
      setData(res)
      setError('')
      setSelected((cur) => cur || res.nodes.find((n) => n.status === 'current')?.key || res.nodes[0]?.key || null)
      return res
    } catch (err) {
      setError(err.message || 'Unable to load your roadmap.')
      return null
    }
  }, [])

  useEffect(() => { load() }, [load])

  /* While the AI is still writing the detailed curriculum, poll for progress. */
  const expanding = data?.detail && (data.detail.status === 'expanding' || data.detail.running)
  useEffect(() => {
    if (!expanding) {
      if (wasExpanding.current) {
        wasExpanding.current = false
        // Curriculum finished: rebuild the study plan so blocks use the new subtopics.
        api.post('/schedule/generate', clockParams()).catch(() => {})
      }
      return undefined
    }
    wasExpanding.current = true
    const id = setInterval(load, 4000)
    return () => clearInterval(id)
  }, [expanding, load])

  async function run(path) {
    setBusy(true)
    try {
      await api.post(path, {})
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const nodes = useMemo(() => {
    if (!data) return []
    const f = FILTERS.find((x) => x.id === filter)
    return data.nodes.filter((n) => (filter === 'all' ? true : f.tracks ? f.tracks.includes(n.track) : n.track === filter))
  }, [data, filter])

  const groups = useMemo(() => {
    const out = []
    nodes.forEach((n) => {
      let g = out.find((x) => x.name === n.stage)
      if (!g) { g = { name: n.stage, order: n.stageOrder, items: [] }; out.push(g) }
      g.items.push(n)
    })
    return out.sort((a, b) => a.order - b.order)
  }, [nodes])

  const current = data?.nodes.find((n) => n.key === selected)

  function pick(key) {
    setSelected(key)
    if (window.innerWidth < 1024) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <GlassCard className="p-6"><EmptyState icon={AlertTriangle} title="Roadmap unavailable" subtitle={error}
          action={<Link to="/onboarding"><Button size="sm">Complete onboarding</Button></Link>} /></GlassCard>
      </div>
    )
  }
  if (!data) return <LoadingState label="Loading your roadmap…" />

  const { stats, detail } = data

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <GlassCard className="p-6" glow="purple">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-wider text-ink-faint">Your roadmap · zero to job-ready</p>
            <h1 className="font-display text-2xl text-white mt-1">{data.role}</h1>
            <p className="text-sm text-ink-dim mt-2">{data.roleSummary}</p>
            {data.careerOutcome && <p className="text-sm text-violet-200/90 mt-2">🎯 {data.careerOutcome}</p>}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {data.technologies.slice(0, 10).map((t) => <Badge key={t} tone="blue">{t}</Badge>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <Stat label="Verified" value={`${stats.overallProgress}%`} />
            <Stat label="Topics done" value={`${stats.completed}/${stats.topics}`} />
            <Stat label="Subtopics" value={`${stats.subtopicsDone}/${stats.subtopicsTotal}`} />
            <Stat label="Hours planned" value={`${stats.hoursTotal}h`} />
          </div>
        </div>
        <ProgressBar className="mt-5" value={stats.overallProgress} color="green" label="Overall verified progress" />
      </GlassCard>

      {data.needsUpgrade && (
        <GlassCard className="p-5 border border-violet-400/25">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2"><Wand2 size={15} className="text-violet-300" />Upgrade to the detailed roadmap</p>
              <p className="text-xs text-ink-dim mt-1 max-w-xl">
                Adds every subtopic with concept checklists and quizzes, plus Core CS, DSA, projects and interview tracks.
                Your existing progress is kept.
              </p>
            </div>
            <Button onClick={() => run('/career-intelligence/blueprint/upgrade')} disabled={busy} icon={Sparkles}>
              {busy ? 'Upgrading…' : 'Upgrade my roadmap'}
            </Button>
          </div>
        </GlassCard>
      )}

      {!data.needsUpgrade && expanding && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-violet-300" />
            <div className="flex-1">
              <p className="text-sm text-white">Your AI mentor is writing the detailed curriculum…</p>
              <ProgressBar className="mt-2" value={Math.round((detail.done / Math.max(detail.total, 1)) * 100)} color="purple" showValue={false} />
            </div>
            <span className="text-xs text-ink-faint">{detail.done}/{detail.total} topics</span>
          </div>
          <p className="text-[11px] text-ink-faint mt-2">You can start with topics that are already complete — this page updates by itself.</p>
        </GlassCard>
      )}

      {!data.needsUpgrade && !expanding && detail.done < detail.total && (
        <GlassCard className="p-4 border border-amber-400/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-100">
              {detail.total - detail.done} topic(s) still need their detailed curriculum.{detail.error ? ` (${detail.error})` : ''}
            </p>
            <Button size="sm" variant="secondary" icon={RefreshCw} disabled={busy} onClick={() => run('/career-intelligence/blueprint/expand')}>
              Continue generating
            </Button>
          </div>
        </GlassCard>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 glass rounded-xl p-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs rounded-lg ${filter === f.id ? 'bg-white/10 text-white' : 'text-ink-faint hover:text-white'}`}>{f.label}</button>
          ))}
        </div>
        <div className="flex gap-1 glass rounded-xl p-1">
          <button onClick={() => setView('list')} className={`p-1.5 rounded-lg ${view === 'list' ? 'bg-white/10 text-white' : 'text-ink-faint'}`} title="List"><LayoutList size={15} /></button>
          <button onClick={() => setView('board')} className={`p-1.5 rounded-lg ${view === 'board' ? 'bg-white/10 text-white' : 'text-ink-faint'}`} title="Board"><Columns3 size={15} /></button>
        </div>
      </div>

      {view === 'board' && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {groups.map((g) => (
              <div key={g.name} className="w-64 shrink-0 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-ink-faint px-1 truncate">{g.name}</p>
                {g.items.map((n) => (
                  <button key={n.key} onClick={() => { setSelected(n.key); setView('list'); pick(n.key) }}
                    className="w-full text-left glass rounded-xl p-3 hover:border-white/25">
                    <div className="flex items-center gap-2"><StatusIcon status={n.status} /><span className="text-sm text-white truncate">{n.title}</span></div>
                    <ProgressBar className="mt-2" value={n.progress} showValue={false} color="green" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`grid lg:grid-cols-[360px_1fr] gap-5 items-start ${view === 'board' ? 'hidden' : ''}`}>
        <div className="space-y-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:sticky lg:top-4 pr-1">
          {groups.map((g) => {
            const phase = data.phases.find((p) => p.name === g.name)
            return (
              <div key={g.name}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-[11px] uppercase tracking-wider text-ink-faint truncate">{g.name}</p>
                  <span className="text-[10px] text-ink-faint">{phase ? `${phase.progress}% · ${phase.hours}h` : ''}</span>
                </div>
                <div className="space-y-1.5">
                  {g.items.map((n) => (
                    <button key={n.key} onClick={() => pick(n.key)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
                        selected === n.key ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/[0.05] bg-white/[0.025] hover:bg-white/[0.05]'}`}>
                      <div className="flex items-center gap-2.5">
                        <StatusIcon status={n.status} />
                        <span className={`flex-1 text-sm truncate ${n.status === 'locked' ? 'text-ink-faint' : 'text-white'}`}>{n.title}</span>
                        <Badge tone={(TRACK_META[n.track] || {}).tone}>{(TRACK_META[n.track] || {}).label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 pl-[26px]">
                        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full bg-emerald-400/80" style={{ width: `${n.progress}%` }} />
                        </div>
                        <span className="text-[10px] text-ink-faint">{n.subtopicsDone}/{n.subtopicsTotal} · {n.estimatedHours}h</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div ref={detailRef} className="min-w-0">
          {current ? <TopicDetail key={`${current.key}-${current.detailed}`} node={current} onChanged={load} /> : (
            <GlassCard className="p-6"><EmptyState title="Select a topic" subtitle="Pick anything on the left to see its subtopics, concepts, quizzes and resources." /></GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3.5 py-3">
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className="text-lg font-display text-white mt-0.5">{value}</p>
    </div>
  )
}
