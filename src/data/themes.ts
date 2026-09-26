import type { Theme } from '../types'

/** Each theme is four colours: page background, card background, accent, text. */
export const THEMES: { id: Theme; name: string; bg: string; surface: string; accent: string; ink: string }[] = [
  { id: 'forest', name: 'Forest', bg: '#0C120F', surface: '#131C17', accent: '#8FA77A', ink: '#F4F1EA' },
  { id: 'navy', name: 'Navy', bg: '#0A1020', surface: '#10192B', accent: '#7F97B8', ink: '#F5F3EE' },
  { id: 'plum', name: 'Plum', bg: '#120C16', surface: '#1A1321', accent: '#9A7BB0', ink: '#F4F1EA' },
]

export function applyTheme(theme: Theme) {
  const t = THEMES.find((x) => x.id === theme) ?? THEMES[0]
  document.documentElement.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
  try { localStorage.setItem('gym-theme', t.id) } catch { /* ignore */ }
}
