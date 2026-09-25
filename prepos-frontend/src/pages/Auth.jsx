import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Code2, AlertCircle } from 'lucide-react'
import PrepOSLogo from '../components/PrepOSLogo'
import Mascot from '../components/mascot/Mascot'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function Auth({ mode = 'login' }) {
  const isLogin = mode === 'login'
  const navigate = useNavigate()
  const { login, signup } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.target)
    const name = form.get('name')
    const email = form.get('email')
    const password = form.get('password')
    const confirmPassword = form.get('confirmPassword')

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setSubmitting(true)
    try {
      const user = isLogin ? await login(email, password) : await signup(name, email, password)
      if (isLogin) {
        navigate(user.onboarded ? '/app' : '/onboarding')
      } else {
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-void bg-grid flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute h-96 w-96 rounded-full bg-blue-600/20 blur-[100px] -top-20 -left-20" />
      <div className="absolute h-96 w-96 rounded-full bg-violet-600/20 blur-[100px] -bottom-20 -right-20" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-0 rounded-[2rem] overflow-hidden glass glow-blue">
        {/* left: mascot / brand side, visible on large screens */}
        <div className="hidden lg:flex flex-col items-center justify-center p-10 bg-gradient-to-b from-blue-950/40 to-violet-950/30 border-r border-white/[0.06]">
          <PrepOSLogo size="large" />
          <p className="mt-3 text-sm text-ink-dim text-center max-w-xs">
            Your Adaptive Tech Career Preparation Operating System.
          </p>
          <Mascot size={200} className="mt-8" pose="walking" />
        </div>

        {/* right: laptop-screen auth form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-2xl shadow-blue-900/30">
              <div className="rounded-xl bg-surface/80 p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: isLogin ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isLogin ? 12 : -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h1 className="font-display text-xl font-semibold text-white">
                      {isLogin ? 'Welcome back 👋' : 'Create your account'}
                    </h1>
                    <p className="text-xs text-ink-faint mt-1 mb-6">
                      {isLogin ? 'Sign in to continue your journey.' : "Let's start building your path to job-ready."}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                          <AlertCircle size={14} className="shrink-0" /> {error}
                        </div>
                      )}
                      {!isLogin && <Input name="name" label="Name" icon={User} placeholder="Enter your full name" required />}
                      <Input name="email" label={isLogin ? 'Email or username' : 'Email'} icon={Mail} type="email" placeholder="you@example.com" required />
                      <Input name="password" label="Password" icon={Lock} type="password" placeholder="••••••••" required minLength={8} />
                      {!isLogin && <Input name="confirmPassword" label="Confirm password" icon={Lock} type="password" placeholder="••••••••" required minLength={8} />}

                      {isLogin && (
                        <div className="flex items-center justify-between text-xs">
                          <label className="flex items-center gap-2 text-ink-faint">
                            <input type="checkbox" className="rounded border-white/20 bg-white/5" />
                            Remember me
                          </label>
                          <a href="#" className="text-violet-300 hover:text-violet-200">Forgot password?</a>
                        </div>
                      )}

                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Please wait…' : isLogin ? 'Login' : 'Create Account'}
                      </Button>
                    </form>

                    <div className="flex items-center gap-3 my-5 text-[11px] text-ink-faint">
                      <div className="flex-1 h-px bg-white/10" /> or continue with <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="secondary" size="sm">Google</Button>
                      <Button variant="secondary" size="sm" icon={Code2}>GitHub</Button>
                    </div>

                    <p className="text-center text-xs text-ink-faint mt-6">
                      {isLogin ? (
                        <>Don't have an account? <Link to="/signup" className="text-violet-300 hover:text-violet-200">Sign up</Link></>
                      ) : (
                        <>Already have an account? <Link to="/login" className="text-violet-300 hover:text-violet-200">Log in</Link></>
                      )}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
