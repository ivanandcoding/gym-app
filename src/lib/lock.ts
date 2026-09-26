import { useSyncExternalStore } from 'react'

/** Whether the PIN has been entered this session. Lives outside React so Settings can unlock after setting a PIN. */
let unlocked = false
const listeners = new Set<() => void>()

export function setUnlocked(v: boolean) {
  if (unlocked === v) return
  unlocked = v
  listeners.forEach((l) => l())
}

export function useUnlocked(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, () => unlocked)
}
