import type { Exercise } from '../types'

// Rest defaults follow the research: 180 s heavy compounds, 120 s compound hypertrophy work,
// 90 s isolation, 60 s small-muscle isolation.
const ex = (
  id: string, name: string, bodyPart: Exercise['bodyPart'], equipment: Exercise['equipment'],
  muscles: Exercise['muscles'], opts: Partial<Exercise> = {},
): Exercise => ({ id, name, bodyPart, equipment, muscles, type: 'weight_reps', defaultRest: 120, ...opts })

export const EXERCISES: Exercise[] = [
  // Chest
  ex('bench-press', 'Bench Press', 'chest', 'barbell', { chest: 1, triceps: 0.5, shoulders: 0.5 }, { defaultRest: 180 }),
  ex('incline-bench-press', 'Incline Bench Press', 'chest', 'barbell', { chest: 1, triceps: 0.5, shoulders: 0.5 }, { defaultRest: 180 }),
  ex('incline-db-press', 'Incline Dumbbell Press', 'chest', 'dumbbell', { chest: 1, triceps: 0.5, shoulders: 0.5 }),
  ex('db-bench-press', 'Dumbbell Bench Press', 'chest', 'dumbbell', { chest: 1, triceps: 0.5, shoulders: 0.5 }),
  ex('dip', 'Dip', 'chest', 'bodyweight', { chest: 1, triceps: 1, shoulders: 0.5 }, { type: 'weighted_bodyweight', defaultRest: 150 }),
  ex('machine-chest-press', 'Chest Press (Machine)', 'chest', 'machine', { chest: 1, triceps: 0.5 }),
  ex('cable-fly', 'Cable Fly', 'chest', 'cable', { chest: 1 }, { defaultRest: 90 }),
  ex('pec-deck', 'Pec Deck', 'chest', 'machine', { chest: 1 }, { defaultRest: 90 }),
  ex('push-up', 'Push-up', 'chest', 'bodyweight', { chest: 1, triceps: 0.5 }, { type: 'bodyweight_reps', defaultRest: 90 }),
  // Back
  ex('deadlift', 'Deadlift', 'back', 'barbell', { back: 1, hamstrings: 1, glutes: 1 }, { defaultRest: 180 }),
  ex('sumo-deadlift', 'Sumo Deadlift', 'back', 'barbell', { back: 1, glutes: 1, quads: 0.5, hamstrings: 0.5 }, { defaultRest: 180 }),
  ex('barbell-row', 'Barbell Row', 'back', 'barbell', { back: 1, biceps: 0.5 }, { defaultRest: 150 }),
  ex('pendlay-row', 'Pendlay Row', 'back', 'barbell', { back: 1, biceps: 0.5 }, { defaultRest: 150 }),
  ex('pull-up', 'Pull-up', 'back', 'bodyweight', { back: 1, biceps: 0.5 }, { type: 'weighted_bodyweight', defaultRest: 150 }),
  ex('chin-up', 'Chin-up', 'back', 'bodyweight', { back: 1, biceps: 1 }, { type: 'weighted_bodyweight', defaultRest: 150 }),
  ex('lat-pulldown', 'Lat Pulldown', 'back', 'cable', { back: 1, biceps: 0.5 }),
  ex('seated-cable-row', 'Seated Cable Row', 'back', 'cable', { back: 1, biceps: 0.5 }),
  ex('db-row', 'Dumbbell Row', 'back', 'dumbbell', { back: 1, biceps: 0.5 }, { unilateral: true }),
  ex('machine-row', 'Row (Machine)', 'back', 'machine', { back: 1, biceps: 0.5 }),
  ex('assisted-pull-up', 'Assisted Pull-up', 'back', 'machine', { back: 1, biceps: 0.5 }, { type: 'assisted_bodyweight' }),
  ex('face-pull', 'Face Pull', 'shoulders', 'cable', { shoulders: 1, back: 0.5 }, { defaultRest: 60 }),
  // Shoulders
  ex('overhead-press', 'Overhead Press', 'shoulders', 'barbell', { shoulders: 1, triceps: 0.5 }, { defaultRest: 180 }),
  ex('push-press', 'Push Press', 'shoulders', 'barbell', { shoulders: 1, triceps: 0.5, quads: 0.5 }, { defaultRest: 180 }),
  ex('db-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', { shoulders: 1, triceps: 0.5 }),
  ex('machine-shoulder-press', 'Shoulder Press (Machine)', 'shoulders', 'machine', { shoulders: 1, triceps: 0.5 }),
  ex('lateral-raise', 'Lateral Raise', 'shoulders', 'dumbbell', { shoulders: 1 }, { defaultRest: 60 }),
  ex('cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', 'cable', { shoulders: 1 }, { defaultRest: 60, unilateral: true }),
  ex('rear-delt-fly', 'Rear Delt Fly', 'shoulders', 'machine', { shoulders: 1 }, { defaultRest: 60 }),
  // Arms
  ex('barbell-curl', 'Barbell Curl', 'biceps', 'barbell', { biceps: 1, forearms: 0.5 }, { defaultRest: 90 }),
  ex('db-curl', 'Dumbbell Curl', 'biceps', 'dumbbell', { biceps: 1, forearms: 0.5 }, { defaultRest: 90 }),
  ex('hammer-curl', 'Hammer Curl', 'biceps', 'dumbbell', { biceps: 1, forearms: 1 }, { defaultRest: 90 }),
  ex('preacher-curl', 'Preacher Curl', 'biceps', 'machine', { biceps: 1 }, { defaultRest: 90 }),
  ex('cable-curl', 'Cable Curl', 'biceps', 'cable', { biceps: 1 }, { defaultRest: 90 }),
  ex('tricep-pushdown', 'Tricep Pushdown', 'triceps', 'cable', { triceps: 1 }, { defaultRest: 90 }),
  ex('one-arm-cable-tricep-extension', 'One-arm Cable Tricep Extension', 'triceps', 'cable', { triceps: 1 }, { defaultRest: 60, unilateral: true }),
  ex('overhead-tricep-extension', 'Overhead Tricep Extension', 'triceps', 'cable', { triceps: 1 }, { defaultRest: 90 }),
  ex('skull-crusher', 'Skull Crusher', 'triceps', 'barbell', { triceps: 1 }, { defaultRest: 90 }),
  ex('close-grip-bench', 'Close-Grip Bench Press', 'triceps', 'barbell', { triceps: 1, chest: 0.5 }, { defaultRest: 150 }),
  ex('wrist-curl', 'Wrist Curl', 'forearms', 'dumbbell', { forearms: 1 }, { defaultRest: 60 }),
  // Legs
  ex('squat', 'Squat', 'quads', 'barbell', { quads: 1, glutes: 1, hamstrings: 0.5 }, { defaultRest: 180 }),
  ex('front-squat', 'Front Squat', 'quads', 'barbell', { quads: 1, glutes: 0.5, abs: 0.5 }, { defaultRest: 180 }),
  ex('leg-press', 'Leg Press', 'quads', 'machine', { quads: 1, glutes: 0.5 }, { defaultRest: 150 }),
  ex('hack-squat', 'Hack Squat', 'quads', 'machine', { quads: 1, glutes: 0.5 }, { defaultRest: 150 }),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'quads', 'dumbbell', { quads: 1, glutes: 1 }, { unilateral: true }),
  ex('lunge', 'Lunge', 'quads', 'dumbbell', { quads: 1, glutes: 1 }, { unilateral: true }),
  ex('leg-extension', 'Leg Extension', 'quads', 'machine', { quads: 1 }, { defaultRest: 90 }),
  ex('romanian-deadlift', 'Romanian Deadlift', 'hamstrings', 'barbell', { hamstrings: 1, glutes: 1, back: 0.5 }, { defaultRest: 150 }),
  ex('leg-curl', 'Leg Curl', 'hamstrings', 'machine', { hamstrings: 1 }, { defaultRest: 90 }),
  ex('hip-thrust', 'Hip Thrust', 'glutes', 'barbell', { glutes: 1, hamstrings: 0.5 }, { defaultRest: 120 }),
  ex('glute-kickback', 'Cable Glute Kickback', 'glutes', 'cable', { glutes: 1 }, { defaultRest: 60, unilateral: true }),
  ex('calf-raise', 'Standing Calf Raise', 'calves', 'machine', { calves: 1 }, { defaultRest: 60 }),
  ex('seated-calf-raise', 'Seated Calf Raise', 'calves', 'machine', { calves: 1 }, { defaultRest: 60 }),
  // Core
  ex('cable-crunch', 'Cable Crunch', 'abs', 'cable', { abs: 1 }, { defaultRest: 60 }),
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'abs', 'bodyweight', { abs: 1 }, { type: 'bodyweight_reps', defaultRest: 60 }),
  ex('ab-wheel', 'Ab Wheel', 'abs', 'bodyweight', { abs: 1 }, { type: 'bodyweight_reps', defaultRest: 60 }),
  ex('plank', 'Plank (reps of 30 s)', 'abs', 'bodyweight', { abs: 1 }, { type: 'bodyweight_reps', defaultRest: 60 }),
  ex('back-extension', 'Back Extension', 'back', 'bodyweight', { back: 1, glutes: 0.5, hamstrings: 0.5 }, { type: 'weighted_bodyweight', defaultRest: 90 }),
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))
