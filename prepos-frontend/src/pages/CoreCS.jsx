import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Loader2, PlusCircle } from 'lucide-react'

import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import TopicDetail from '../components/roadmap/TopicDetail'
import { api } from '../lib/api'

/** Core CS: every subject is a full topic → subtopics → concepts → quizzes. */
export default function CoreCS() {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/core-cs')
      setData(res)
      setSelected((cur) => cur || res.nodes[0]?.key || null)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Detailed content may still be generating in the background.
  const generating = data?.nodes?.some((n) => !n.detailed)
  useEffect(() => {
    if (!generating) return undefined
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [generating, load])

  async function enable() {
    setBusy(true)
    try {
      await api.post('/core-cs/enable', {})
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) {
    return <div className="max-w-xl mx-auto mt-10"><GlassCard className="p-6"><EmptyState icon={GraduationCap} title="Core CS unavailable" subtitle={error}
      action={<Link to="/onboarding"><Button size="sm">Complete onboarding</Button></Link>} /></GlassCard></div>
  }
  if (!data) return <LoadingState label="Loading Core CS…" />

  if (!data.enabled) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <GlassCard className="p-6"><EmptyState icon={GraduationCap} title="Add the Core CS track"
          subtitle="OOP, DBMS, Operating Systems, Networks and System Design — each with subtopics, concept checklists and quizzes."
          action={<Button onClick={enable} disabled={busy} icon={PlusCircle}>{busy ? 'Adding…' : 'Add Core CS to my roadmap'}</Button>} /></GlassCard>
      </div>
    )
  }

  const current = data.nodes.find((n) => n.key === selected)

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <SectionHeader title="Core Computer Science" subtitle="The fundamentals every technical interview tests — learn them subtopic by subtopic and verify with quizzes." />

      {generating && (
        <div className="flex items-center gap-2 text-xs text-violet-200 glass rounded-xl px-4 py-3">
          <Loader2 size={14} className="animate-spin" /> Finalising content…
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {data.nodes.map((n) => (
          <button key={n.key} onClick={() => setSelected(n.key)}
            className={`text-left rounded-2xl p-4 border transition-colors ${selected === n.key ? 'border-violet-400/50 bg-violet-500/10' : 'glass hover:border-white/25'}`}>
            <p className="text-sm text-white font-medium leading-snug">{n.title.replace(/ \(.*\)/, '')}</p>
            <p className="text-[11px] text-ink-faint mt-1">{n.subtopicsDone}/{n.subtopicsTotal} subtopics · {n.estimatedHours}h</p>
            <ProgressBar className="mt-3" value={n.progress} showValue={false} color="green" />
          </button>
        ))}
      </div>

      {current && <TopicDetail key={current.key} node={current} onChanged={load} />}
    </div>
  )
}
