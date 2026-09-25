import { motion } from 'framer-motion'
import PrepOSLogo from '../PrepOSLogo'

export default function LoadingState({ label = 'Loading your progress…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}>
        <PrepOSLogo size="small" showText={false} />
      </motion.div>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  )
}
