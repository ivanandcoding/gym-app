/**
 * Clean-room strength ranking.
 *
 * Method (public formulas only): each rankable lift is converted to an implied
 * powerlifting total through a fixed lift ratio, that total is scored with the
 * Wilks coefficient for the lifter's bodyweight, and the score is Wilks / 4.
 * Belt work (dips, chin-ups, pull-ups) uses total load (bodyweight + added) and
 * a load-dependent ratio. Muscle scores are a cubed-weight average of the lifts
 * that involve the muscle. Height is deliberately not used: no published
 * standard uses it, and it adds nothing once bodyweight is accounted for.
 */
import type { BodyPart } from '../types'

export type RankLift =
  | 'backSquat' | 'frontSquat' | 'deadlift' | 'sumoDeadlift' | 'benchPress' | 'inclineBenchPress'
  | 'dip' | 'overheadPress' | 'pushPress' | 'chinup' | 'pullup' | 'pendlayRow'

/** Which catalogue exercises can be ranked, and as what. */
export const EXERCISE_TO_LIFT: Record<string, RankLift> = {
  'squat': 'backSquat', 'front-squat': 'frontSquat', 'deadlift': 'deadlift', 'sumo-deadlift': 'sumoDeadlift',
  'bench-press': 'benchPress', 'incline-bench-press': 'inclineBenchPress', 'dip': 'dip',
  'overhead-press': 'overheadPress', 'push-press': 'pushPress', 'chin-up': 'chinup', 'pull-up': 'pullup',
  'barbell-row': 'pendlayRow', 'pendlay-row': 'pendlayRow',
}

export type Category = 'squat' | 'floorPull' | 'pullUp' | 'horizontalPress' | 'verticalPress'
export const LIFT_CATEGORY: Record<RankLift, Category> = {
  backSquat: 'squat', frontSquat: 'squat',
  deadlift: 'floorPull', sumoDeadlift: 'floorPull', pendlayRow: 'floorPull',
  benchPress: 'horizontalPress', inclineBenchPress: 'horizontalPress', dip: 'horizontalPress',
  overheadPress: 'verticalPress', pushPress: 'verticalPress',
  chinup: 'pullUp', pullup: 'pullUp',
}
export const CATEGORY_LABEL: Record<Category, string> = {
  squat: 'Squat', floorPull: 'Floor pull', pullUp: 'Pull-up', horizontalPress: 'Horizontal press', verticalPress: 'Vertical press',
}

export function wilksCoefficient(bwKg: number, sex: 'male' | 'female'): number {
  const x = sex === 'male' ? Math.min(Math.max(bwKg, 40), 201.9) : Math.min(Math.max(bwKg, 26.51), 154.53)
  const c = sex === 'male'
    ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8]
    : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8]
  const denom = c[0] + c[1] * x + c[2] * x ** 2 + c[3] * x ** 3 + c[4] * x ** 4 + c[5] * x ** 5
  return 500 / denom
}

/** Fraction of an implied powerlifting total that a lift represents. */
function liftShare(lift: RankLift, sex: 'male' | 'female', addedKg: number): number {
  const dl = sex === 'male' ? 0.396825 : 0.414938
  const squat = dl * (sex === 'male' ? 0.87 : 0.84)
  const bench = dl * (sex === 'male' ? 0.65 : 0.57)
  const ohp = bench * 0.65
  const l = addedKg / 0.45359237 // the belt polynomials are fitted in pounds
  switch (lift) {
    case 'deadlift': case 'sumoDeadlift': return dl
    case 'backSquat': return squat
    case 'frontSquat': return squat * 0.8
    case 'benchPress': return bench
    case 'inclineBenchPress': return bench * 0.82
    case 'overheadPress': return ohp
    case 'pushPress': return ohp * 1.33
    case 'pendlayRow': return dl * 0.53
    case 'dip': return sex === 'male'
      ? 1.68064e-10 * l ** 4 - 1.2946e-7 * l ** 3 + 3.71905e-5 * l ** 2 - 0.00499168 * l + 0.566576
      : 8.249e-10 * l ** 4 - 4.01956e-7 * l ** 3 + 6.22122e-5 * l ** 2 - 0.00431442 * l + 0.37562
    case 'chinup': return chinShare(sex, l)
    case 'pullup': return chinShare(sex, l) * 0.95
  }
}
function chinShare(sex: 'male' | 'female', l: number): number {
  return sex === 'male'
    ? 4.01897e-10 * l ** 4 - 2.34536e-7 * l ** 3 + 5.02252e-5 * l ** 2 - 0.00502633 * l + 0.459545
    : 1.66589e-9 * l ** 4 - 5.1621e-7 * l ** 3 + 5.4088e-5 * l ** 2 - 0.00281674 * l + 0.302005
}

/**
 * Score one lift. `loadKg` is the total load moved (bodyweight + added for belt
 * work) at 1RM or estimated 1RM. Returns Wilks / 4 for the implied total.
 */
export function liftScore(lift: RankLift, loadKg: number, bwKg: number, sex: 'male' | 'female'): number {
  if (!(loadKg > 0) || !(bwKg > 0)) return 0
  const isBelt = lift === 'dip' || lift === 'chinup' || lift === 'pullup'
  const added = isBelt ? loadKg - bwKg : 0
  const share = liftShare(lift, sex, added)
  if (!(share > 0)) return 0
  const impliedTotal = loadKg / share
  return (impliedTotal * wilksCoefficient(bwKg, sex)) / 4
}

export interface Tier { min: number; name: string; color: string }
export const TIERS: Tier[] = [
  { min: 125, name: 'World class', color: '#f6384f' },
  { min: 112.5, name: 'Elite', color: '#ff6033' },
  { min: 100, name: 'Exceptional', color: '#e99e3b' },
  { min: 87.5, name: 'Advanced', color: '#e5c22a' },
  { min: 75, name: 'Proficient', color: '#abcc1d' },
  { min: 60, name: 'Intermediate', color: '#27ce83' },
  { min: 45, name: 'Novice', color: '#3598dc' },
  { min: 30, name: 'Untrained', color: '#5d2ef3' },
  { min: -Infinity, name: 'Starting out', color: '#c40fa2' },
]
export function tierFor(score: number): Tier {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1]
}
/** Score needed for the next tier, or null at the top. */
export function nextTier(score: number): Tier | null {
  const idx = TIERS.findIndex((t) => score >= t.min)
  return idx > 0 ? TIERS[idx - 1] : null
}

type Muscle =
  | 'upperTraps' | 'middleTraps' | 'lowerTraps' | 'frontDelts' | 'sideDelts' | 'rearDelts' | 'rotatorCuff'
  | 'upperChest' | 'lowerChest' | 'biceps' | 'triceps' | 'forearms' | 'serratusAndObliques' | 'abdominals'
  | 'lats' | 'spinalErectors' | 'glutes' | 'hamstrings' | 'quads' | 'hipFlexors' | 'hipAdductors' | 'calves'

/** How much each lift involves each muscle, 0-10. */
const INVOLVEMENT: Record<RankLift, Partial<Record<Muscle, number>>> = {
  backSquat: { serratusAndObliques: 2, abdominals: 6, lats: 2, spinalErectors: 6, glutes: 9, hamstrings: 6, quads: 8, hipFlexors: 4, hipAdductors: 6, calves: 2 },
  frontSquat: { upperTraps: 2, middleTraps: 2, lowerTraps: 2, rotatorCuff: 2, serratusAndObliques: 2, abdominals: 8, spinalErectors: 4, glutes: 7, hamstrings: 4, quads: 10, hipFlexors: 4, hipAdductors: 6, calves: 2 },
  deadlift: { upperTraps: 8, middleTraps: 8, lowerTraps: 2, forearms: 4, serratusAndObliques: 4, abdominals: 6, lats: 4, spinalErectors: 10, glutes: 7, hamstrings: 7, quads: 6, hipFlexors: 2, hipAdductors: 4, calves: 2 },
  sumoDeadlift: { upperTraps: 8, middleTraps: 8, lowerTraps: 2, forearms: 4, serratusAndObliques: 4, abdominals: 6, lats: 4, spinalErectors: 6, glutes: 8, hamstrings: 8, quads: 8, hipFlexors: 4, hipAdductors: 6, calves: 2 },
  benchPress: { frontDelts: 6, rotatorCuff: 2, upperChest: 8, lowerChest: 10, biceps: 2, triceps: 8, forearms: 2, abdominals: 2, lats: 4, spinalErectors: 2, quads: 2 },
  inclineBenchPress: { frontDelts: 6, rotatorCuff: 2, upperChest: 10, lowerChest: 8, biceps: 2, triceps: 8, forearms: 2, abdominals: 2, lats: 4, spinalErectors: 2, quads: 2 },
  dip: { lowerTraps: 6, frontDelts: 6, sideDelts: 2, rotatorCuff: 2, upperChest: 6, lowerChest: 10, triceps: 8, forearms: 2, serratusAndObliques: 2, lats: 2 },
  overheadPress: { upperTraps: 4, middleTraps: 4, lowerTraps: 4, frontDelts: 10, sideDelts: 6, rotatorCuff: 2, upperChest: 4, biceps: 2, triceps: 8, forearms: 2, serratusAndObliques: 2, abdominals: 4, spinalErectors: 2, glutes: 2 },
  pushPress: { upperTraps: 4, middleTraps: 4, lowerTraps: 4, frontDelts: 8, sideDelts: 6, rotatorCuff: 2, upperChest: 2, biceps: 2, triceps: 8, forearms: 2, serratusAndObliques: 2, abdominals: 4, spinalErectors: 2, glutes: 4, hamstrings: 2, quads: 4, hipFlexors: 2, hipAdductors: 6, calves: 3 },
  pullup: { middleTraps: 6, lowerTraps: 6, rearDelts: 6, rotatorCuff: 6, biceps: 6, forearms: 6, serratusAndObliques: 4, abdominals: 6, lats: 10 },
  chinup: { middleTraps: 4, lowerTraps: 4, rearDelts: 6, rotatorCuff: 6, upperChest: 2, lowerChest: 2, biceps: 8, forearms: 4, serratusAndObliques: 4, abdominals: 8, lats: 10 },
  pendlayRow: { upperTraps: 2, middleTraps: 6, lowerTraps: 6, rearDelts: 8, rotatorCuff: 8, lowerChest: 2, biceps: 6, forearms: 4, serratusAndObliques: 4, abdominals: 4, lats: 10, spinalErectors: 5, glutes: 3, hamstrings: 3, hipAdductors: 2, calves: 2 },
}

const MUSCLES_OF: Record<BodyPart, Muscle[]> = {
  chest: ['upperChest', 'lowerChest'],
  back: ['lats', 'upperTraps', 'middleTraps', 'lowerTraps', 'spinalErectors'],
  shoulders: ['frontDelts', 'sideDelts', 'rearDelts', 'rotatorCuff'],
  biceps: ['biceps'], triceps: ['triceps'], forearms: ['forearms'],
  abs: ['abdominals', 'serratusAndObliques'],
  quads: ['quads', 'hipFlexors'], hamstrings: ['hamstrings'],
  glutes: ['glutes', 'hipAdductors'], calves: ['calves'],
}

export interface LiftResult { lift: RankLift; exerciseId: string; loadKg: number; score: number; date: number }
export interface BodyPartResult { bodyPart: BodyPart; score: number | null; drivers: RankLift[] }
export interface RankingResult {
  lifts: LiftResult[]
  bodyParts: BodyPartResult[]
  overall: number | null
  balance: number | null
  byCategory: Partial<Record<Category, LiftResult>>
}

/** Rank from the best score per lift. Input: one entry per rankable exercise with its best load. */
export function rank(lifts: LiftResult[]): RankingResult {
  const byLift = new Map<RankLift, LiftResult>()
  for (const r of lifts) {
    const cur = byLift.get(r.lift)
    if (!cur || r.score > cur.score) byLift.set(r.lift, r)
  }
  const byCategory: Partial<Record<Category, LiftResult>> = {}
  for (const r of byLift.values()) {
    const cat = LIFT_CATEGORY[r.lift]
    if (!byCategory[cat] || r.score > byCategory[cat]!.score) byCategory[cat] = r
  }
  const catScores = Object.values(byCategory).map((r) => r.score)
  const overall = catScores.length ? catScores.reduce((a, b) => a + b, 0) / catScores.length : null
  const liftScores = [...byLift.values()].map((r) => r.score)
  const mean = liftScores.length ? liftScores.reduce((a, b) => a + b, 0) / liftScores.length : 0
  const variance = liftScores.length ? liftScores.reduce((a, s) => a + (s - mean) ** 2, 0) / liftScores.length : 0
  const balance = liftScores.length >= 3 ? 100 - variance : null

  const muscleScore = (m: Muscle): { score: number; drivers: RankLift[] } | null => {
    let num = 0, den = 0
    const drivers: RankLift[] = []
    for (const r of byLift.values()) {
      const w = INVOLVEMENT[r.lift][m] ?? 0
      if (!w) continue
      num += r.score * w ** 3
      den += w ** 3
      drivers.push(r.lift)
    }
    return den >= 50 ? { score: num / den, drivers } : null
  }
  const bodyParts: BodyPartResult[] = (Object.keys(MUSCLES_OF) as BodyPart[]).map((bp) => {
    const parts = MUSCLES_OF[bp].map(muscleScore).filter((x): x is { score: number; drivers: RankLift[] } => !!x)
    if (!parts.length) return { bodyPart: bp, score: null, drivers: [] }
    const score = parts.reduce((a, p) => a + p.score, 0) / parts.length
    const drivers = [...new Set(parts.flatMap((p) => p.drivers))]
    return { bodyPart: bp, score, drivers }
  })
  return { lifts: [...byLift.values()], bodyParts, overall, balance, byCategory }
}

/** Load needed on a lift to reach a target score (inverse of liftScore). */
export function loadForScore(lift: RankLift, target: number, bwKg: number, sex: 'male' | 'female'): number {
  const isBelt = lift === 'dip' || lift === 'chinup' || lift === 'pullup'
  const total = (target * 4) / wilksCoefficient(bwKg, sex)
  if (!isBelt) return total * liftShare(lift, sex, 0)
  // the belt share depends on the added weight itself: iterate
  let load = bwKg
  for (let i = 0; i < 50; i++) {
    const next = total * liftShare(lift, sex, load - bwKg)
    if (Math.abs(next - load) < 0.05) return next
    load = next
  }
  return load
}
