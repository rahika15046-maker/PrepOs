const GLOW = {
  none: '',
  blue: 'glow-blue',
  purple: 'glow-purple',
  cyan: 'glow-cyan',
}

export default function GlassCard({
  as: Tag = 'div',
  glow = 'none',
  hover = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={`glass rounded-2xl ${GLOW[glow] ?? ''} ${
        hover ? 'transition-colors duration-200 hover:border-white/20' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
