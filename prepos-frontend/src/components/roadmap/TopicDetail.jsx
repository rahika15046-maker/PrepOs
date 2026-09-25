import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award, BookOpen, Check, ChevronDown, ExternalLink, Hammer, Lock, MessageSquareQuote,
  Target, Sparkles, Loader2,
} from 'lucide-react'

import GlassCard from '../ui/GlassCard'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ProgressBar from '../ui/ProgressBar'
import QuizModal from '../QuizModal'
import { api } from '../../lib/api'

export const TRACK_META = {
  learn: { label: 'Role skills', tone: 'blue' },
  'core-cs': { label: 'Core CS', tone: 'purple' },
  dsa: { label: 'DSA', tone: 'amber' },
  project: { label: 'Project', tone: 'green' },
  interview: { label: 'Interview', tone: 'red' },
  career: { label: 'Career', tone: 'green' },
}

const RES_ICON = { video: '▶', documentation: '📄', course: '🎓', article: '📰', book: '📚', practice: '⌨️', other: '🔗' }

export default function TopicDetail({ node, onChanged }) {
  const [open, setOpen] = useState(() => node.subtopics.find((s) => !node.completedSubtopics.includes(s)) || null)
  const [quiz, setQuiz] = useState(null)
  const [concepts, setConcepts] = useState(() => new Set(node.completedConcepts))
  const [pending, setPending] = useState(null)

  const locked = node.status === 'locked'
  const track = TRACK_META[node.track] || TRACK_META.learn
  const details = node.subtopicDetails?.length
    ? node.subtopicDetails
    : node.subtopics.map((name) => ({ name, summary: '', concepts: [], practice: [], estimatedHours: 0 }))

  async function toggleConcept(subtopic, concept) {
    const id = `${subtopic}::${concept}`
    const done = !concepts.has(id)
    setConcepts((cur) => {
      const next = new Set(cur)
      done ? next.add(id) : next.delete(id)
      return next
    })
    setPending(id)
    try {
      await api.put('/topics/concepts', { topicKey: node.key, subtopic, concept, done })
    } catch {
      setConcepts((cur) => {
        const next = new Set(cur)
        done ? next.delete(id) : next.add(id)
        return next
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-5" glow="blue">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge tone={track.tone}>{track.label}</Badge>
          <Badge>{node.difficulty}</Badge>
          <Badge>{node.estimatedHours}h</Badge>
          {node.status === 'completed' && <Badge tone="green">Completed</Badge>}
          {node.status === 'weak' && <Badge tone="amber">Needs revision</Badge>}
        </div>
        <h2 className="font-display text-xl text-white">{node.title}</h2>
        <p className="text-sm text-ink-dim mt-2">{node.description}</p>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <ProgressBar label={`Verified · ${node.subtopicsDone}/${node.subtopicsTotal} subtopics`} value={node.progress} color="green" />
          <ProgressBar label={`Studied ${node.studiedHours}h of ${node.estimatedHours}h`} value={Math.min(100, Math.round((node.studiedHours / Math.max(node.estimatedHours, 1)) * 100))} color="blue" />
        </div>

        {locked && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-400/20 p-3 text-xs text-amber-200">
            <Lock size={14} className="mt-0.5 shrink-0" />
            <span>
              Reach 60% on {node.unlockedBy.filter((u) => !u.met).map((u) => u.title).join(', ')} to unlock quizzes here.
              You can still read everything below.
            </span>
          </div>
        )}
      </GlassCard>

      {node.outcomes.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-white flex items-center gap-2"><Target size={15} className="text-blue-300" />After this topic you can…</h3>
          <ul className="mt-3 space-y-1.5">
            {node.outcomes.map((o) => (
              <li key={o} className="text-sm text-ink-dim flex gap-2"><Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />{o}</li>
            ))}
          </ul>
        </GlassCard>
      )}

      {!node.detailed && (
        <GlassCard className="p-5 flex items-center gap-3 text-sm text-ink-dim">
          <Loader2 size={16} className="animate-spin text-violet-300" />
          The detailed curriculum for this topic is still being written by the AI mentor…
        </GlassCard>
      )}

      <GlassCard className="p-2">
        <div className="px-3 py-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white flex items-center gap-2"><BookOpen size={15} className="text-violet-300" />Subtopics</h3>
          <span className="text-[11px] text-ink-faint">Tick concepts as you learn · pass the quiz to verify</span>
        </div>

        {details.map((sub, i) => {
          const verified = node.completedSubtopics.includes(sub.name)
          const isOpen = open === sub.name
          const ticked = sub.concepts.filter((c) => concepts.has(`${sub.name}::${c}`)).length

          return (
            <div key={sub.name} className="border-t border-white/[0.05]">
              <button onClick={() => setOpen(isOpen ? null : sub.name)} className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/[0.03] rounded-xl">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] shrink-0 ${verified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-ink-faint'}`}>
                  {verified ? <Check size={13} /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white truncate">{sub.name}</span>
                  <span className="block text-[11px] text-ink-faint">
                    {sub.estimatedHours ? `${sub.estimatedHours}h · ` : ''}{sub.concepts.length ? `${ticked}/${sub.concepts.length} concepts` : 'no concept list'}
                  </span>
                </span>
                <ChevronDown size={16} className={`text-ink-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pl-[52px] space-y-3">
                  {sub.summary && <p className="text-sm text-ink-dim">{sub.summary}</p>}

                  {sub.concepts.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {sub.concepts.map((c) => {
                        const id = `${sub.name}::${c}`
                        const on = concepts.has(id)
                        return (
                          <label key={c} className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[13px] cursor-pointer hover:bg-white/[0.04] ${pending === id ? 'opacity-60' : ''}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleConcept(sub.name, c)} className="mt-0.5 accent-violet-500" />
                            <span className={on ? 'text-ink-faint line-through' : 'text-ink-dim'}>{c}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {sub.practice?.length > 0 && (
                    <div className="rounded-xl bg-white/[0.03] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-ink-faint mb-1.5 flex items-center gap-1.5"><Hammer size={11} />Practice</p>
                      <ul className="space-y-1">{sub.practice.map((p) => <li key={p} className="text-[13px] text-ink-dim">• {p}</li>)}</ul>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Button size="sm" variant={verified ? 'secondary' : 'primary'} icon={Award} disabled={locked}
                      onClick={() => setQuiz({ title: `${sub.name} — quiz`, endpoint: `/topics/${node.key}/subtopics/${encodeURIComponent(sub.name)}/quiz` })}>
                      {verified ? 'Retake quiz' : 'Verify with quiz'}
                    </Button>
                    {verified && <span className="text-[11px] text-emerald-300">Verified</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div className="border-t border-white/[0.05] p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-faint">Finished the subtopics? Test the whole topic in one exam.</p>
          <Button size="sm" variant="secondary" icon={Sparkles} disabled={locked || !node.detailed}
            onClick={() => setQuiz({ title: `${node.title} — mastery exam`, endpoint: `/topics/${node.key}/exam` })}>
            Topic mastery exam{node.quizScore != null ? ` · last ${node.quizScore}%` : ''}
          </Button>
        </div>
      </GlassCard>

      {node.track === 'dsa' && (
        <GlassCard className="p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-dim">Practise real LeetCode problems for this topic.</p>
          <Link to={`/app/dsa${node.catalogTopic ? `?topic=${encodeURIComponent(node.catalogTopic)}` : ''}`}>
            <Button size="sm" variant="secondary" icon={ExternalLink}>Open DSA practice</Button>
          </Link>
        </GlassCard>
      )}

      {node.miniProject && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-white flex items-center gap-2"><Hammer size={15} className="text-emerald-300" />Mini project</h3>
          <p className="text-sm text-ink-dim mt-2">{node.miniProject}</p>
        </GlassCard>
      )}

      {node.resources.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-white">Learning resources</h3>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            {node.resources.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2.5 text-sm text-ink-dim">
                <span>{RES_ICON[r.type] || '🔗'}</span>
                <span className="flex-1 truncate">{r.title}</span>
                <ExternalLink size={12} className="text-ink-faint" />
              </a>
            ))}
          </div>
          <p className="text-[10px] text-ink-faint mt-2">Links open a search for the resource so they never go stale.</p>
        </GlassCard>
      )}

      {node.interviewFocus.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-white flex items-center gap-2"><MessageSquareQuote size={15} className="text-amber-300" />Interviewers ask</h3>
          <ul className="mt-3 space-y-1.5">{node.interviewFocus.map((q) => <li key={q} className="text-sm text-ink-dim">• {q}</li>)}</ul>
          <Link to="/app/interview" className="inline-block mt-3 text-xs text-violet-300 hover:text-violet-200">Practise in a mock interview →</Link>
        </GlassCard>
      )}

      {quiz && (
        <QuizModal
          title={quiz.title}
          generateEndpoint={quiz.endpoint}
          onClose={() => { setQuiz(null); onChanged?.() }}
          onResult={() => onChanged?.()}
        />
      )}
    </div>
  )
}
