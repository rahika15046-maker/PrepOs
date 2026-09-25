import { useEffect, useState } from 'react'
import { Search, Bell, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

export default function Topbar() {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let mounted = true
    api.get('/notifications').then((res) => mounted && setUnread(res.unreadCount)).catch(() => {})
    return () => { mounted = false }
  }, [])
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-abyss/60 sticky top-0 z-30 backdrop-blur-xl">
      <div className="relative w-full max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          placeholder="Search anything…"
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 py-2 pl-9 pr-3 text-[13px]
            text-white placeholder:text-ink-faint outline-none focus:border-violet-400/40 transition-colors"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-full">
          <Flame size={13} />
          {user?.streak ?? 0} day streak
        </div>
        <Link to="/app/notifications" className="relative text-ink-dim hover:text-white transition-colors">
          <Bell size={18} />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-fuchsia-400" />}
        </Link>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-semibold text-white">
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  )
}
