import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type { AppData, Exercise, ExerciseMeta, OneRm, Profile, SetEntry, Settings, Template, TemplateExercise, Workout, WorkoutExercise } from './types'
import { EXERCISES, EXERCISE_BY_ID } from './data/exercises'
import { todayStr, uid } from './lib/calc'

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet<string>(name)) ?? null,
  setItem: async (name, value) => { await idbSet(name, value) },
  removeItem: async (name) => { await idbDel(name) },
}

const defaultProfile: Profile = { sex: 'male', heightCm: 179, weights: [{ date: todayStr(), kg: 73 }] }
const defaultSettings: Settings = { unit: 'kg', barKg: 20, keepAwake: true, sound: true, defaultRest: 120, theme: 'forest' }

function tset(reps: string, weight: number | null = null): TemplateExercise['sets'][number] {
  return { reps, weight, type: 'working' }
}
function tex(exerciseId: string, sets: TemplateExercise['sets'], note?: string): TemplateExercise {
  const ex = EXERCISE_BY_ID[exerciseId]
  return { id: uid('te'), exerciseId, sets, rest: ex?.defaultRest ?? 120, note }
}
export function seedTemplates(): Template[] {
  const now = Date.now()
  return [
    {
      id: uid('t'), name: 'Push', createdAt: now, updatedAt: now,
      exercises: [
        tex('dip', [tset('6-8'), tset('6-8'), tset('6-8')], 'Weighted, belt'),
        tex('incline-db-press', [tset('8-12'), tset('8-12'), tset('8-12')]),
        tex('overhead-press', [tset('6-10'), tset('6-10'), tset('6-10')]),
        tex('lateral-raise', [tset('12-15'), tset('12-15'), tset('12-15')]),
        tex('one-arm-cable-tricep-extension', [tset('10-15'), tset('10-15'), tset('10-15')], 'Per arm'),
      ],
    },
    {
      id: uid('t'), name: 'Pull', createdAt: now, updatedAt: now,
      exercises: [
        tex('pull-up', [tset('6-10'), tset('6-10'), tset('6-10')]),
        tex('barbell-row', [tset('6-10'), tset('6-10'), tset('6-10')]),
        tex('seated-cable-row', [tset('10-12'), tset('10-12'), tset('10-12')]),
        tex('face-pull', [tset('15-20'), tset('15-20')]),
        tex('db-curl', [tset('10-12'), tset('10-12'), tset('10-12')]),
      ],
    },
    {
      id: uid('t'), name: 'Legs', createdAt: now, updatedAt: now,
      exercises: [
        tex('squat', [tset('5'), tset('5'), tset('5')]),
        tex('romanian-deadlift', [tset('8-10'), tset('8-10'), tset('8-10')]),
        tex('leg-press', [tset('10-12'), tset('10-12'), tset('10-12')]),
        tex('leg-curl', [tset('10-15'), tset('10-15'), tset('10-15')]),
        tex('calf-raise', [tset('12-15'), tset('12-15'), tset('12-15')]),
      ],
    },
  ]
}

function newSet(type: SetEntry['type'] = 'working', weight: number | null = null, reps: number | null = null): SetEntry {
  return { id: uid('s'), type, weight, reps, done: false }
}

interface Actions {
  // exercises
  allExercises: () => Exercise[]
  exercise: (id: string) => Exercise | undefined
  addCustomExercise: (ex: Omit<Exercise, 'id' | 'custom'>) => Exercise
  updateExercise: (id: string, patch: Partial<Exercise>) => void
  meta: (exerciseId: string) => ExerciseMeta
  setMeta: (exerciseId: string, patch: Partial<ExerciseMeta>) => void
  // templates
  saveTemplate: (t: Template) => void
  deleteTemplate: (id: string) => void
  // workouts
  startWorkout: (templateId?: string) => Workout
  updateActive: (fn: (w: Workout) => void) => void
  addExerciseToActive: (exerciseId: string) => void
  addSet: (weId: string) => void
  finishWorkout: () => Workout | null
  discardWorkout: () => void
  deleteWorkout: (id: string) => void
  updateWorkout: (w: Workout) => void
  // profile / settings
  setProfile: (patch: Partial<Profile>) => void
  logBodyweight: (kg: number, date?: string) => void
  bodyweightAt: (ts: number) => number
  setSettings: (patch: Partial<Settings>) => void
  // tested 1RMs
  addOneRm: (r: Omit<OneRm, 'id'>) => void
  deleteOneRm: (id: string) => void
  setOneRmLifts: (ids: string[]) => void
  // data
  exportJson: () => string
  importJson: (json: string) => { ok: boolean; message: string }
  wipe: () => void
}

export type Store = AppData & Actions & { hydrated: boolean; setHydrated: () => void }

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      version: 1,
      customExercises: [],
      exerciseMeta: {},
      templates: seedTemplates(),
      workouts: [],
      activeWorkout: null,
      profile: defaultProfile,
      settings: defaultSettings,
      oneRms: [],
      oneRmLifts: ['bench-press', 'dip', 'pull-up', 'deadlift'],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      allExercises: () => EXERCISES.concat(get().customExercises).filter((e) => !e.archived),
      exercise: (id) => EXERCISE_BY_ID[id] ?? get().customExercises.find((e) => e.id === id),
      addCustomExercise: (ex) => {
        const created: Exercise = { ...ex, id: uid('cx'), custom: true }
        set({ customExercises: get().customExercises.concat(created) })
        return created
      },
      updateExercise: (id, patch) => {
        set({ customExercises: get().customExercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
      },
      meta: (exerciseId) => get().exerciseMeta[exerciseId] ?? { settings: [] },
      setMeta: (exerciseId, patch) => {
        const cur = get().exerciseMeta[exerciseId] ?? { settings: [] }
        set({ exerciseMeta: { ...get().exerciseMeta, [exerciseId]: { ...cur, ...patch } } })
      },

      saveTemplate: (t) => {
        const list = get().templates
        const i = list.findIndex((x) => x.id === t.id)
        const next = { ...t, updatedAt: Date.now() }
        set({ templates: i >= 0 ? list.map((x) => (x.id === t.id ? next : x)) : list.concat(next) })
      },
      deleteTemplate: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),

      startWorkout: (templateId) => {
        const s = get()
        const t = templateId ? s.templates.find((x) => x.id === templateId) : undefined
        const exercises: WorkoutExercise[] = (t?.exercises ?? []).map((te) => ({
          id: uid('we'),
          exerciseId: te.exerciseId,
          rest: te.rest,
          note: te.note,
          sets: te.sets.map((ts) => newSet(ts.type, ts.weight, null)),
        }))
        const w: Workout = {
          id: uid('w'), templateId: t?.id, name: t?.name ?? 'Workout', startedAt: Date.now(), exercises,
          bodyweightKg: s.bodyweightAt(Date.now()),
        }
        if (t) s.saveTemplate({ ...t, lastUsedAt: Date.now() })
        set({ activeWorkout: w })
        return w
      },
      updateActive: (fn) => {
        const w = get().activeWorkout
        if (!w) return
        const copy: Workout = JSON.parse(JSON.stringify(w))
        fn(copy)
        set({ activeWorkout: copy })
      },
      addExerciseToActive: (exerciseId) => {
        const ex = get().exercise(exerciseId)
        get().updateActive((w) => {
          w.exercises.push({ id: uid('we'), exerciseId, rest: ex?.defaultRest ?? get().settings.defaultRest, sets: [newSet(), newSet(), newSet()] })
        })
      },
      addSet: (weId) => {
        get().updateActive((w) => {
          const we = w.exercises.find((x) => x.id === weId)
          if (!we) return
          const last = we.sets[we.sets.length - 1]
          we.sets.push(newSet('working', last?.weight ?? null, last?.reps ?? null))
        })
      },
      finishWorkout: () => {
        const w = get().activeWorkout
        if (!w) return null
        const done: Workout = {
          ...w,
          finishedAt: Date.now(),
          exercises: w.exercises
            .map((we) => ({ ...we, sets: we.sets.filter((s) => s.done && (s.reps ?? 0) > 0) }))
            .filter((we) => we.sets.length > 0),
        }
        if (!done.exercises.length) { set({ activeWorkout: null }); return null }
        set({ workouts: get().workouts.concat(done), activeWorkout: null })
        return done
      },
      discardWorkout: () => set({ activeWorkout: null }),
      deleteWorkout: (id) => set({ workouts: get().workouts.filter((w) => w.id !== id) }),
      updateWorkout: (w) => set({ workouts: get().workouts.map((x) => (x.id === w.id ? w : x)) }),

      setProfile: (patch) => set({ profile: { ...get().profile, ...patch } }),
      logBodyweight: (kg, date = todayStr()) => {
        const weights = get().profile.weights.filter((w) => w.date !== date).concat({ date, kg }).sort((a, b) => a.date.localeCompare(b.date))
        set({ profile: { ...get().profile, weights } })
      },
      bodyweightAt: (ts) => {
        const day = todayStr(new Date(ts))
        const ws = get().profile.weights
        let best = ws[0]?.kg ?? 73
        for (const w of ws) { if (w.date <= day) best = w.kg }
        return best
      },
      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      addOneRm: (r) => set({ oneRms: get().oneRms.concat({ ...r, id: uid('rm') }).sort((a, b) => a.date.localeCompare(b.date)) }),
      deleteOneRm: (id) => set({ oneRms: get().oneRms.filter((x) => x.id !== id) }),
      setOneRmLifts: (ids) => set({ oneRmLifts: ids }),

      exportJson: () => {
        const s = get()
        const data: AppData = {
          version: 1, customExercises: s.customExercises, exerciseMeta: s.exerciseMeta, templates: s.templates,
          workouts: s.workouts, activeWorkout: s.activeWorkout, profile: s.profile, settings: s.settings,
          oneRms: s.oneRms, oneRmLifts: s.oneRmLifts,
        }
        return JSON.stringify({ app: 'gym-app', exportedAt: new Date().toISOString(), ...data }, null, 1)
      },
      importJson: (json) => {
        try {
          const d = JSON.parse(json)
          if (!d || !Array.isArray(d.workouts)) return { ok: false, message: 'No workouts found in that file' }
          const cur = get()
          const merge = <T extends { id: string }>(a: T[], b: T[]) => {
            const m = new Map(a.map((x) => [x.id, x]))
            for (const x of b) m.set(x.id, x)
            return [...m.values()]
          }
          set({
            workouts: merge(cur.workouts, d.workouts),
            // unused seed templates with the same name as an imported one would only duplicate it
            templates: merge(cur.templates.filter((t) => t.lastUsedAt || !(Array.isArray(d.templates) && d.templates.some((x: Template) => x.name === t.name))), Array.isArray(d.templates) ? d.templates : []),
            customExercises: merge(cur.customExercises, Array.isArray(d.customExercises) ? d.customExercises : []),
            exerciseMeta: { ...cur.exerciseMeta, ...(d.exerciseMeta ?? {}) },
            profile: d.profile ?? cur.profile,
            settings: { ...cur.settings, ...(d.settings ?? {}) },
            oneRms: merge(cur.oneRms, Array.isArray(d.oneRms) ? d.oneRms : []).sort((a, b) => a.date.localeCompare(b.date)),
            oneRmLifts: Array.isArray(d.oneRmLifts) ? d.oneRmLifts : cur.oneRmLifts,
          })
          return { ok: true, message: 'Imported ' + d.workouts.length + ' workouts' }
        } catch {
          return { ok: false, message: 'Could not read that file' }
        }
      },
      wipe: () => set({ workouts: [], activeWorkout: null, templates: seedTemplates(), exerciseMeta: {}, customExercises: [], oneRms: [] }),
    }),
    {
      name: 'gym-app-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        version: s.version, customExercises: s.customExercises, exerciseMeta: s.exerciseMeta, templates: s.templates,
        workouts: s.workouts, activeWorkout: s.activeWorkout, profile: s.profile, settings: s.settings,
        oneRms: s.oneRms, oneRmLifts: s.oneRmLifts,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppData>
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) }, profile: { ...current.profile, ...(p.profile ?? {}) } }
      },
      onRehydrateStorage: () => (state) => { state?.setHydrated() },
    },
  ),
)

/** Convenience: current bodyweight in kg. */
export function useBodyweight(): number {
  return useStore((s) => s.profile.weights[s.profile.weights.length - 1]?.kg ?? 73)
}
