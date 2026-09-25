import { Target } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import ProgressBar from '../ui/ProgressBar'
import Badge from '../ui/Badge'
import { fmtDate, fmtMinutes } from '../../lib/dates'

/** Weekly goal: exactly how much must be completed this week, and what's carried. */
export default function WeekGoalCard({ week, compact = false }) {
  if (!week) return null
  const pct = week.targetMinutes ? Math.round((week.completedMinutes / week.targetMinutes) * 100) : 0
  const left = Math.max(0, week.targetMinutes - week.completedMinutes)

  return (
    <GlassCard className={compact ? 'p-4' : 'p-5'} glow="purple">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-300"><Target size={15} /></div>
          <div>
            <p className="text-sm font-medium text-white">Week {week.week} goal</p>
            <p className="text-[11px] text-ink-faint">{fmtDate(week.startDate)} – {fmtDate(week.endDate)}</p>
          </div>
        </div>
        <Badge tone={week.status === 'past' ? 'neutral' : week.status === 'current' ? 'purple' : 'blue'}>{week.status}</Badge>
      </div>

      <p className="text-xs text-ink-dim mt-3">{week.headline}</p>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <Stat label="Target" value={fmtMinutes(week.targetMinutes)} />
        <Stat label="Done" value={fmtMinutes(week.completedMinutes)} tone="text-emerald-300" />
        <Stat label={week.status === 'past' ? 'Missed' : 'Left'} value={fmtMinutes(week.status === 'past' ? week.missedMinutes : left)} tone={week.missedMinutes ? 'text-amber-300' : 'text-white'} />
      </div>

      <ProgressBar value={Math.min(100, pct)} color="purple" className="mt-3" />

      {week.missedMinutes > 0 && week.status !== 'past' && (
        <p className="text-[11px] text-amber-300/90 mt-2">
          {fmtMinutes(week.missedMinutes)} missed earlier this week was rescheduled into the coming days.
        </p>
      )}

      {!compact && week.focus?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {week.focus.map((f) => (
            <span key={f.key} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.05] text-ink-dim">
              {f.title} · {fmtMinutes(f.minutes)}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function Stat({ label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-xl bg-white/[0.03] py-2">
      <p className={`text-sm font-display ${tone}`}>{value}</p>
      <p className="text-[10px] text-ink-faint">{label}</p>
    </div>
  )
}
