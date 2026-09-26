import type { Theme } from '../types'

export const THEMES: { id: Theme; name: string; bg: string; surface: string; accent: string; accent2: string }[] = [
  { id: 'forest', name: 'Forest', bg: '#0C120F', surface: '#1E2A23', accent: '#8FA77A', accent2: '#B7C9A8' },
  { id: 'navy', name: 'Navy', bg: '#0A1020', surface: '#1A2538', accent: '#7F97B8', accent2: '#B8CAE3' },
  { id: 'plum', name: 'Plum', bg: '#120C16', surface: '#261D31', accent: '#9A7BB0', accent2: '#C6AFD8' },
]

export function applyTheme(theme: Theme) {
  const t = THEMES.find((x) => x.id === theme) ?? THEMES[0]
  document.documentElement.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
  try { localStorage.setItem('gym-theme', t.id) } catch { /* ignore */ }
}
