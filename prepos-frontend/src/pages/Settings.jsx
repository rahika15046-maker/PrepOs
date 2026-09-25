import { useEffect, useState } from 'react'
import { LogOut, Sparkles } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function Settings() {
  const { user, logout, setUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)

  useEffect(() => { api.get('/ai/status').then(setAiStatus).catch(() => {}) }, [])

  async function saveName(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.patch('/users/me', { name })
      setUser(res.user)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <SectionHeader title="Settings" subtitle="Account and preferences" />

      <GlassCard className="p-6">
        <SectionHeader title="Profile" />
        <form onSubmit={saveName} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </form>
        <p className="text-xs text-ink-faint mt-3">{user?.email}</p>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionHeader title="AI provider" subtitle="Configured on the backend via AI_PROVIDER" />
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-300" />
          <span className="text-sm text-white capitalize">{aiStatus?.provider || 'mock'}</span>
          <Badge tone={aiStatus?.live ? 'green' : 'neutral'}>{aiStatus?.live ? 'Live' : 'Mock mode'}</Badge>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionHeader title="Session" />
        <Button variant="danger" icon={LogOut} onClick={logout}>Log out</Button>
      </GlassCard>
    </div>
  )
}
