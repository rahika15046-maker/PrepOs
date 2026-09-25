import GlassCard from './GlassCard'

export default function StatCard({ icon: Icon, label, value, accent = 'blue', trend }) {
  const tints = {
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-violet-400 bg-violet-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  }
  return (
    <GlassCard className="p-4 flex items-center gap-3.5">
      {Icon && (
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tints[accent]}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-lg font-display font-semibold text-white leading-tight truncate">{value}</p>
        <p className="text-xs text-ink-faint truncate">{label}</p>
      </div>
      {trend && <span className="ml-auto text-xs text-emerald-400 font-mono shrink-0">{trend}</span>}
    </GlassCard>
  )
}
