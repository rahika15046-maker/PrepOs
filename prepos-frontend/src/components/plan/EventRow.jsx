import { Check, Play, RotateCcw, X } from 'lucide-react'
import Badge from '../ui/Badge'

export const TONE_BY_TYPE = {
  study: 'blue', dsa: 'amber', revision: 'purple', project: 'green', interview: 'red',
  application: 'amber', college: 'neutral', fixed: 'neutral', travel: 'neutral',
  meal: 'neutral', exercise: 'green', sleep: 'neutral', break: 'neutral',
}

const STATUS_TONE = {
  Completed: 'green', 'Partially Completed': 'amber', 'In Progress': 'blue',
  Missed: 'red', Skipped: 'neutral', 'Not Started': 'neutral',
}

export const CLOSED = ['Completed', 'Skipped', 'Partially Completed', 'Missed']
export const LEARNING = ['study', 'dsa', 'project', 'revision', 'interview', 'application']

const TYPE_LABEL = {
  study: 'Study', dsa: 'DSA', revision: 'Revision', project: 'Project', interview: 'Interview',
  application: 'Career',
}

export default function EventRow({ event, onStatus, busy, showDate, compact }) {
  const routine = event.locked
  const open = !routine && !CLOSED.includes(event.status)

  return (
    <div
      className={`flex items-center gap-3 rounded-xl transition-colors ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} ${
        routine ? 'bg-white/[0.015] opacity-70' : 'bg-white/[0.03] hover:bg-white/[0.05]'
      }`}
    >
      <span className="text-xs font-mono text-ink-faint w-[92px] shrink-0">
        {showDate && <span className="block text-[10px]">{showDate}</span>}
        {event.start}–{event.end}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${event.status === 'Completed' ? 'text-ink-faint line-through' : 'text-white'}`}>
          {event.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {!routine && <Badge tone={TONE_BY_TYPE[event.type] || 'neutral'}>{TYPE_LABEL[event.type] || event.type}</Badge>}
          {!routine && event.status !== 'Not Started' && <Badge tone={STATUS_TONE[event.status]}>{event.status}</Badge>}
          {event.carryOver > 0 && event.status === 'Not Started' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
              <RotateCcw size={10} /> carried over
            </span>
          )}
          {routine && <span className="text-[10px] text-ink-faint capitalize">{event.type}</span>}
        </div>
      </div>

      {open && onStatus && (
        <div className="flex items-center gap-1.5 shrink-0">
          {event.status === 'Not Started' && (
            <IconBtn title="Start" tone="blue" disabled={busy} onClick={() => onStatus(event._id, 'In Progress')}>
              <Play size={13} />
            </IconBtn>
          )}
          <IconBtn title="Done" tone="green" disabled={busy} onClick={() => onStatus(event._id, 'Completed')}>
            <Check size={13} />
          </IconBtn>
          <button
            disabled={busy}
            onClick={() => onStatus(event._id, 'Partially Completed')}
            className="px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-[10px] disabled:opacity-50"
          >
            Partial
          </button>
          <IconBtn title="Skip (moves it forward)" tone="neutral" disabled={busy} onClick={() => onStatus(event._id, 'Skipped')}>
            <X size={13} />
          </IconBtn>
        </div>
      )}
    </div>
  )
}

function IconBtn({ tone, children, ...rest }) {
  const tones = {
    blue: 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    neutral: 'bg-white/5 text-ink-faint hover:bg-white/10',
  }
  return <button className={`p-2 rounded-lg disabled:opacity-50 ${tones[tone]}`} {...rest}>{children}</button>
}
