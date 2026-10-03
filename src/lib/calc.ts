import type { Exercise, SetEntry, Unit, Workout, BodyPart } from '../types'

export const KG_PER_LB = 0.45359237

export function toUnit(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg
}
export function fromUnit(value: number, unit: Unit): number {
  return unit === 'lb' ? value * KG_PER_LB : value
}
export function fmtNum(v: number, decimals = 1): string {
  const f = Math.pow(10, decimals)
  const r = Math.round(v * f) / f
  return Number.isInteger(r) ? String(r) : r.toFixed(decimals)
}
export function fmtWeight(kg: number, unit: Unit): string {
  return fmtNum(toUnit(kg, unit)) + ' ' + unit
}
export function uid(prefix = 'id'): string {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
export function todayStr(d = new Date()): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function fmtDate(ts: number, withDay = false): string {
  const d = new Date(ts)
  const now = new Date()
  let out = d.getDate() + ' ' + MONTHS[d.getMonth()]
  if (d.getFullYear() !== now.getFullYear()) out += ' ' + d.getFullYear()
  return withDay ? DAYS[d.getDay()] + ' ' + out : out
}
export function fmtDuration(ms: number): string {
  const m = Math.round(ms / 60000)
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'
}
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

/** Total load moved in a set, in kg: what e1RM and rankings are computed on. */
export function systemLoad(ex: Exercise, weight: number | null, bodyweightKg: number): number {
  const w = weight ?? 0
  switch (ex.type) {
    case 'weight_reps': return w
    case 'weighted_bodyweight': return bodyweightKg + w
    case 'assisted_bodyweight': return Math.max(0, bodyweightKg - w)
    case 'bodyweight_reps': return bodyweightKg
  }
}

/**
 * Estimated 1RM. Brzycki for 10 reps or fewer (matches Strong's records),
 * Epley above that, where every formula is only a rough guide.
 */
export function e1rm(load: number, reps: number): number {
  if (!(load > 0) || !(reps > 0)) return 0
  if (reps === 1) return load
  if (reps <= 10) return (load * 36) / (37 - reps)
  return load * (1 + reps / 30)
}

/** e1RM expressed the way the exercise's weight field is shown (added weight for belt work). */
export function displayE1rm(ex: Exercise, weight: number | null, reps: number | null, bodyweightKg: number): number {
  if (!(reps && reps > 0)) return 0
  const total = e1rm(systemLoad(ex, weight, bodyweightKg), reps)
  if (ex.type === 'weighted_bodyweight') return total - bodyweightKg
  if (ex.type === 'assisted_bodyweight') return bodyweightKg - total
  return total
}

export function isCounted(s: SetEntry): boolean {
  return s.done && (s.reps ?? 0) > 0 && s.type !== 'warmup'
}

export function setLabel(ex: Exercise, s: SetEntry, unit: Unit): string {
  const r = s.reps ?? 0
  if (ex.type === 'bodyweight_reps') return r + ' reps'
  const w = s.weight ?? 0
  const prefix = ex.type === 'weighted_bodyweight' ? '+' : ex.type === 'assisted_bodyweight' ? '-' : ''
  return prefix + fmtNum(toUnit(w, unit)) + '×' + r
}

export interface SessionPoint {
  date: number
  workoutId: string
  sets: SetEntry[]
  /** best set by e1RM (or reps for bodyweight-only work) */
  best: SetEntry
  bestE1: number
  volume: number
  bodyweightKg: number
}

/** Chronological per-session summary for one exercise. */
export function sessionsFor(workouts: Workout[], ex: Exercise, bwAt: (ts: number) => number): SessionPoint[] {
  const out: SessionPoint[] = []
  for (const w of workouts) {
    if (!w.finishedAt) continue
    const bw = w.bodyweightKg ?? bwAt(w.startedAt)
    for (const we of w.exercises) {
      if (we.exerciseId !== ex.id) continue
      const sets = we.sets.filter(isCounted)
      if (!sets.length) continue
      let best = sets[0]
      let bestE1 = 0
      let volume = 0
      for (const s of sets) {
        const e = ex.type === 'bodyweight_reps' ? (s.reps ?? 0) : displayE1rm(ex, s.weight, s.reps, bw)
        if (e > bestE1) { bestE1 = e; best = s }
        volume += systemLoad(ex, s.weight, bw) * (s.reps ?? 0)
      }
      out.push({ date: w.startedAt, workoutId: w.id, sets, best, bestE1, volume, bodyweightKg: bw })
    }
  }
  return out.sort((a, b) => a.date - b.date)
}

export interface Records { bestE1: number; bestWeight: number; bestReps: number; bestE1Date?: number }

/** Best marks before a given time (exclusive), optionally ignoring one workout. */
export function recordsBefore(sessions: SessionPoint[], ex: Exercise, before: number, excludeWorkoutId?: string): Records {
  const r: Records = { bestE1: 0, bestWeight: -Infinity, bestReps: 0 }
  for (const s of sessions) {
    if (s.date >= before || s.workoutId === excludeWorkoutId) continue
    if (s.bestE1 > r.bestE1) { r.bestE1 = s.bestE1; r.bestE1Date = s.date }
    for (const st of s.sets) {
      const w = st.weight ?? 0
      if (ex.type !== 'bodyweight_reps' && w > r.bestWeight) r.bestWeight = w
      if ((st.reps ?? 0) > r.bestReps) r.bestReps = st.reps ?? 0
    }
  }
  if (r.bestWeight === -Infinity) r.bestWeight = 0
  return r
}

/** Per-side plate breakdown for a barbell load, in kg. */
export function plates(totalKg: number, barKg: number): string | null {
  const perSide = (totalKg - barKg) / 2
  if (perSide < -0.01) return null
  if (perSide < 0.01) return 'empty bar'
  const sizes = [25, 20, 15, 10, 5, 2.5, 1.25]
  const out: string[] = []
  let left = Math.round(perSide * 100) / 100
  for (const p of sizes) {
    let c = 0
    while (left + 0.001 >= p) { left -= p; c++ }
    if (c) out.push(c > 1 ? c + '×' + p : String(p))
  }
  if (left > 0.05) return null
  return out.join(' + ') + ' per side'
}

/** Fractional working sets per body part in a time window. */
export function setsPerBodyPart(workouts: Workout[], exercises: Record<string, Exercise>, from: number, to: number): Record<BodyPart, number> {
  const out = {} as Record<BodyPart, number>
  for (const w of workouts) {
    if (!w.finishedAt || w.startedAt < from || w.startedAt > to) continue
    for (const we of w.exercises) {
      const ex = exercises[we.exerciseId]
      if (!ex) continue
      const n = we.sets.filter(isCounted).length
      for (const [bp, credit] of Object.entries(ex.muscles)) {
        out[bp as BodyPart] = (out[bp as BodyPart] ?? 0) + n * (credit ?? 0)
      }
    }
  }
  return out
}

/** Next-load suggestion: double progression on the template's rep range. */
export function suggestNext(sets: SetEntry[], targetRepsTop: number | null, ex: Exercise): { weight: number; reason: string } | null {
  const working = sets.filter(isCounted)
  if (!working.length || !targetRepsTop) return null
  const w = working[0].weight ?? 0
  const allTop = working.every((s) => (s.reps ?? 0) >= targetRepsTop)
  if (!allTop) return { weight: w, reason: 'Same load, aim for more reps' }
  const inc = ex.equipment === 'barbell' ? (ex.bodyPart === 'quads' || ex.bodyPart === 'hamstrings' || ex.bodyPart === 'glutes' || ex.id === 'deadlift' ? 5 : 2.5) : ex.equipment === 'dumbbell' ? 2 : 2.5
  return { weight: w + inc, reason: 'All sets hit the top of the range: add ' + inc + ' kg' }
}

/** Local-noon timestamp for a YYYY-MM-DD string. */
export function dateToTs(s: string): number {
  const p = s.split('-').map(Number)
  return new Date(p[0], p[1] - 1, p[2], 12).getTime()
}

/** "today", "yesterday", "3 days ago", "2 weeks ago". */
export function fmtAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return days + ' days ago'
  if (days < 60) return Math.floor(days / 7) + ' weeks ago'
  return Math.floor(days / 30) + ' months ago'
}
