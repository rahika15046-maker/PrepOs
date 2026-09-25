const TONES = {
  neutral: 'bg-white/[0.06] text-ink-dim',
  blue: 'bg-blue-500/12 text-blue-300',
  purple: 'bg-violet-500/12 text-violet-300',
  green: 'bg-emerald-500/12 text-emerald-300',
  amber: 'bg-amber-500/12 text-amber-300',
  red: 'bg-red-500/12 text-red-300',
}

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}
