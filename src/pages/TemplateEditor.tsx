import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import type { Template, TemplateExercise } from '../types'
import { fmtClock, fmtNum, fromUnit, toUnit, uid } from '../lib/calc'
import ExercisePicker from '../components/ExercisePicker'
import RestSelect from '../components/RestSelect'


export default function TemplateEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const t = useStore((s) => s.templates.find((x) => x.id === id))
  const save = useStore((s) => s.saveTemplate)
  const remove = useStore((s) => s.deleteTemplate)
  const exercise = useStore((s) => s.exercise)
  const unit = useStore((s) => s.settings.unit)
  const [picker, setPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (!t) return <div className="page full"><p className="muted">Template not found.</p><Link to="/">Back</Link></div>

  const patch = (fn: (x: Template) => void) => { const copy: Template = JSON.parse(JSON.stringify(t)); fn(copy); save(copy) }
  const patchEx = (teId: string, fn: (x: TemplateExercise) => void) => patch((x) => { const e = x.exercises.find((q) => q.id === teId); if (e) fn(e) })
  const move = (i: number, dir: -1 | 1) => patch((x) => { const j = i + dir; if (j < 0 || j >= x.exercises.length) return; [x.exercises[i], x.exercises[j]] = [x.exercises[j], x.exercises[i]] })

  return (
    <div className="page full">
      <header className="topbar">
        <h1 className="title">Edit template</h1>
        <Link className="btn btn-primary btn-sm" to="/">Done</Link>
      </header>
      <div className="stack">
        <div className="field">
          <label htmlFor="tname">Name</label>
          <input id="tname" className="input" value={t.name} onChange={(e) => patch((x) => { x.name = e.target.value })} />
        </div>
        {t.exercises.map((te, i) => {
          const ex = exercise(te.exerciseId)
          if (!ex) return null
          const bwOnly = ex.type === 'bodyweight_reps'
          return (
            <div key={te.id} className="card">
              <div className="card-head">
                <div className="grow">
                  <div className="h3">{ex.name}</div>
                  <div className="tiny muted">{te.sets.length} sets · rest {fmtClock(te.rest)}</div>
                </div>
                <div className="row" style={{ gap: 2 }}>
                  <button type="button" className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === t.exercises.length - 1}>↓</button>
                  <button type="button" className="icon-btn" aria-label="Remove exercise" onClick={() => patch((x) => { x.exercises = x.exercises.filter((q) => q.id !== te.id) })}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              </div>
              <div className="card-body stack-sm">
                <div className="sets" style={{ gridTemplateColumns: '34px 1fr 1fr 44px' }}>
                  <div className="col-h">Set</div><div className="col-h">Target reps</div><div className="col-h">{bwOnly ? '' : ex.type === 'weighted_bodyweight' ? '+' + unit : unit}</div><div />
                  {te.sets.map((ts, j) => (
                    <div key={j} style={{ display: 'contents' }}>
                      <select className={'set-n ' + ts.type} value={ts.type} aria-label={'Set ' + (j + 1) + ' type'} onChange={(e) => patchEx(te.id, (x) => { x.sets[j].type = e.target.value as TemplateExercise['sets'][number]['type'] })}>
                        <option value="working">{j + 1}</option><option value="warmup">W</option><option value="drop">D</option><option value="failure">F</option>
                      </select>
                      <input className="set-input" type="text" placeholder="8-12" value={ts.reps} onChange={(e) => patchEx(te.id, (x) => { x.sets[j].reps = e.target.value })} aria-label={'Set ' + (j + 1) + ' target reps'} />
                      {bwOnly ? <div className="prev">BW</div> : (
                        <input className="set-input" type="text" inputMode="decimal" placeholder="—" value={ts.weight == null ? '' : fmtNum(toUnit(ts.weight, unit), 2)}
                          onChange={(e) => patchEx(te.id, (x) => { const n = parseFloat(e.target.value.replace(',', '.')); x.sets[j].weight = isFinite(n) ? Math.round(fromUnit(n, unit) * 1000) / 1000 : null })} aria-label={'Set ' + (j + 1) + ' weight'} />
                      )}
                      <button type="button" className="icon-btn" aria-label="Remove set" onClick={() => patchEx(te.id, (x) => { x.sets.splice(j, 1) })}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="row-between">
                  <button type="button" className="btn btn-sm" onClick={() => patchEx(te.id, (x) => { const l = x.sets[x.sets.length - 1]; x.sets.push(l ? { ...l } : { reps: '8-12', weight: null, type: 'working' }) })}>+ Add set</button>
                  <RestSelect value={te.rest} onChange={(v) => patchEx(te.id, (x) => { x.rest = v })} />
                </div>
                <input className="input" placeholder="Note for this exercise in this template (e.g. belt, slow tempo)" value={te.note ?? ''} onChange={(e) => patchEx(te.id, (x) => { x.note = e.target.value })} />
              </div>
            </div>
          )
        })}
        <button type="button" className="btn btn-block" onClick={() => setPicker(true)}>+ Add exercise</button>
        <div className="row" style={{ marginTop: 8 }}>
          {confirmDelete ? (
            <>
              <span className="small dim">Delete this template?</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => { remove(t.id); nav('/') }}>Delete</button>
              <button type="button" className="btn btn-sm" onClick={() => setConfirmDelete(false)}>Keep</button>
            </>
          ) : <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete template</button>}
        </div>
      </div>
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(exId) => {
        const ex = exercise(exId)
        patch((x) => { x.exercises.push({ id: uid('te'), exerciseId: exId, rest: ex?.defaultRest ?? 120, sets: [{ reps: '8-12', weight: null, type: 'working' }, { reps: '8-12', weight: null, type: 'working' }, { reps: '8-12', weight: null, type: 'working' }] }) })
        setPicker(false)
      }} />
    </div>
  )
}
