import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import PrepOSLogo from '../components/PrepOSLogo'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/'), 1400)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-violet-500/30 rounded-full" />
          <PrepOSLogo size="large" animated className="relative" />
        </div>
        <motion.div
          className="h-1 w-32 rounded-full bg-white/10 overflow-hidden mt-2"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
