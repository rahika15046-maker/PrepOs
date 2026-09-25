import { useEffect, useState } from 'react'
import { Plus, ExternalLink, Trash2, Lightbulb, Link2 } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import SectionHeader from '../components/ui/SectionHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const STATUS_TONE = { Idea: 'neutral', 'In Progress': 'blue', Completed: 'green' }

export default function Projects() {
  const { refresh } = useAuth()
  const [projects, setProjects] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', techStack: '', githubUrl: '', status: 'Idea' })

  async function load() {
    const [pRes, sRes] = await Promise.all([api.get('/projects'), api.get('/projects/recommendations')])
    setProjects(pRes.projects)
    setSuggestions(sRes.suggestions)
  }
  useEffect(() => { load() }, [])

  async function createProject(e) {
    e.preventDefault()
    await api.post('/projects', { ...form, techStack: form.techStack.split(',').map((t) => t.trim()).filter(Boolean) })
    setOpen(false)
    setForm({ name: '', description: '', techStack: '', githubUrl: '', status: 'Idea' })
    load()
    refresh()
  }

  async function updateStatus(id, status) {
    await api.patch(`/projects/${id}`, { status })
    load()
    if (status === 'Completed') refresh()
  }

  async function remove(id) {
    await api.delete(`/projects/${id}`)
    load()
  }

  if (!projects) return <LoadingState label="Loading your projects…" />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SectionHeader title="Projects" subtitle="Track and showcase what you've built" action={<Button size="sm" icon={Plus} onClick={() => setOpen(true)}>Add project</Button>} />

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <div key={s.skillName} className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <Lightbulb size={12} /> {s.suggestion}
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        <GlassCard className="p-6"><EmptyState title="No projects yet" subtitle="Add your first project to start tracking it." action={<Button size="sm" onClick={() => setOpen(true)}>Add project</Button>} /></GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <GlassCard key={p._id} className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-white">{p.name}</h3>
                <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              </div>
              <p className="text-xs text-ink-faint mb-3 line-clamp-2">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(p.techStack || []).map((t) => <Badge key={t}>{t}</Badge>)}
              </div>
              <div className="flex items-center gap-3 mb-3">
                {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" className="text-ink-faint hover:text-white"><Link2 size={14} /></a>}
                {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" className="text-ink-faint hover:text-white"><ExternalLink size={14} /></a>}
                <button onClick={() => remove(p._id)} className="ml-auto text-ink-faint hover:text-red-400"><Trash2 size={14} /></button>
              </div>
              <div className="flex gap-1.5">
                {['Idea', 'In Progress', 'Completed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(p._id, s)}
                    className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-colors ${p.status === s ? 'border-violet-400/50 bg-violet-500/10 text-white' : 'border-white/10 text-ink-faint hover:border-white/20'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add project">
        <form onSubmit={createProject} className="space-y-3">
          <Input label="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Tech stack (comma separated)" value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} />
          <Input label="GitHub URL" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={['Idea', 'In Progress', 'Completed']} />
          <Button type="submit" className="w-full">Add project</Button>
        </form>
      </Modal>
    </div>
  )
}
