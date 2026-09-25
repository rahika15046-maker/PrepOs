import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Splash from './pages/Splash'
import NotFound from './pages/NotFound'
import Onboarding from './pages/onboarding/Onboarding'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/ProtectedRoute'

import Dashboard from './pages/Dashboard'
import Planner from './pages/Planner'
import CalendarPage from './pages/Calendar'
import Roadmap from './pages/Roadmap'
import Skills from './pages/Skills'
import DsaTracker from './pages/DsaTracker'
import CoreCS from './pages/CoreCS'
import Projects from './pages/Projects'
import JobReadiness from './pages/JobReadiness'
import Applications from './pages/Applications'
import LinkedIn from './pages/LinkedIn'
import AIStudy from './pages/AIStudy'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import Focus from './pages/Focus'
import Interview from './pages/Interview'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/splash" element={<Splash />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

      <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="planner" element={<Planner />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="skills" element={<Skills />} />
        <Route path="dsa" element={<DsaTracker />} />
        <Route path="interview" element={<Interview />}/>
        <Route path="core-cs" element={<CoreCS />} />
        <Route path="projects" element={<Projects />} />
        <Route path="job-readiness" element={<JobReadiness />} />
        <Route path="applications" element={<Applications />} />
        <Route path="linkedin" element={<LinkedIn />} />
        <Route path="ai-study" element={<AIStudy />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="focus" element={<Focus />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
