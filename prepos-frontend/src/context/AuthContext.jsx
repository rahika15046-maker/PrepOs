import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMe = useCallback(async () => {
    if (!api.getToken()) {
      setLoading(false)
      return
    }
    try {
      const data = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      api.clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password }, { auth: false })
    api.setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function signup(name, email, password) {
    const data = await api.post('/auth/register', { name, email, password }, { auth: false })
    api.setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    api.clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
