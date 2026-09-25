export default function Input({ label, icon: Icon, className = '', ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs text-ink-dim mb-1.5">{label}</span>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />}
        <input
          className={`w-full rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-ink-faint
            py-2.5 ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 text-sm outline-none
            focus:border-violet-400/50 focus:bg-white/[0.06] transition-colors`}
          {...rest}
        />
      </div>
    </label>
  )
}
