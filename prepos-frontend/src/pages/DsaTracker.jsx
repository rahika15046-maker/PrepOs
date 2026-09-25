import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Circle, ExternalLink, Flame, Link2, RefreshCw, Search, Trophy, Unplug, Loader2, Info } from 'lucide-react'

import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ProgressBar from '../components/ui/ProgressBar'
import LoadingState from '../components/ui/LoadingState'
import { api } from '../lib/api'
import { addDays, startOfWeek, toDayString } from '../lib/dates'
import { useAuth } from '../context/AuthContext'

const DIFF_TONE = { Easy: 'green', Medium: 'amber', Hard: 'red' }
const PAGE = 40

export default function DsaTracker() {
  const { refresh } = useAuth()
  const [params, setParams] = useSearchParams()

  const [problems, setProblems] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState('')

  const [topic, setTopic] = useState(params.get('topic') || 'All')
  const [difficulty, setDifficulty] = useState('All')
  const [query, setQuery] = useState('')
  const [unsolvedOnly, setUnsolvedOnly] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      const [p, pr] = await Promise.all([api.get('/dsa/problems'), api.get('/dsa/progress')])
      setProblems(p.problems || [])
      setProgress(pr)
    } catch (err) {
      setError(err.message || 'Unable to load DSA data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const solvedIds = useMemo(() => {
    const map = new Map()
    ;(progress?.progress || []).forEach((p) => { if (p.solved && p.problem) map.set(String(p.problem._id), p) })
    return map
  }, [progress])

  const topics = useMemo(() => ['All', ...Object.keys(progress?.topicStats || {}).sort()], [progress])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return problems.filter((p) =>
      (topic === 'All' || p.topic === topic) &&
      (difficulty === 'All' || p.difficulty === difficulty) &&
      (!q || p.title.toLowerCase().includes(q) || (p.pattern || '').toLowerCase().includes(q)) &&
      (!unsolvedOnly || !solvedIds.has(String(p._id)))
    )
  }, [problems, topic, difficulty, query, unsolvedOnly, solvedIds])

  useEffect(() => { setPage(1) }, [topic, difficulty, query, unsolvedOnly])

  async function toggle(problem) {
    const solved = !solvedIds.has(String(problem._id))
    setBusy(problem._id)
    try {
      await api.put('/dsa/progress', { problemId: problem._id, solved })
      await load()
      if (solved) await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function connect(e) {
    e.preventDefault()
    setBusy('connect'); setError(''); setNotice('')
    try {
      await api.post('/dsa/leetcode/connect', { username })
      await sync()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function sync() {
    setBusy('sync'); setError(''); setNotice('')
    try {
      const res = await api.post('/dsa/leetcode/sync', {})
      await load()
      setNotice(
        res.newlyMatched > 0
          ? `Synced. ${res.newlyMatched} recent accepted problem(s) were marked solved in your catalog.`
          : 'Synced. Your LeetCode stats are up to date.'
      )
      if (res.newlyMatched) await refresh()
    } catch (err) {
      setError(err.message)
      await load()
    } finally {
      setBusy('')
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect LeetCode? Your PrepOS solved list is kept.')) return
    setBusy('disconnect')
    try {
      await api.delete('/dsa/leetcode')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  if (loading) return <LoadingState label="Loading DSA practice…" />

  const lc = progress?.leetcode
  const connected = Boolean(lc?.username)
  const shown = filtered.slice(0, page * PAGE)

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <SectionHeader title="DSA practice" subtitle="A curated 150-problem catalog, plus your live LeetCode profile." />

      {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{notice}</div>}

      {!connected ? (
        <GlassCard className="p-6" glow="blue">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-300 shrink-0"><Link2 size={18} /></div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Connect your LeetCode account</h3>
              <p className="text-sm text-ink-dim mt-1">
                Enter your public LeetCode username. We import your solved counts, topic strengths, streak and recent
                submissions. No password needed — the profile must be public.
              </p>
              <form onSubmit={connect} className="flex flex-wrap gap-2 mt-4">
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. neal_wu" maxLength={100}
                  className="flex-1 min-w-[220px] rounded-xl bg-white/[0.05] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-ink-faint outline-none focus:border-violet-400/50" />
                <Button type="submit" disabled={!username.trim() || busy === 'connect'} icon={busy === 'connect' ? Loader2 : Link2}>
                  {busy === 'connect' ? 'Connecting…' : 'Connect & sync'}
                </Button>
              </form>
            </div>
          </div>
        </GlassCard>
      ) : (
        <LeetCodePanel lc={lc} busy={busy} onSync={sync} onDisconnect={disconnect} />
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium text-white mb-1">Catalog progress</h3>
          <p className="text-xs text-ink-faint mb-4">{progress.catalogSolved} of {progress.catalogTotal} problems solved</p>
          <div className="space-y-3">
            {['Easy', 'Medium', 'Hard'].map((d) => {
              const s = progress.difficultyStats[d] || { solved: 0, total: 0 }
              return <ProgressBar key={d} label={`${d} · ${s.solved}/${s.total}`} value={s.total ? Math.round((s.solved / s.total) * 100) : 0} color={d === 'Easy' ? 'green' : d === 'Medium' ? 'amber' : 'purple'} />
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="text-sm font-medium text-white mb-3">By topic <span className="text-ink-faint font-normal">— click to filter</span></h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {Object.entries(progress.topicStats).sort((a, b) => b[1].total - a[1].total).map(([name, s]) => (
              <button key={name} onClick={() => { setTopic(name); setParams({ topic: name }) }} className="text-left">
                <ProgressBar label={`${name} · ${s.solved}/${s.total}`} value={s.total ? Math.round((s.solved / s.total) * 100) : 0} showValue={false} color={topic === name ? 'purple' : 'blue'} />
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or pattern"
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-ink-faint outline-none focus:border-violet-400/50" />
          </div>
          <Select value={topic} onChange={(v) => { setTopic(v); setParams(v === 'All' ? {} : { topic: v }) }} options={topics} />
          <Select value={difficulty} onChange={setDifficulty} options={['All', 'Easy', 'Medium', 'Hard']} />
          <label className="flex items-center gap-2 text-xs text-ink-dim cursor-pointer">
            <input type="checkbox" checked={unsolvedOnly} onChange={(e) => setUnsolvedOnly(e.target.checked)} className="accent-violet-500" /> Unsolved only
          </label>
        </div>

        <p className="text-xs text-ink-faint mb-2">{filtered.length} problem{filtered.length === 1 ? '' : 's'}</p>

        <div className="space-y-1.5">
          {shown.map((p) => {
            const rec = solvedIds.get(String(p._id))
            const solved = Boolean(rec)
            return (
              <div key={p._id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] px-3 py-2.5">
                <button onClick={() => toggle(p)} disabled={busy === p._id} className="shrink-0" title={solved ? 'Mark unsolved' : 'Mark solved'}>
                  {solved ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} className="text-ink-faint hover:text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${solved ? 'text-ink-faint' : 'text-white'}`}>{p.title}</p>
                  <p className="text-[11px] text-ink-faint truncate">{p.topic}{p.pattern ? ` · ${p.pattern}` : ''}</p>
                </div>
                {rec?.source === 'leetcode' && <Badge tone="amber">via LeetCode</Badge>}
                <Badge tone={DIFF_TONE[p.difficulty]}>{p.difficulty}</Badge>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-white" title="Open on LeetCode"><ExternalLink size={15} /></a>
                )}
              </div>
            )
          })}
        </div>

        {shown.length < filtered.length && (
          <div className="text-center mt-4"><Button variant="secondary" size="sm" onClick={() => setPage((n) => n + 1)}>Show more ({filtered.length - shown.length} left)</Button></div>
        )}
      </GlassCard>
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50">
      {options.map((o) => <option key={o} value={o} className="bg-[#12121a]">{o}</option>)}
    </select>
  )
}

/* -------------------------------------------------------------------------- */

function LeetCodePanel({ lc, busy, onSync, onDisconnect }) {
  const s = lc.stats || {}
  const a = lc.activity
  const synced = lc.syncStatus === 'success'

  return (
    <GlassCard className="p-5" glow="blue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {lc.avatar ? <img src={lc.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-300"><Trophy size={18} /></div>}
          <div>
            <a href={`https://leetcode.com/u/${lc.username}/`} target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:underline">{lc.username}</a>
            <p className="text-[11px] text-ink-faint">
              {synced && lc.lastSyncedAt ? `Synced ${new Date(lc.lastSyncedAt).toLocaleString()}` : lc.syncStatus === 'error' ? 'Last sync failed' : 'Not synced yet'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon={busy === 'sync' ? Loader2 : RefreshCw} onClick={onSync} disabled={busy === 'sync'}>{busy === 'sync' ? 'Syncing…' : 'Sync now'}</Button>
          <Button size="sm" variant="ghost" icon={Unplug} onClick={onDisconnect} disabled={busy === 'disconnect'}>Disconnect</Button>
        </div>
      </div>

      {lc.syncStatus === 'error' && lc.syncError && <p className="text-xs text-red-300 mt-3">{lc.syncError}</p>}

      {synced && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
            <Metric label="Total solved" value={s.totalSolved} />
            <Metric label="Easy" value={s.easySolved} tone="text-emerald-300" />
            <Metric label="Medium" value={s.mediumSolved} tone="text-amber-300" />
            <Metric label="Hard" value={s.hardSolved} tone="text-red-300" />
            <Metric label="Global rank" value={s.ranking ? `#${s.ranking.toLocaleString()}` : '—'} />
            <Metric label="Contest rating" value={lc.contest?.rating ?? '—'} hint={lc.contest ? `${lc.contest.attended} contests` : 'no contests'} />
          </div>

          {a && (
            <div className="grid lg:grid-cols-[1fr_auto] gap-5 mt-5">
              <Heatmap calendar={a.calendar} />
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 text-center lg:min-w-[150px]">
                <Metric label="Current streak" value={`${a.currentStreak}d`} icon={<Flame size={13} className="text-orange-400" />} />
                <Metric label="Longest streak" value={`${a.longestStreak}d`} />
                <Metric label="Active (90d)" value={`${a.activeDaysLast90}d`} />
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-5 mt-5">
            <div>
              <p className="text-xs text-ink-faint mb-2">Topic strength on LeetCode</p>
              <div className="space-y-2">
                {(lc.tags || []).slice(0, 8).map((t) => {
                  const max = lc.tags[0]?.solved || 1
                  return <ProgressBar key={t.slug} label={`${t.name} · ${t.solved}`} value={Math.round((t.solved / max) * 100)} showValue={false} color="blue" />
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-faint mb-2">Recent accepted submissions</p>
              <div className="space-y-1.5">
                {(lc.recent || []).slice(0, 6).map((r, i) => (
                  <a key={`${r.slug}-${i}`} href={`https://leetcode.com/problems/${r.slug}/`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-sm text-ink-dim">
                    <span className="truncate">{r.title}</span>
                    <span className="text-[10px] text-ink-faint shrink-0">{new Date(r.at).toLocaleDateString()}</span>
                  </a>
                ))}
                {!lc.recent?.length && <p className="text-xs text-ink-faint">No recent submissions returned.</p>}
              </div>
            </div>
          </div>

          <p className="flex gap-1.5 text-[11px] text-ink-faint mt-4">
            <Info size={12} className="shrink-0 mt-0.5" />
            LeetCode only shares your counts and most recent accepted submissions publicly, so older solves can't be
            auto-ticked in the catalog below — tick those yourself once.
          </p>
        </>
      )}
    </GlassCard>
  )
}

function Metric({ label, value, tone = 'text-white', hint, icon }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
      <p className="text-[11px] text-ink-faint flex items-center justify-center lg:justify-start gap-1">{icon}{label}</p>
      <p className={`text-lg font-display mt-0.5 ${tone}`}>{value ?? '—'}</p>
      {hint && <p className="text-[10px] text-ink-faint">{hint}</p>}
    </div>
  )
}

function Heatmap({ calendar = {} }) {
  const weeks = 17
  const start = startOfWeek(addDays(new Date(), -(weeks - 1) * 7))
  const max = Math.max(1, ...Object.values(calendar))

  return (
    <div>
      <p className="text-xs text-ink-faint mb-2">Submission activity · last {weeks} weeks</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => {
              const date = addDays(start, w * 7 + d)
              const key = toDayString(date)
              const count = date > new Date() ? -1 : calendar[key] || 0
              const level = count <= 0 ? 0 : Math.ceil((count / max) * 4)
              const shade = ['bg-white/[0.05]', 'bg-emerald-900/70', 'bg-emerald-700/80', 'bg-emerald-500/90', 'bg-emerald-300']
              return <div key={d} title={count >= 0 ? `${key}: ${count} submissions` : ''} className={`h-3 w-3 rounded-[3px] ${count < 0 ? 'opacity-0' : shade[level]}`} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
