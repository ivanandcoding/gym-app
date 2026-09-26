import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store'
import { applyTheme } from './data/themes'
import { setUnlocked, useUnlocked } from './lib/lock'
import LockScreen from './components/LockScreen'
import TabBar from './components/TabBar'
import { ToastHost } from './components/Toast'
import Train from './pages/Train'
import WorkoutPage from './pages/Workout'
import TemplateEditor from './pages/TemplateEditor'
import History from './pages/History'
import Progress from './pages/Progress'
import ExerciseDetail from './pages/ExerciseDetail'
import Body from './pages/Body'
import SettingsPage from './pages/Settings'

export default function App() {
  const hydrated = useStore((s) => s.hydrated)
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => { if (hydrated) applyTheme(theme ?? 'forest') }, [hydrated, theme])
  const pinHash = useStore((s) => s.settings.pinHash)
  const lockAfter = useStore((s) => s.settings.lockAfterSec ?? 300)
  const unlocked = useUnlocked()
  useEffect(() => {
    let hiddenAt = 0
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt >= lockAfter * 1000) setUnlocked(false)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [lockAfter])
  const loc = useLocation()
  const fullScreen = loc.pathname.startsWith('/workout') || loc.pathname.startsWith('/template/') || loc.pathname.startsWith('/exercise/')
  if (!hydrated) return <div className="page"><p className="muted">Loading…</p></div>
  if (pinHash && !unlocked) return <LockScreen />
  return (
    <>
      <Routes>
        <Route path="/" element={<Train />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/template/:id" element={<TemplateEditor />} />
        <Route path="/history" element={<History />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/exercise/:id" element={<ExerciseDetail />} />
        <Route path="/body" element={<Body />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!fullScreen && <TabBar />}
      <ToastHost />
    </>
  )
}
