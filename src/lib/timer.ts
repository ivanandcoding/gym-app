import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Rest timer kept outside React so it survives navigation, and in localStorage
 * so it survives a reload. iOS freezes JavaScript when the screen locks, so the
 * timer is defined by an end timestamp and re-read whenever the app is visible.
 */
export interface TimerState {
  endAt: number
  total: number
  label: string
  /** set once the end has been noticed and announced */
  finished: boolean
}

const KEY = 'gym-app-timer'
let state: TimerState | null = load()
const listeners = new Set<() => void>()
let interval: ReturnType<typeof setInterval> | null = null
let audio: AudioContext | null = null

function load(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TimerState) : null
  } catch { return null }
}
function save() {
  try { state ? localStorage.setItem(KEY, JSON.stringify(state)) : localStorage.removeItem(KEY) } catch { /* ignore */ }
}
function emit() { listeners.forEach((l) => l()) }
function setState(next: TimerState | null) { state = next; save(); emit() }

function ensureTicking() {
  if (interval) return
  interval = setInterval(tick, 250)
}
function tick() {
  if (!state) { if (interval) { clearInterval(interval); interval = null }; return }
  if (!state.finished && Date.now() >= state.endAt) {
    setState({ ...state, finished: true })
    beep()
    try { navigator.vibrate?.([200, 100, 200]) } catch { /* not on iOS */ }
  } else emit()
}

export function primeAudio() {
  try {
    if (!audio) audio = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (audio.state === 'suspended') void audio.resume()
  } catch { /* no audio */ }
}
let soundEnabled = true
export function setTimerSound(on: boolean) { soundEnabled = on }
function beep() {
  if (!soundEnabled || !audio) return
  try {
    const t0 = audio.currentTime
    ;[0, 0.22, 0.44].forEach((t) => {
      const o = audio!.createOscillator()
      const g = audio!.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, t0 + t)
      g.gain.exponentialRampToValueAtTime(0.3, t0 + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.18)
      o.connect(g); g.connect(audio!.destination)
      o.start(t0 + t); o.stop(t0 + t + 0.2)
    })
  } catch { /* ignore */ }
}

export const timer = {
  start(seconds: number, label: string) {
    primeAudio()
    setState({ endAt: Date.now() + seconds * 1000, total: seconds, label, finished: false })
    ensureTicking()
  },
  add(seconds: number) {
    if (!state) return
    const endAt = Math.max(Date.now(), state.endAt) + seconds * 1000
    setState({ ...state, endAt, total: Math.max(1, Math.round((endAt - (state.endAt - state.total * 1000)) / 1000)), finished: false })
    ensureTicking()
  },
  stop() { setState(null) },
  get: () => state,
}

if (state) ensureTicking()
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick() })

export function useRestTimer() {
  const s = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, () => state)
  // re-render every tick while running
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  const remaining = s ? Math.max(0, (s.endAt - Date.now()) / 1000) : 0
  return { state: s, remaining }
}

/** Keeps the screen on while `enabled` and the page is visible (iOS 18.4+ in installed web apps). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let active = true
    const request = async () => {
      try { if (active && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen') } catch { /* denied */ }
    }
    const onVis = () => { if (document.visibilityState === 'visible') void request() }
    void request()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [enabled])
}
