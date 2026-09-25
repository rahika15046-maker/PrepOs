export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      {Icon && (
        <div className="h-12 w-12 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-3 text-ink-faint">
          <Icon size={20} />
        </div>
      )}
      <p className="text-sm font-medium text-white">{title}</p>
      {subtitle && <p className="text-xs text-ink-faint mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
