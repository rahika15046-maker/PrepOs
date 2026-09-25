import { motion } from 'framer-motion'

/**
 * Original PrepOS mascot: a friendly, rounded tech-student silhouette
 * with a laptop. Purely geometric/SVG — no reference to any existing
 * copyrighted character.
 */
export default function Mascot({ pose = 'typing', size = 200, className = '' }) {
  const bob = {
    animate: { y: [0, -6, 0] },
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
  }

  const typing = {
    animate: { rotate: [0, -3, 0] },
    transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
  }

  return (
    <motion.svg
      {...bob}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mascot-body" x1="40" y1="30" x2="160" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4338ca" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="mascot-glow" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
        <radialGradient id="mascot-visor" cx="0.5" cy="0.4" r="0.7">
          <stop stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0ea5e9" />
        </radialGradient>
      </defs>

      {/* ambient glow disc */}
      <ellipse cx="100" cy="170" rx="55" ry="10" fill="url(#mascot-glow)" opacity="0.18" />

      {/* body / hoodie */}
      <path
        d="M60 190V130C60 100 78 82 100 82C122 82 140 100 140 130V190H60Z"
        fill="url(#mascot-body)"
      />
      {/* hoodie zipper */}
      <line x1="100" y1="92" x2="100" y2="188" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

      {/* laptop */}
      <g transform="translate(58 138)">
        <rect x="0" y="18" width="84" height="6" rx="2" fill="#0f172a" />
        <motion.g
          {...(pose === 'typing' ? typing : {})}
          style={{ transformOrigin: '4px 18px' }}
        >
          <rect x="4" y="-22" width="76" height="42" rx="4" fill="#0b1120" stroke="#334155" strokeWidth="1.5" />
          <rect x="8" y="-18" width="68" height="34" rx="2" fill="url(#mascot-visor)" opacity="0.85" />
          <path d="M18 -8 L28 2 L18 12" stroke="#0b1120" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M40 -8 L34 12" stroke="#0b1120" strokeWidth="2.4" strokeLinecap="round" />
        </motion.g>
      </g>

      {/* head */}
      <circle cx="100" cy="58" r="34" fill="url(#mascot-body)" />
      {/* headphones band */}
      <path d="M70 50 Q100 22 130 50" stroke="#0f172a" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="62" y="46" width="12" height="22" rx="6" fill="#0f172a" />
      <rect x="126" y="46" width="12" height="22" rx="6" fill="#0f172a" />
      <rect x="65" y="50" width="6" height="14" rx="3" fill="url(#mascot-visor)" />
      <rect x="129" y="50" width="6" height="14" rx="3" fill="url(#mascot-visor)" />

      {/* face visor */}
      <rect x="80" y="52" width="40" height="18" rx="9" fill="#0b1120" />
      <motion.circle
        cx="91" cy="61" r="3.2" fill="#67e8f9"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, times: [0, 0.08, 1] }}
      />
      <circle cx="109" cy="61" r="3.2" fill="#67e8f9" />

      {/* hair tuft */}
      <path d="M78 30 Q90 10 104 22 Q114 8 126 28" stroke="#0f172a" strokeWidth="0" fill="#1e293b" />
    </motion.svg>
  )
}
