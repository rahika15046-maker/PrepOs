import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Badge from '../components/ui/Badge'
import LoadingState from '../components/ui/LoadingState'
import StatCard from '../components/ui/StatCard'
import { TrendingUp, Target, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  function load() {
    setError('')
    api.get('/analytics')
      .then(setData)
      .catch((err) => setError(err?.message || 'Unable to load analytics.'))
  }

  useEffect(load, [])

  if (error && !data) {
    return (
      <div className="max-w-6xl mx-auto">
        <GlassCard className="p-6 text-sm text-red-300 text-center">
          {error}
          <button onClick={load} className="block mx-auto mt-3 text-xs underline text-ink-faint hover:text-white">
            Retry
          </button>
        </GlassCard>
      </div>
    )
  }

  if (!data) return <LoadingState label="Crunching your analytics…" />

  const chartData = data.dailyConsistency.map((d) => ({ date: d.date.slice(5), rate: d.completionRate }))

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <SectionHeader title="Analytics" subtitle="Your prep, visualized — last 30 days" />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Task completion rate" value={`${data.taskCompletion.rate}%`} accent="blue" />
        <StatCard icon={Target} label="Tasks completed" value={`${data.taskCompletion.completed}/${data.taskCompletion.total}`} accent="purple" />
        <StatCard icon={AlertTriangle} label="Weak topics" value={data.weakTopics.length} accent="amber" />
      </div>

      <GlassCard className="p-6">
        <SectionHeader title="Daily consistency" subtitle="% of scheduled blocks completed each day" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(148,163,209,0.08)" vertical={false} />
              <XAxis dataKey="date" stroke="#5c6489" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#5c6489" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#10162a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid sm:grid-cols-2 gap-5">
        <GlassCard className="p-6">
          <SectionHeader title="DSA solved by topic" />
          <div className="space-y-2">
            {Object.entries(data.dsaSolvedByTopic).length ? Object.entries(data.dsaSolvedByTopic).map(([topic, count]) => (
              <div key={topic} className="flex items-center justify-between text-sm">
                <span className="text-ink-dim">{topic}</span>
                <span className="text-white font-mono">{count}</span>
              </div>
            )) : <p className="text-xs text-ink-faint">No DSA problems solved yet.</p>}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeader title="Weak topics" />
          <div className="flex flex-wrap gap-2">
            {data.weakTopics.length ? data.weakTopics.map((t) => <Badge key={t} tone="amber">{t}</Badge>) : <p className="text-xs text-ink-faint">Nothing flagged — nice work.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
