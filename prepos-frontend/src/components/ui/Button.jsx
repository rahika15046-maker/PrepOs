const VARIANTS = {
  primary:
    'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-900/40 hover:brightness-110',
  secondary:
    'glass text-white hover:border-white/25',
  ghost:
    'text-ink-dim hover:text-white hover:bg-white/5',
  danger:
    'bg-red-500/90 text-white hover:bg-red-500',
}

const SIZES = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {Icon && iconPosition === 'left' && <Icon size={16} strokeWidth={2.25} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={16} strokeWidth={2.25} />}
    </button>
  )
}
