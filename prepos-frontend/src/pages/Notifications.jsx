import { useEffect, useState } from 'react'
import { Bell, BellRing, CheckCheck } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'

const TYPE_TONE = { task_reminder: 'blue', revision_due: 'purple', dsa_reminder: 'amber', streak_warning: 'red', deadline_reminder: 'amber', system: 'neutral' }

export default function Notifications() {
  const [notifications, setNotifications] = useState(null)

  async function load() {
    const res = await api.get('/notifications')
    setNotifications(res.notifications)
  }
  useEffect(() => { load() }, [])

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`)
    load()
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all')
    load()
  }

  if (!notifications) return <LoadingState label="Loading notifications…" />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <SectionHeader title="Notifications" subtitle="Reminders and updates from PrepOS" action={<Button size="sm" variant="secondary" icon={CheckCheck} onClick={markAllRead}>Mark all read</Button>} />

      {notifications.length === 0 ? (
        <GlassCard className="p-6"><EmptyState icon={Bell} title="You're all caught up" subtitle="Nothing new right now." /></GlassCard>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <GlassCard key={n._id} className={`p-4 flex items-start gap-3 ${!n.read ? 'border-violet-400/30' : ''}`}>
              <BellRing size={16} className={`mt-0.5 shrink-0 ${n.read ? 'text-ink-faint' : 'text-violet-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white">{n.title}</p>
                  <Badge tone={TYPE_TONE[n.type]}>{n.type.replace(/_/g, ' ')}</Badge>
                </div>
                {n.body && <p className="text-xs text-ink-faint mt-1">{n.body}</p>}
                <p className="text-[10px] text-ink-faint mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n._id)} className="text-[10px] text-violet-300 hover:text-violet-200 shrink-0">Mark read</button>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
