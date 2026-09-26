export type Unit = 'kg' | 'lb'

export type BodyPart =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'quads' | 'hamstrings' | 'glutes' | 'calves'

export const BODY_PARTS: BodyPart[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'abs', 'quads', 'hamstrings', 'glutes', 'calves',
]

export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Forearms', abs: 'Abs', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
}

/**
 * How the weight field is interpreted:
 * - weight_reps: external load (barbell total, or one dumbbell)
 * - weighted_bodyweight: added weight on a belt (0 = bodyweight only)
 * - assisted_bodyweight: assistance weight (machine or band help)
 * - bodyweight_reps: reps only, no weight field
 */
export type ExerciseType = 'weight_reps' | 'weighted_bodyweight' | 'assisted_bodyweight' | 'bodyweight_reps'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'

export interface Exercise {
  id: string
  name: string
  bodyPart: BodyPart
  /** Fractional set credit per body part: 1 = primary, 0.5 = secondary. */
  muscles: Partial<Record<BodyPart, number>>
  equipment: Equipment
  type: ExerciseType
  unilateral?: boolean
  defaultRest: number
  custom?: boolean
  archived?: boolean
}

export type SetType = 'warmup' | 'working' | 'drop' | 'failure'

export interface SetEntry {
  id: string
  type: SetType
  /** kg, meaning depends on the exercise type; null = not entered */
  weight: number | null
  reps: number | null
  done: boolean
  doneAt?: number
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  sets: SetEntry[]
  /** rest seconds after a working set */
  rest: number
  note?: string
}

export interface Workout {
  id: string
  templateId?: string
  name: string
  startedAt: number
  finishedAt?: number
  exercises: WorkoutExercise[]
  note?: string
  bodyweightKg?: number
}

export interface TemplateSet {
  /** target reps, free text such as "8-12" or "5" */
  reps: string
  weight: number | null
  type: SetType
}

export interface TemplateExercise {
  id: string
  exerciseId: string
  sets: TemplateSet[]
  rest: number
  note?: string
}

export interface Template {
  id: string
  name: string
  exercises: TemplateExercise[]
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export interface MachineSetting {
  id: string
  label: string
  value: string
}

/** Persistent per-exercise info: a pinned note and machine settings. */
export interface ExerciseMeta {
  pinnedNote?: string
  settings: MachineSetting[]
}

export interface Profile {
  sex: 'male' | 'female'
  heightCm: number
  /** bodyweight log, newest last */
  weights: { date: string; kg: number }[]
}

export interface Settings {
  unit: Unit
  barKg: number
  keepAwake: boolean
  sound: boolean
  defaultRest: number
}

export interface AppData {
  version: 1
  customExercises: Exercise[]
  exerciseMeta: Record<string, ExerciseMeta>
  templates: Template[]
  workouts: Workout[]
  activeWorkout: Workout | null
  profile: Profile
  settings: Settings
}
