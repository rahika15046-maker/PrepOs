import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Check } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import SectionHeader from '../components/ui/SectionHeader'

const FOCUS_MIN = 25
const BREAK_MIN = 5

export default function Focus() {
  const [mode, setMode] = useState('focus') // focus | break
  const [seconds, setSeconds] = useState(FOCUS_MIN * 60)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setMode((m) => (m === 'focus' ? 'break' : 'focus'))
            return (mode === 'focus' ? BREAK_MIN : FOCUS_MIN) * 60
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const total = (mode === 'focus' ? FOCUS_MIN : BREAK_MIN) * 60
  const progress = ((total - seconds) / total) * 100

  function reset() {
    setRunning(false)
    setMode('focus')
    setSeconds(FOCUS_MIN * 60)
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <SectionHeader title="Focus mode" subtitle="One task, one timer, no distractions." />

      <GlassCard className="p-10 flex flex-col items-center" glow={mode === 'focus' ? 'blue' : 'purple'}>
        <span className="text-xs uppercase tracking-wider text-ink-faint mb-4">{mode === 'focus' ? 'Deep work' : 'Break'}</span>

        <div className="relative h-56 w-56 flex items-center justify-center">
          <svg width={224} height={224} className="-rotate-90 absolute">
            <circle cx={112} cy={112} r={100} stroke="rgba(255,255,255,0.06)" strokeWidth={10} fill="none" />
            <circle
              cx={112} cy={112} r={100}
              stroke={mode === 'focus' ? '#38bdf8' : '#a78bfa'} strokeWidth={10} fill="none"
              strokeDasharray={2 * Math.PI * 100}
              strokeDashoffset={2 * Math.PI * 100 * (1 - progress / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="font-display text-5xl font-semibold text-white z-10">{mm}:{ss}</span>
        </div>

        <div className="flex items-center gap-3 mt-8">
          <Button variant="secondary" icon={RotateCcw} onClick={reset} size="sm" />
          <Button icon={running ? Pause : Play} onClick={() => setRunning((r) => !r)} size="lg">
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button variant="secondary" icon={Check} size="sm" onClick={() => { setRunning(false); setMode('focus'); setSeconds(FOCUS_MIN * 60) }} />
        </div>
      </GlassCard>
    </div>
  )
}
