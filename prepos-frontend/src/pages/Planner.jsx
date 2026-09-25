import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, RotateCcw, Clock, X, RefreshCcw } from 'lucide-react'

import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import GoalBanner from '../components/plan/GoalBanner'
import WeekGoalCard from '../components/plan/WeekGoalCard'
import EventRow, { LEARNING, CLOSED } from '../components/plan/EventRow'
import usePlanSync from '../hooks/usePlanSync'

import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { clockParams, eventMinutes, fmtMinutes, toDayString } from '../lib/dates'

export default function Planner() {
  const { refresh } = useAuth()
  const { overview, error: planError, notice, syncing, version, reload, regenerate, dismissNotice } = usePlanSync()

  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      const today = toDayString()
      const res = await api.get(`/schedule?from=${today}&to=${today}`)
      setEvents(res.events || [])
    } catch (err) {
      setError(err.message || "Unable to load today's plan.")
      setEvents([])
    }
  }, [])

  useEffect(() => { load() }, [load, version])

  async function setStatus(id, status) {
    setBusyId(id)
    setError('')
    try {
      const res = await api.patch(`/schedule/${id}`, { status, ...clockParams() })
      if (res.replanned) {
        await Promise.all([load(), reload()])
      } else {
        setEvents((cur) => cur.map((e) => (e._id === id ? res.event : e)))
        reload()
      }
      if (status === 'Completed') await refresh()
    } catch (err) {
      setError(err.message || 'Unable to update this block.')
    } finally {
      setBusyId(null)
    }
  }

  const stats = useMemo(() => {
    const learning = (events || []).filter((e) => !e.locked && LEARNING.includes(e.type))
    const done = learning.filter((e) => e.status === 'Completed')
    const partial = learning.filter((e) => e.status === 'Partially Completed')
    const open = learning.filter((e) => !CLOSED.includes(e.status))
    const carried = open.filter((e) => e.carryOver > 0)
    const sum = (l) => l.reduce((s, e) => s + eventMinutes(e), 0)
    return {
      total: learning.length,
      doneMin: sum(done) + sum(partial) / 2,
      openMin: sum(open),
      open: open.length,
      carried: carried.length,
    }
  }, [events])

  if (events === null) return <LoadingState label="Loading today's plan…" />

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SectionHeader
        title="Today"
        subtitle="Finish, partly finish or skip each block — PrepOS re-balances the rest of your plan automatically."
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={RotateCcw} onClick={regenerate} disabled={syncing}>
              {syncing ? 'Updating…' : 'Rebuild'}
            </Button>
            <Link to="/app/focus">
              <Button size="sm" variant="secondary" icon={Play}>Focus mode</Button>
            </Link>
          </div>
        }
      />

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
          <span className="flex gap-2"><RefreshCcw size={15} className="mt-0.5 shrink-0" />{notice}</span>
          <button onClick={dismissNotice} className="text-violet-200/70 hover:text-white"><X size={15} /></button>
        </div>
      )}

      {(error || planError) && (
        <GlassCard className="p-4 border border-red-500/20">
          <p className="text-sm text-red-300">{error || planError}</p>
        </GlassCard>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Mini label="Blocks today" value={stats.total} />
              <Mini label="Studied" value={fmtMinutes(stats.doneMin)} tone="text-emerald-300" />
              <Mini label="Remaining" value={fmtMinutes(stats.openMin)} tone="text-blue-300" />
            </div>
          )}

          {stats.carried > 0 && (
            <p className="text-xs text-amber-300/90 px-1">
              {stats.carried} block{stats.carried > 1 ? 's' : ''} today {stats.carried > 1 ? 'are' : 'is'} carried over from earlier days.
            </p>
          )}

          {events.length === 0 ? (
            <GlassCard className="p-6">
              <EmptyState icon={Clock} title="Nothing planned for today"
                subtitle="You may have no free time today, or your plan needs to be generated."
                action={<Button size="sm" onClick={regenerate}>Generate plan</Button>} />
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <EventRow key={e._id} event={e} onStatus={setStatus} busy={busyId === e._id} />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <WeekGoalCard week={overview?.currentWeek} />
          <Link to="/app/calendar" className="block text-xs text-violet-300 hover:text-violet-200 px-1">
            See the full plan to your deadline →
          </Link>
        </div>
      </div>

      <GoalBanner overview={overview} />
    </div>
  )
}

function Mini({ label, value, tone = 'text-white' }) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={`text-xl font-display mt-1 ${tone}`}>{value}</p>
    </GlassCard>
  )
}
