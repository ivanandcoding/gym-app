import { useStore } from '../store'
import { todayStr } from './calc'

/**
 * Daily snapshots of the whole store in localStorage (last 7 kept), as a
 * safety net against a bad write or an emptied database. Same device only.
 */
const PREFIX = 'gym-backup-'

export interface Snapshot { key: string; date: string; workouts: number; bytes: number }

export function listSnapshots(): Snapshot[] {
  const out: Snapshot[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      const raw = localStorage.getItem(k) ?? ''
      let workouts = 0
      try { workouts = (JSON.parse(raw).workouts ?? []).length } catch { /* corrupt snapshot */ }
      out.push({ key: k, date: k.slice(PREFIX.length), workouts, bytes: raw.length })
    }
  } catch { /* storage blocked */ }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

/** Save today's snapshot. Skips when one exists for today unless forced, or when there is nothing to save. */
export function takeSnapshot(force = false): boolean {
  const s = useStore.getState()
  if (!s.workouts.length && !s.oneRms.length) return false
  const today = todayStr()
  if (!force && listSnapshots().some((x) => x.date === today)) return false
  try { localStorage.setItem(PREFIX + today, s.exportJson()) } catch { return false }
  for (const old of listSnapshots().slice(7)) { try { localStorage.removeItem(old.key) } catch { /* ignore */ } }
  return true
}

export function restoreSnapshot(key: string): { ok: boolean; message: string } {
  let raw: string | null = null
  try { raw = localStorage.getItem(key) } catch { /* ignore */ }
  if (!raw) return { ok: false, message: 'That backup is missing' }
  return useStore.getState().importJson(raw)
}

export function newestSnapshotWithData(): Snapshot | null {
  return listSnapshots().find((x) => x.workouts > 0) ?? null
}
