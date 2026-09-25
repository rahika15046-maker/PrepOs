import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Catches render errors in a page so one broken component can never blank the
 * whole app. Resets automatically when the user navigates (resetKey changes).
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="max-w-xl mx-auto mt-16 glass rounded-2xl p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-400 mb-3" size={28} />
        <h2 className="font-display text-lg text-white">This page hit a problem</h2>
        <p className="text-sm text-ink-dim mt-2">
          The rest of PrepOS is fine. Try again, or head back to the dashboard.
        </p>
        <pre className="mt-4 text-left text-[11px] text-red-300/80 bg-black/30 rounded-xl p-3 overflow-auto max-h-32">
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-xl text-sm glass text-white hover:border-white/25"
          >
            Try again
          </button>
          <a href="/app" className="px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            Dashboard
          </a>
        </div>
      </div>
    )
  }
}
