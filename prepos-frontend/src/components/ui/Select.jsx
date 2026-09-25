export default function Select({ label, options = [], className = '', ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs text-ink-dim mb-1.5">{label}</span>}
      <select
        className="w-full rounded-xl bg-white/[0.04] border border-white/10 text-white py-2.5 px-3.5 text-sm outline-none focus:border-violet-400/50 transition-colors appearance-none"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o} className="bg-surface-2">
            {o.label ?? o}
          </option>
        ))}
      </select>
    </label>
  )
}
