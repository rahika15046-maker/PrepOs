import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Calendar, GitBranch, Sparkles, Target } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ErrorBoundary from '../ErrorBoundary'

const MOBILE_NAV = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: Calendar },
  { to: '/app/roadmap', label: 'Roadmap', icon: GitBranch },
  { to: '/app/ai-study', label: 'Prep AI', icon: Sparkles },
  { to: '/app/job-readiness', label: 'Ready', icon: Target },
]

export default function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex bg-void bg-grid">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 glass border-t border-white/10 flex items-center justify-around z-40">
        {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] ${isActive ? 'text-violet-300' : 'text-ink-faint'}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
