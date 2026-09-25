import { motion } from 'framer-motion'

const SIZES = {
  small: { mark: 28, text: 'text-lg', gap: 'gap-2' },
  medium: { mark: 38, text: 'text-2xl', gap: 'gap-2.5' },
  large: { mark: 56, text: 'text-4xl', gap: 'gap-3' },
}

/**
 * PrepOSLogo — the single source of truth for brand mark rendering.
 * Usage: <PrepOSLogo size="medium" showText animated />
 */
export default function PrepOSLogo({
  size = 'medium',
  showText = true,
  animated = false,
  className = '',
}) {
  const cfg = SIZES[size] ?? SIZES.medium

  const Mark = (
    <svg
      width={cfg.mark}
      height={cfg.mark}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="prepos-mark-grad" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.55" stopColor="#6366f1" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#prepos-mark-grad)" />
      {/* Stylized "P" cut from the mark, echoing an angular circuit trace */}
      <path
        d="M14 9.5H23.5C27.09 9.5 30 12.41 30 16C30 19.59 27.09 22.5 23.5 22.5H17.5V30.5H14V9.5Z"
        fill="#05070d"
        fillOpacity="0.92"
      />
      <path
        d="M17.5 12.8H23.2C25.08 12.8 26.6 14.27 26.6 16.08C26.6 17.9 25.08 19.36 23.2 19.36H17.5V12.8Z"
        fill="url(#prepos-mark-grad)"
      />
      <circle cx="23.4" cy="16.1" r="1.5" fill="#05070d" />
    </svg>
  )

  return (
    <div className={`inline-flex items-center ${cfg.gap} ${className} group cursor-pointer`}>
      {animated ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.08, rotate: -4 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {Mark}
        </motion.div>
      ) : (
        <motion.div whileHover={{ scale: 1.08, rotate: -4 }} transition={{ duration: 0.2 }}>
          {Mark}
        </motion.div>
      )}
      {showText && (
        <span className={`font-display font-semibold tracking-tight ${cfg.text} text-white`}>
          Prep<span className="text-gradient">OS</span>
        </span>
      )}
    </div>
  )
}
