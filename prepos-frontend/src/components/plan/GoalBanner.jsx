import { CalendarCheck, Flag, Target, TrendingUp } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import ProgressBar from '../ui/ProgressBar'
import { fmtDate, fmtMinutes } from '../../lib/dates'

/** Goal start → learning end → deadline, with an honest projected finish date. */
export default function GoalBanner({ overview }) {
  if (!overview) return null
  const { goal, totals, currentWeek } = overview

  const late = goal.overflowDays > 0
  const tone = late
    ? 'text-amber-300 bg-amber-500/10 border-amber-400/20'
    : 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20'

  return (
    <GlassCard className="p-5" glow="blue">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">Your goal</p>
          <h3 className="font-display text-lg text-white mt-1">{goal.role}</h3>
          <p className="text-xs text-ink-faint mt-1">
            Day {goal.dayNumber} of {goal.totalDays} · {goal.daysLeft} days left
          </p>
        </div>

        <div className={`rounded-xl border px-3.5 py-2.5 text-xs max-w-xs ${tone}`}>
          <div className="flex items-center gap-1.5 font-medium">
            <TrendingUp size={13} />
            {late ? `Finishes ${goal.overflowDays} day(s) after deadline` : 'On track to finish before your deadline'}
          </div>
          {goal.projectedCompletionDate && (
            <p className="mt-1 opacity-90">
              Projected completion: <b>{fmtDate(goal.projectedCompletionDate, { month: 'short', day: 'numeric', year: 'numeric' })}</b>
            </p>
          )}
          {late && (
            <p className="mt-1 opacity-80">Add study time, or extend the deadline in Settings.</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5 text-xs">
        <Milestone icon={Flag} label="Started" value={fmtDate(goal.startDate, { month: 'short', day: 'numeric', year: 'numeric' })} />
        <Milestone icon={CalendarCheck} label="Learning ends" value={goal.learningEndDate ? fmtDate(goal.learningEndDate, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} hint="then final revision & mock interviews" />
        <Milestone icon={Target} label="Goal deadline" value={fmtDate(goal.deadline, { month: 'short', day: 'numeric', year: 'numeric' })} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <ProgressBar
          label={`Overall plan · ${fmtMinutes(totals.completedMinutes)} done`}
          value={totals.percent}
          color="blue"
        />
        {currentWeek && (
          <ProgressBar
            label={`This week · ${fmtMinutes(currentWeek.completedMinutes)} of ${fmtMinutes(currentWeek.targetMinutes)}`}
            value={currentWeek.targetMinutes ? Math.round((currentWeek.completedMinutes / currentWeek.targetMinutes) * 100) : 0}
            color="purple"
          />
        )}
      </div>
    </GlassCard>
  )
}

function Milestone({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-ink-faint"><Icon size={12} />{label}</div>
      <p className="text-white text-sm mt-1">{value}</p>
      {hint && <p className="text-[10px] text-ink-faint mt-0.5">{hint}</p>}
    </div>
  )
}
