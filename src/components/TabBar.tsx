import { NavLink } from 'react-router-dom'
import { useStore } from '../store'

const tabs = [
  { to: '/', label: 'Train', icon: <path d="M2 12h2M20 12h2M4 9v6M20 9v6M6 7v10M18 7v10M6 12h12" /> },
  { to: '/history', label: 'History', icon: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></> },
  { to: '/progress', label: 'Progress', icon: <path d="M3 20h18M4 16l5-6 4 3 7-8" /> },
  { to: '/body', label: 'Body', icon: <><circle cx="12" cy="5" r="3" /><path d="M6 10h12l-2 4v7h-3v-5h-2v5H8v-7z" /></> },
  { to: '/settings', label: 'Settings', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></> },
]

export default function TabBar() {
  const active = useStore((s) => s.activeWorkout)
  return (
    <nav className="tabbar" aria-label="Sections">
      <div className="tabbar-inner">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            {t.label}{t.to === '/' && active ? ' •' : ''}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
