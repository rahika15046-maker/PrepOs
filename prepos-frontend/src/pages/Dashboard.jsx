import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, AlertTriangle, CalendarDays, Sparkles, Play, Plus, Upload, ArrowRight } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import ProgressRing from '../components/ui/ProgressRing'
import ProgressBar from '../components/ui/ProgressBar'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'
import Skeleton from '../components/ui/Skeleton'
import Mascot from '../components/mascot/Mascot'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { toDayString } from '../lib/dates'

const TONE_BY_TYPE = { study: 'blue', college: 'neutral', dsa: 'amber', revision: 'purple', project: 'green', fixed: 'neutral' }

function todayRange() {
  // Schedule dates are calendar days (YYYY-MM-DD), not UTC instants — using a
  // local ISO timestamp here would shift "today" by the browser's UTC offset.
  const today = toDayString()
  return { from: today, to: today }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [weakTopic, setWeakTopic] = useState(null)
  const [deadline, setDeadline] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { from, to } = todayRange()
        const [meRes, readinessRes, scheduleRes, topicsRes, appsRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/job-readiness'),
          api.get(`/schedule?from=${from}&to=${to}&routine=0`),
          api.get('/topics/progress'),
          api.get('/job-applications'),
        ])
        if (!mounted) return
        setProfile(meRes.profile)
        setReadiness({
          overall: readinessRes.readiness,
          breakdown: Object.fromEntries(
            (readinessRes.dimensions || []).map((d) => [d.key, d.score])
          ),
        })
        setSchedule(scheduleRes.events)
        const weak = topicsRes.progress.find((t) => t.status === 'weak')
        setWeakTopic(weak)
        const upcoming = appsRes.applications
          .filter((a) => a.deadline)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0]
        setDeadline(upcoming)
      } catch (err) {
        console.error('[Dashboard] load failed', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const daysIn = profile?.deadlineStartDate
    ? Math.floor((Date.now() - new Date(profile.deadlineStartDate)) / 86400000) + 1
    : 0
  const overallProgress = readiness?.overall ?? 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Good morning, {user?.name ?? 'there'} 👋</h1>
          <p className="text-sm text-ink-faint mt-1">Keep going — you're closer to your goal than you think.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3.5 py-2 rounded-full w-fit">
          <Flame size={14} /> {user?.streak ?? 0} day streak
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="p-6 lg:col-span-2" glow="blue">
          <div className="flex items-start justify-between">
            <div>
              <Badge tone="blue">Day {daysIn || 1} of {profile?.deadlineDays ?? '—'}</Badge>
              <h2 className="font-display text-xl font-semibold text-white mt-3">{profile?.role || 'Set your target role'}</h2>
              <p className="text-sm text-ink-faint">{profile?.stack || 'Finish onboarding to build your plan'}</p>
            </div>
            <Mascot size={72} />
          </div>
          <ProgressBar value={overallProgress} color="blue" label="Overall progress" className="mt-6" />
          <Link to="/app/roadmap">
            <Button size="sm" variant="secondary" icon={ArrowRight} iconPosition="right" className="mt-5">
              View roadmap
            </Button>
          </Link>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col items-center justify-center text-center" glow="purple">
          <SectionHeader title="Job readiness" className="w-full text-left mb-2" />
          {loading ? <Skeleton className="h-28 w-28 rounded-full" /> : (
            <ProgressRing value={readiness?.overall ?? 0} size={110} color="#a855f7" />
          )}
          <p className="text-xs text-ink-faint mt-3">Overall progress across 6 pillars</p>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="p-6 lg:col-span-2">
          <SectionHeader
            title="Today's schedule"
            action={<Link to="/app/calendar" className="text-xs text-violet-300 hover:text-violet-200">View calendar</Link>}
          />
          {loading ? (
            <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
          ) : schedule.length ? (
            <div className="space-y-2.5">
              {schedule.map((s) => (
                <div key={s._id} className="flex items-center gap-4 px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <span className="text-xs font-mono text-ink-faint w-24 shrink-0">{s.start} – {s.end}</span>
                  <span className="text-sm text-white flex-1 truncate">{s.title}</span>
                  <Badge tone={TONE_BY_TYPE[s.type] || 'neutral'}>{s.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint py-6 text-center">Nothing scheduled yet — generate your plan to get started.</p>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeader title="Readiness breakdown" />
          {loading ? (
            <div className="space-y-3.5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : (
            <div className="space-y-3.5">
              {readiness && Object.entries(readiness.breakdown).map(([label, val]) => (
                <ProgressBar key={label} label={label.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())} value={val} color="blue" />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <SectionHeader title="Quick actions" className="mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <Link to="/app/ai-study"><Button variant="secondary" size="sm" icon={Sparkles} className="justify-start w-full">Generate plan</Button></Link>
            <Link to="/app/planner"><Button variant="secondary" size="sm" icon={Play} className="justify-start w-full">Start focus</Button></Link>
            <Link to="/app/planner"><Button variant="secondary" size="sm" icon={Plus} className="justify-start w-full">Add task</Button></Link>
            <Link to="/app/ai-study"><Button variant="secondary" size="sm" icon={Upload} className="justify-start w-full">Upload notes</Button></Link>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-amber-300 mb-2">
            <AlertTriangle size={15} /> <span className="text-xs font-medium">Weak topic</span>
          </div>
          <p className="text-sm text-white">{weakTopic?.topicKey || 'None flagged yet'}</p>
          <p className="text-xs text-ink-faint mt-1">{weakTopic ? 'Revision has been scheduled' : 'Take a quiz to surface weak spots'}</p>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-fuchsia-300 mb-2">
            <CalendarDays size={15} /> <span className="text-xs font-medium">Upcoming deadline</span>
          </div>
          <p className="text-sm text-white">{deadline ? `${deadline.company} — ${deadline.role}` : 'No deadlines tracked'}</p>
          <p className="text-xs text-ink-faint mt-1">{deadline ? new Date(deadline.deadline).toLocaleDateString() : 'Add one in Job Applications'}</p>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col justify-between">
          <p className="text-xs text-ink-faint mb-2">Prep AI</p>
          <p className="text-sm text-white leading-snug">Ask what to focus on today, based on your real progress.</p>
          <Link to="/app/ai-study" className="text-xs text-violet-300 hover:text-violet-200 mt-3">Ask Prep AI →</Link>
        </GlassCard>
      </div>
    </div>
  )
}
