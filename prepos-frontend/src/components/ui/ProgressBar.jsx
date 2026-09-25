const COLORS = {
  blue: 'from-blue-500 to-cyan-400',
  purple: 'from-violet-500 to-fuchsia-400',
  green: 'from-emerald-500 to-green-400',
  amber: 'from-amber-500 to-orange-400',
}

export default function ProgressBar({ value = 0, color = 'blue', label, showValue = true, className = '' }) {
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5 text-xs">
          {label && <span className="text-ink-dim">{label}</span>}
          {showValue && <span className="text-ink-faint font-mono">{value}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${COLORS[color]}`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, transition: 'width 0.6s ease' }}
        />
      </div>
    </div>
  )
}
