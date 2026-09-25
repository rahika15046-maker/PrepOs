import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle, Route, CalendarClock, Sparkles, Code2, Target } from 'lucide-react'
import PrepOSLogo from '../components/PrepOSLogo'
import Mascot from '../components/mascot/Mascot'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import StatCard from '../components/ui/StatCard'

const FEATURES = [
  { icon: Route, title: 'Personalized Roadmap', desc: 'A learning path built around your target role, stack, and current skill level — not a generic syllabus.' },
  { icon: CalendarClock, title: 'Adaptive Scheduling', desc: 'Your college hours, sleep, and travel time are respected. The plan reshapes itself around your real life.' },
  { icon: Sparkles, title: 'AI Learning Assistant', desc: 'Turn messy or handwritten notes into clean summaries, flashcards, quizzes, and interview questions.' },
  { icon: Code2, title: 'DSA Tracking', desc: 'Every problem you solve updates your confidence score and quietly schedules the revision you need.' },
  { icon: Target, title: 'Job Readiness', desc: 'One score built from your development, DSA, core CS, projects, resume, and interview prep.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-void bg-grid overflow-x-hidden">
      <header className="flex items-center justify-between px-6 sm:px-10 h-20 max-w-7xl mx-auto">
        <Link to="/"><PrepOSLogo animated /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-dim">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
          <Link to="/signup"><Button size="sm">Get Started</Button></Link>
        </div>
      </header>

      <section className="relative max-w-7xl mx-auto px-6 sm:px-10 pt-10 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-[11px] font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full mb-6"
          >
            AI-powered · Adaptive · For tech careers
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] text-white"
          >
            Your life. Your learning.<br />
            Your career.<br />
            <span className="text-gradient">One adaptive system.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-ink-dim max-w-md leading-relaxed"
          >
            PrepOS helps tech students go from current skill level to job-ready — with a
            roadmap, schedule, and study plan that adjusts to your real timetable, not the other way around.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link to="/signup"><Button size="lg" icon={ArrowRight} iconPosition="right">Build My Plan</Button></Link>
            <Button size="lg" variant="secondary" icon={PlayCircle}>Watch Demo</Button>
          </motion.div>

          <div className="mt-12 grid grid-cols-3 gap-3 max-w-md">
            <StatCard label="Tech learners" value="50K+" accent="blue" />
            <StatCard label="Tech roles" value="25+" accent="purple" />
            <StatCard label="User rating" value="4.8/5" accent="cyan" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />
          <GlassCard glow="purple" className="relative p-10 rounded-[2rem] flex flex-col items-center">
            <Mascot size={220} />
            <div className="mt-4 grid grid-cols-2 gap-2 w-full">
              {['Learn', 'Build', 'Practice', 'Get Hired'].map((t) => (
                <div key={t} className="text-xs text-center py-2 rounded-lg bg-white/[0.04] text-ink-dim">{t}</div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 sm:px-10 py-16">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white text-center mb-3">
          Everything job-readiness needs, adapted to you
        </h2>
        <p className="text-ink-faint text-center max-w-xl mx-auto mb-12 text-sm">
          Five systems working together, quietly recalculating as you learn.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <GlassCard key={title} hover className="p-5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-4 text-violet-300">
                <Icon size={18} />
              </div>
              <h3 className="text-sm font-medium text-white mb-1.5">{title}</h3>
              <p className="text-xs text-ink-faint leading-relaxed">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06]">
        <PrepOSLogo size="small" />
        <p className="text-xs text-ink-faint">© {new Date().getFullYear()} PrepOS. Built for tech careers only.</p>
      </footer>
    </div>
  )
}
