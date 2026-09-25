import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import PrepOSLogo from '../components/PrepOSLogo'
import Button from '../components/ui/Button'
import Mascot from '../components/mascot/Mascot'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col items-center justify-center px-6 text-center">
      <PrepOSLogo className="mb-8" />
      <Mascot size={140} className="mb-4" />
      <div className="flex items-center gap-2 text-ink-faint text-xs mb-2">
        <Compass size={14} /> 404
      </div>
      <h1 className="font-display text-2xl font-semibold text-white">This page isn't on the roadmap yet</h1>
      <p className="text-sm text-ink-faint mt-2 max-w-sm">
        The page you're looking for doesn't exist or has moved. Let's get you back on track.
      </p>
      <Link to="/" className="mt-6">
        <Button>Back to safety</Button>
      </Link>
    </div>
  )
}
