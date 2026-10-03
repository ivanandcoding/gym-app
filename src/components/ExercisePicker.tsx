import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { BODY_PARTS, BODY_PART_LABEL, type BodyPart, type Equipment, type ExerciseType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (exerciseId: string) => void
  title?: string
}

const GROUPS: { key: BodyPart[]; label: string }[] = [
  { key: ['chest'], label: 'Chest' },
  { key: ['back'], label: 'Back' },
  { key: ['shoulders'], label: 'Shoulders' },
  { key: ['biceps', 'triceps', 'forearms'], label: 'Arms' },
  { key: ['quads', 'hamstrings', 'glutes', 'calves'], label: 'Legs' },
  { key: ['abs'], label: 'Core' },
]

export default function ExercisePicker({ open, onClose, onPick, title = 'Add exercise' }: Props) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [bodyPart, setBodyPart] = useState<BodyPart>('chest')
  const [equipment, setEquipment] = useState<Equipment>('machine')
  const [type, setType] = useState<ExerciseType>('weight_reps')
  const [unilateral, setUnilateral] = useState(false)
  const allExercises = useStore((s) => s.allExercises)
  const addCustom = useStore((s) => s.addCustomExercise)
  const workouts = useStore((s) => s.workouts)
  const customExercises = useStore((s) => s.customExercises)

  useEffect(() => { if (open) { setQ(''); setCreating(false); setName('') } }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const list = useMemo(() => allExercises(), [allExercises, customExercises])
  const recent = useMemo(() => {
    const seen: string[] = []
    for (const w of [...workouts].reverse()) for (const we of w.exercises) if (!seen.includes(we.exerciseId)) seen.push(we.exerciseId)
    return seen.slice(0, 8)
  }, [workouts])
  if (!open) return null

  const query = q.trim().toLowerCase()
  const matches = list.filter((e) => !query || e.name.toLowerCase().includes(query))
  const startCreate = () => { setName(q.trim()); setCreating(true) }
  const create = () => {
    const n = name.trim()
    if (!n) return
    const existing = list.find((e) => e.name.toLowerCase() === n.toLowerCase())
    if (existing) { onPick(existing.id); return }
    const ex = addCustom({ name: n, bodyPart, equipment, type, unilateral, muscles: { [bodyPart]: 1 }, defaultRest: equipment === 'barbell' ? 150 : 90 })
    onPick(ex.id)
  }

  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row-between">
          <div className="h3">{creating ? 'New exercise' : title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {creating ? (
          <div className="stack-sm">
            <div className="field"><label htmlFor="new-ex-name">Name</label>
              <input id="new-ex-name" className="input" autoFocus placeholder="e.g. Machine chest fly" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create() }} />
            </div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <div className="field grow"><label>Body part</label>
                <select className="select" value={bodyPart} onChange={(e) => setBodyPart(e.target.value as BodyPart)}>
                  {BODY_PARTS.map((b) => <option key={b} value={b}>{BODY_PART_LABEL[b]}</option>)}
                </select>
              </div>
              <div className="field grow"><label>Equipment</label>
                <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
                  {(['machine', 'cable', 'dumbbell', 'barbell', 'bodyweight', 'other'] as Equipment[]).map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label>How you log it</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>
                <option value="weight_reps">Weight × reps</option>
                <option value="weighted_bodyweight">Bodyweight + added weight (belt)</option>
                <option value="assisted_bodyweight">Bodyweight with assistance</option>
                <option value="bodyweight_reps">Reps only</option>
              </select>
            </div>
            <label className="row small dim"><input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} /> One side at a time (one arm or leg)</label>
            <div className="row">
              <button type="button" className="btn btn-primary grow" onClick={create} disabled={!name.trim()}>Create and add</button>
              <button type="button" className="btn" onClick={() => setCreating(false)}>Back</button>
            </div>
          </div>
        ) : (
          <>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="input grow" type="search" placeholder="Search exercises" value={q} autoFocus
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (matches[0]) onPick(matches[0].id); else startCreate() } }}
              />
              <button type="button" className="btn btn-primary" onClick={startCreate}>+ New</button>
            </div>
            <div className="sheet-list">
              {!query && recent.length > 0 && (
                <>
                  <div className="grp">Recent</div>
                  {recent.map((id) => { const e = list.find((x) => x.id === id); return e ? <button key={id} type="button" onClick={() => onPick(id)}>{e.name}</button> : null })}
                </>
              )}
              {GROUPS.map((g) => {
                const items = matches.filter((e) => g.key.includes(e.bodyPart))
                if (!items.length) return null
                return (
                  <div key={g.label}>
                    <div className="grp">{g.label}</div>
                    {items.map((e) => (
                      <button key={e.id} type="button" onClick={() => onPick(e.id)}>
                        <span>{e.name}</span>
                        <span className="tiny muted">{e.type === 'weighted_bodyweight' ? 'belt' : e.type === 'bodyweight_reps' ? 'bodyweight' : e.type === 'assisted_bodyweight' ? 'assisted' : e.equipment}{e.unilateral ? ' · per side' : ''}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
              {query && !matches.length && (
                <div className="empty small">No match. <button type="button" className="btn btn-sm btn-primary" style={{ marginLeft: 8 }} onClick={startCreate}>Create “{q.trim()}”</button></div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
