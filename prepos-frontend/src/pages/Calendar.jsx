import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Flag, RotateCcw, Target, CheckCircle2, X, CalendarDays } from 'lucide-react'

import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import GoalBanner from '../components/plan/GoalBanner'
import WeekGoalCard from '../components/plan/WeekGoalCard'
import EventRow, { LEARNING, CLOSED } from '../components/plan/EventRow'
import usePlanSync from '../hooks/usePlanSync'

import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  addDays, clockParams, eventMinutes, fmtDate, fmtMinutes, fromDayString,
  startOfWeek, toDayString,
} from '../lib/dates'

const VIEWS = ['Month', 'Week', 'Day']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function rangeFor(view, anchor) {
  if (view === 'Day') return { from: anchor, to: anchor }
  if (view === 'Week') {
    const s = startOfWeek(anchor)
    return { from: s, to: addDays(s, 6) }
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return { from: startOfWeek(first), to: addDays(startOfWeek(last), 6) }
}

export default function CalendarPage() {
  const { refresh } = useAuth()
  const { overview, error: planError, notice, syncing, version, reload, regenerate, dismissNotice } = usePlanSync()

  const [view, setView] = useState('Month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = rangeFor(view, anchor)
      const routine = view === 'Month' ? '&routine=0' : ''
      const res = await api.get(`/schedule?from=${toDayString(from)}&to=${toDayString(to)}${routine}`)
      setEvents(res.events || [])
    } catch (err) {
      setError(err.message || 'Unable to load the calendar.')
    } finally {
      setLoading(false)
    }
  }, [view, anchor])

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

  const byDay = useMemo(() => {
    const map = {}
    events.forEach((e) => { (map[toDayString(e.date).slice(0, 10)] ||= []).push(e) })
    return map
  }, [events])

  function shift(delta) {
    const d = new Date(anchor)
    if (view === 'Month') d.setMonth(d.getMonth() + delta)
    else d.setDate(d.getDate() + delta * (view === 'Week' ? 7 : 1))
    setAnchor(d)
  }

  const weekFor = (date) => {
    const key = toDayString(startOfWeek(date))
    return overview?.weeks?.find((w) => toDayString(startOfWeek(fromDayString(w.startDate))) === key)
  }

  const label =
    view === 'Month'
      ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : view === 'Week'
        ? `${fmtDate(startOfWeek(anchor))} – ${fmtDate(addDays(startOfWeek(anchor), 6))}`
        : anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <SectionHeader
        title="Study calendar"
        subtitle="Your full plan from today to your goal deadline — with weekly goals and automatic catch-up."
        action={
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={regenerate} disabled={syncing}>
            {syncing ? 'Updating…' : 'Rebuild plan'}
          </Button>
        }
      />

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
          <span>{notice}</span>
          <button onClick={dismissNotice} className="text-violet-200/70 hover:text-white"><X size={15} /></button>
        </div>
      )}

      {(error || planError) && (
        <GlassCard className="p-4 border border-red-500/20">
          <p className="text-sm text-red-300">{error || planError}</p>
        </GlassCard>
      )}

      <GoalBanner overview={overview} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          {VIEWS.map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors ${view === v ? 'bg-white/10 text-white' : 'text-ink-faint hover:text-white'}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => shift(-1)} className="text-ink-faint hover:text-white"><ChevronLeft size={18} /></button>
          <span className="font-display text-sm text-white min-w-[190px] text-center">{label}</span>
          <button onClick={() => shift(1)} className="text-ink-faint hover:text-white"><ChevronRight size={18} /></button>
          <button onClick={() => setAnchor(new Date())} className="text-xs text-violet-300 hover:text-violet-200">Today</button>
        </div>
      </div>

      {loading && !events.length ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : view === 'Month' ? (
        <MonthGrid
          anchor={anchor} byDay={byDay} overview={overview}
          onPick={(d) => { setAnchor(d); setView('Day') }}
          weekFor={weekFor}
        />
      ) : view === 'Week' ? (
        <WeekView anchor={anchor} byDay={byDay} week={weekFor(anchor)} onStatus={setStatus} busyId={busyId}
          onPick={(d) => { setAnchor(d); setView('Day') }} />
      ) : (
        <DayView date={anchor} events={byDay[toDayString(anchor)] || []} onStatus={setStatus} busyId={busyId} onGenerate={regenerate} />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function dayStats(list = []) {
  let planned = 0, done = 0, missed = 0
  list.filter((e) => !e.locked && LEARNING.includes(e.type)).forEach((e) => {
    const m = eventMinutes(e)
    if (e.status === 'Completed') { planned += m; done += m }
    else if (e.status === 'Partially Completed') { planned += m; done += m / 2 }
    else if (e.status === 'Missed' || e.status === 'Skipped') missed += m
    else planned += m
  })
  return { planned, done, missed }
}

function MonthGrid({ anchor, byDay, overview, onPick, weekFor }) {
  const { from } = rangeFor('Month', anchor)
  const todayKey = toDayString()
  const goal = overview?.goal
  const cells = Array.from({ length: 42 }, (_, i) => addDays(from, i))
  const rows = cells.length / 7
  const monthWeeks = Array.from({ length: rows }, (_, r) => weekFor(cells[r * 7]))

  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-5">
      <GlassCard className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {DOW.map((d) => <div key={d} className="text-[10px] text-center text-ink-faint uppercase tracking-wider">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date) => {
            const key = toDayString(date)
            const inMonth = date.getMonth() === anchor.getMonth()
            const { planned, done, missed } = dayStats(byDay[key])
            const isToday = key === todayKey
            const isStart = goal?.startDate === key
            const isDeadline = goal?.deadline === key
            const isProjected = goal?.projectedCompletionDate === key
            const inGoal = goal && key >= goal.startDate && key <= goal.deadline
            const pct = planned ? Math.round((done / planned) * 100) : 0

            return (
              <button
                key={key}
                onClick={() => onPick(date)}
                className={`relative min-h-[74px] rounded-xl p-1.5 text-left border transition-colors
                  ${isToday ? 'border-violet-400/60 bg-violet-500/10' : inGoal ? 'border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.06]' : 'border-transparent bg-transparent hover:bg-white/[0.03]'}
                  ${inMonth ? '' : 'opacity-35'}`}
              >
                <span className={`text-[11px] ${isToday ? 'text-violet-200 font-semibold' : 'text-ink-dim'}`}>{date.getDate()}</span>

                {planned > 0 && (
                  <div className="mt-1.5">
                    <p className="text-[10px] text-ink-faint">{fmtMinutes(planned)}</p>
                    <div className="h-1 rounded-full bg-white/[0.07] mt-1 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {missed > 0 && <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-400" title="Missed sessions were rescheduled" />}

                <div className="absolute top-1 right-1 flex gap-0.5">
                  {isStart && <Flag size={11} className="text-blue-300" title="Goal start" />}
                  {isProjected && !isDeadline && <CheckCircle2 size={11} className="text-emerald-300" title="Projected completion" />}
                  {isDeadline && <Target size={11} className="text-amber-300" title="Goal deadline" />}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-ink-faint">
          <span className="flex items-center gap-1"><Flag size={10} className="text-blue-300" /> start</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-300" /> projected finish</span>
          <span className="flex items-center gap-1"><Target size={10} className="text-amber-300" /> deadline</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> missed → rescheduled</span>
        </div>
      </GlassCard>

      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-ink-faint px-1">Weekly goals this month</p>
        {monthWeeks.filter(Boolean).filter((w, i, a) => a.findIndex((x) => x.week === w.week) === i).map((w) => (
          <WeekGoalCard key={w.week} week={w} compact />
        ))}
      </div>
    </div>
  )
}

function WeekView({ anchor, byDay, week, onStatus, busyId, onPick }) {
  const start = startOfWeek(anchor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="space-y-4">
      {week ? <WeekGoalCard week={week} /> : (
        <GlassCard className="p-4 text-sm text-ink-faint">No goal for this week — it is outside your goal window.</GlassCard>
      )}

      <div className="grid gap-3">
        {days.map((date) => {
          const key = toDayString(date)
          const list = (byDay[key] || []).filter((e) => !e.locked)
          const { planned } = dayStats(byDay[key])
          const isToday = key === toDayString()

          return (
            <GlassCard key={key} className={`p-3.5 ${isToday ? 'border-violet-400/40' : ''}`}>
              <button onClick={() => onPick(date)} className="flex items-center justify-between w-full mb-2.5">
                <span className={`text-sm font-medium ${isToday ? 'text-violet-200' : 'text-white'}`}>
                  {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-[11px] text-ink-faint">{planned ? fmtMinutes(planned) + ' planned' : 'Rest / no study'}</span>
              </button>
              <div className="space-y-1.5">
                {list.map((e) => <EventRow key={e._id} event={e} compact onStatus={onStatus} busy={busyId === e._id} />)}
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}

function DayView({ date, events, onStatus, busyId, onGenerate }) {
  const learning = events.filter((e) => !e.locked && LEARNING.includes(e.type))
  const open = learning.filter((e) => !CLOSED.includes(e.status)).length

  if (!events.length) {
    return (
      <GlassCard className="p-6">
        <EmptyState icon={CalendarDays} title="Nothing scheduled for this day"
          subtitle="It is outside your goal window, or no free time is available."
          action={<Button size="sm" onClick={onGenerate}>Rebuild plan</Button>} />
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-5">
      <p className="text-xs text-ink-faint mb-3">
        {learning.length} learning block{learning.length === 1 ? '' : 's'} · {open} remaining · {fmtMinutes(dayStats(events).planned)} planned
      </p>
      <div className="space-y-2">
        {events.map((e) => <EventRow key={e._id} event={e} onStatus={onStatus} busy={busyId === e._id} />)}
      </div>
    </GlassCard>
  )
}
