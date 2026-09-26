import type { Theme } from '../types'

/** Neutrals are shared (near-black page, dark grey cards); each theme only sets the accent. */
export const NEUTRALS = { bg: '#0B0B0C', surface: '#161618', ink: '#F2F2F0' }

export const THEMES: { id: Theme; name: string; accent: string; accent2: string }[] = [
  { id: 'forest', name: 'Forest', accent: '#1F5A3A', accent2: '#63A67E' },
  { id: 'navy', name: 'Navy', accent: '#1E3A6E', accent2: '#6F92CC' },
  { id: 'plum', name: 'Plum', accent: '#4A2A6B', accent2: '#A282CC' },
]

export function applyTheme(theme: Theme) {
  const t = THEMES.find((x) => x.id === theme) ?? THEMES[0]
  document.documentElement.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', NEUTRALS.bg)
  try { localStorage.setItem('gym-theme', t.id) } catch { /* ignore */ }
}
