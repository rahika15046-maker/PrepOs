import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarClock, Calendar, GitBranch, BarChart3, Code2,
  Cpu, FolderGit2, Target, Send, Link2, Sparkles, PieChart, Bell, Settings, MessageSquare,
} from 'lucide-react'
import PrepOSLogo from '../PrepOSLogo'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/planner', label: 'Daily Planner', icon: CalendarClock },
  { to: '/app/calendar', label: 'Calendar', icon: Calendar },
  { to: '/app/roadmap', label: 'Learning Roadmap', icon: GitBranch },
  { to: '/app/skills', label: 'Skills', icon: BarChart3 },
  { to: '/app/dsa', label: 'DSA Tracker', icon: Code2 },
  {to: '/app/interview',label: 'Interview Prep',icon: MessageSquare,},
  { to: '/app/core-cs', label: 'Core CS', icon: Cpu },
  { to: '/app/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/app/job-readiness', label: 'Job Readiness', icon: Target },
  { to: '/app/applications', label: 'Job Applications', icon: Send },
  { to: '/app/linkedin', label: 'LinkedIn Tracker', icon: Link2 },
  { to: '/app/ai-study', label: 'AI Study', icon: Sparkles },
  { to: '/app/analytics', label: 'Analytics', icon: PieChart },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-white/[0.06] bg-abyss/60">
      <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
        <NavLink to="/app" end>
          <PrepOSLogo size="small" animated />
        </NavLink>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors
              ${isActive
                ? 'bg-gradient-to-r from-blue-500/15 to-violet-500/15 text-white border border-white/10'
                : 'text-ink-dim hover:text-white hover:bg-white/[0.04] border border-transparent'}`
            }
          >
            <Icon size={16} strokeWidth={2.1} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
