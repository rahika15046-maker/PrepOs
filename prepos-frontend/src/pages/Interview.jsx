import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award, CheckCircle2, ChevronLeft, ChevronRight, Loader2, MessageSquare,
  Play, RotateCcw, Send, ThumbsUp, Wand2,
} from 'lucide-react'

import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ProgressBar from '../components/ui/ProgressBar'
import ProgressRing from '../components/ui/ProgressRing'
import LoadingState from '../components/ui/LoadingState'

import { api } from '../lib/api'

const CATEGORIES = ['Technical', 'DSA', 'CS Fundamentals', 'System Design', 'Project', 'Behavioral']
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

export default function Interview() {
  const [stage, setStage] = useState('loading') // loading | setup | live | result
  const [sessions, setSessions] = useState([])
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')

  const [categories, setCategories] = useState(['Technical', 'CS Fundamentals', 'Behavioral'])
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [count, setCount] = useState(6)
  const [creating, setCreating] = useState(false)

  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [warning, setWarning] = useState('')

  const loadList = useCallback(async () => {
    try {
      const res = await api.get('/interview')
      setSessions(res.sessions || [])
      setStage('setup')
    } catch (err) {
      setError(err.message || 'Unable to load interviews.')
      setStage('setup')
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  function toggleCategory(c) {
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
  }

  async function create() {
    setCreating(true)
    setError('')
    try {
      const res = await api.post('/interview', { categories, difficulty, count })
      setSession(res.session)
      setIndex(0)
      setAnswer('')
      setWarning('')
      setStage('live')
    } catch (err) {
      setError(err.message || 'Unable to start the interview.')
    } finally {
      setCreating(false)
    }
  }

  async function open(id) {
    setError('')
    try {
      const res = await api.get(`/interview/${id}`)
      setSession(res.session)
      setIndex(0)
      setAnswer(res.session.questions[0]?.answer || '')
      setStage(res.session.status === 'completed' ? 'result' : 'live')
    } catch (err) {
      setError(err.message)
    }
  }

  const current = session?.questions?.[index]

  async function submitAnswer(advance) {
    if (!current || !answer.trim()) {
      if (advance === 1 && index < session.questions.length - 1) {
        setIndex((i) => i + 1)
        setAnswer(session.questions[index + 1]?.answer || '')
      }
      return
    }

    setSaving(true)
    setWarning('')
    try {
      const res = await api.post(`/interview/${session.id}/answer`, {
        questionId: current.question,
        answer,
      })
      setSession((s) => ({
        ...s,
        questions: s.questions.map((q, i) => (i === index ? res.question : q)),
      }))
      if (res.warning) setWarning(res.warning)

      if (advance && index + (advance > 0 ? 1 : -1) >= 0) {
        const next = index + advance
        if (next >= 0 && next < session.questions.length) {
          setIndex(next)
          setAnswer(session.questions[next]?.answer || '')
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to save this answer.')
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    if (answer.trim() && current && !current.evaluated) await submitAnswer(0)
    setCompleting(true)
    setError('')
    try {
      const res = await api.post(`/interview/${session.id}/complete`, {})
      setSession(res.session)
      setStage('result')
    } catch (err) {
      setError(err.message || 'Unable to finish the interview.')
    } finally {
      setCompleting(false)
    }
  }

  if (stage === 'loading') return <LoadingState label="Loading interviews…" />

  /* ---------------------------------------------------------------- setup */

  if (stage === 'setup') {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <SectionHeader title="Mock interviews" subtitle="AI-generated questions from your career roadmap, graded like a real interview." />

        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <GlassCard className="p-6" glow="purple">
          <h3 className="text-sm font-medium text-white mb-3">Start a new interview</h3>

          <p className="text-xs text-ink-faint mb-2">Categories</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => toggleCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${categories.includes(c) ? 'bg-violet-500/20 border-violet-400/40 text-violet-200' : 'border-white/10 text-ink-faint hover:text-white'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 items-center mb-5">
            <div>
              <p className="text-xs text-ink-faint mb-1.5">Difficulty</p>
              <div className="flex gap-1 glass rounded-xl p-1">
                {DIFFICULTIES.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)} className={`px-3 py-1.5 text-xs rounded-lg ${difficulty === d ? 'bg-white/10 text-white' : 'text-ink-faint'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-faint mb-1.5">Questions</p>
              <div className="flex gap-1 glass rounded-xl p-1">
                {[4, 6, 8, 10].map((n) => (
                  <button key={n} onClick={() => setCount(n)} className={`px-3 py-1.5 text-xs rounded-lg ${count === n ? 'bg-white/10 text-white' : 'text-ink-faint'}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={create} disabled={creating || !categories.length} icon={creating ? Loader2 : Play}>
            {creating ? 'Generating questions…' : 'Start interview'}
          </Button>
        </GlassCard>

        {sessions.length > 0 && (
          <GlassCard className="p-6">
            <h3 className="text-sm font-medium text-white mb-3">Past interviews</h3>
            <div className="space-y-1.5">
              {sessions.map((s) => (
                <button key={s.id} onClick={() => open(s.id)} className="w-full flex items-center gap-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] px-3.5 py-2.5 text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.categories.join(', ')}</p>
                    <p className="text-[11px] text-ink-faint">{new Date(s.startedAt).toLocaleDateString()} · {s.difficulty} · {s.answered}/{s.questionCount} answered</p>
                  </div>
                  {s.status === 'completed' ? <Badge tone={s.overallScore >= 70 ? 'green' : s.overallScore >= 40 ? 'amber' : 'red'}>{s.overallScore}%</Badge> : <Badge>In progress</Badge>}
                </button>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    )
  }

  /* ----------------------------------------------------------------- live */

  if (stage === 'live') {
    if (!current) return <LoadingState label="Loading interview…" />

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <SectionHeader title="Mock interview" subtitle={`Question ${index + 1} of ${session.questions.length}`}
          action={<Button size="sm" variant="ghost" onClick={() => setStage('setup')}>Exit</Button>} />

        {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <Badge>{current.category}</Badge>
            <span className="text-xs text-ink-faint">{current.difficulty}</span>
          </div>

          <h2 className="text-lg font-display text-white leading-relaxed">{current.prompt}</h2>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer as if you were speaking to an interviewer…"
            rows={8}
            className="w-full mt-6 rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 text-sm text-white placeholder:text-ink-faint outline-none focus:border-white/20 resize-y"
          />

          {warning && <p className="text-xs text-amber-300 mt-2">{warning}</p>}

          {current.evaluated && (
            <div className="mt-5 rounded-xl bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white flex items-center gap-2"><Award size={15} className="text-violet-300" />Feedback</p>
                <Badge tone={current.score >= 70 ? 'green' : current.score >= 40 ? 'amber' : 'red'}>{current.score}/100</Badge>
              </div>
              <p className="text-sm text-ink-dim">{current.feedback}</p>
              {current.strengths?.length > 0 && (
                <p className="text-xs text-emerald-300/90 flex gap-1.5"><ThumbsUp size={12} className="mt-0.5 shrink-0" />{current.strengths.join(' · ')}</p>
              )}
              {current.improvements?.length > 0 && (
                <ul className="text-xs text-ink-faint space-y-1">{current.improvements.map((i) => <li key={i}>→ {i}</li>)}</ul>
              )}
              {current.idealAnswer && (
                <details className="text-xs text-ink-dim">
                  <summary className="cursor-pointer text-violet-300">Model answer</summary>
                  <p className="mt-1.5">{current.idealAnswer}</p>
                </details>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 mt-5">
            <Button size="sm" variant="secondary" icon={ChevronLeft} onClick={() => submitAnswer(-1)} disabled={index === 0 || saving}>Previous</Button>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => submitAnswer(0)} disabled={saving || !answer.trim()}>
                {saving ? 'Evaluating…' : current.evaluated ? 'Re-evaluate' : 'Get feedback'}
              </Button>
              {index < session.questions.length - 1 ? (
                <Button size="sm" icon={ChevronRight} onClick={() => submitAnswer(1)} disabled={saving}>Next</Button>
              ) : (
                <Button size="sm" icon={Send} onClick={finish} disabled={completing}>{completing ? 'Finishing…' : 'Finish interview'}</Button>
              )}
            </div>
          </div>
        </GlassCard>

        <div className="flex gap-1.5 justify-center">
          {session.questions.map((q, i) => (
            <button key={q.question} onClick={() => { setIndex(i); setAnswer(q.answer || '') }}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-white' : q.evaluated ? 'w-4 bg-emerald-400/60' : q.answer ? 'w-4 bg-amber-400/50' : 'w-4 bg-white/10'}`} />
          ))}
        </div>
      </div>
    )
  }

  /* --------------------------------------------------------------- result */

  const report = session?.report
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionHeader title="Interview report" action={<Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setStage('setup')}>New interview</Button>} />

      <GlassCard className="p-8 text-center" glow="purple">
        <ProgressRing value={session.overallScore} size={130} color={session.overallScore >= 70 ? '#34d399' : session.overallScore >= 40 ? '#a855f7' : '#f59e0b'} />
        <p className="text-sm text-ink-dim mt-4 max-w-lg mx-auto">{report?.summary}</p>
      </GlassCard>

      {report && (
        <div className="grid sm:grid-cols-2 gap-4">
          {report.strengths?.length > 0 && (
            <GlassCard className="p-5">
              <p className="text-sm font-medium text-white flex items-center gap-2 mb-2"><CheckCircle2 size={15} className="text-emerald-400" />Strengths</p>
              <ul className="space-y-1 text-sm text-ink-dim">{report.strengths.map((s) => <li key={s}>• {s}</li>)}</ul>
            </GlassCard>
          )}
          {report.weakAreas?.length > 0 && (
            <GlassCard className="p-5">
              <p className="text-sm font-medium text-white flex items-center gap-2 mb-2"><Wand2 size={15} className="text-amber-400" />Focus next</p>
              <ul className="space-y-1 text-sm text-ink-dim">{report.weakAreas.map((s) => <li key={s}>• {s}</li>)}</ul>
            </GlassCard>
          )}
        </div>
      )}

      {report?.nextSteps?.length > 0 && (
        <GlassCard className="p-5">
          <p className="text-sm font-medium text-white mb-2">Next steps</p>
          <ol className="space-y-1.5 text-sm text-ink-dim list-decimal list-inside">{report.nextSteps.map((s) => <li key={s}>{s}</li>)}</ol>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <p className="text-sm font-medium text-white mb-3 flex items-center gap-2"><MessageSquare size={15} className="text-blue-300" />Per-question results</p>
        <div className="space-y-2">
          {session.questions.map((q) => (
            <div key={q.question} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3.5 py-2.5">
              <Badge tone={!q.evaluated ? 'neutral' : q.score >= 70 ? 'green' : q.score >= 40 ? 'amber' : 'red'}>{q.evaluated ? `${q.score}%` : 'skipped'}</Badge>
              <div className="flex-1 min-w-0"><p className="text-sm text-ink-dim truncate">{q.prompt}</p></div>
              <Badge>{q.category}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
