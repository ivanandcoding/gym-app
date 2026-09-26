import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import type { SetEntry, SetType, Workout, WorkoutExercise } from '../types'
import { displayE1rm, fmtDuration, fmtNum, fmtWeight, fromUnit, isCounted, plates, recordsBefore, sessionsFor, setLabel, suggestNext, toUnit, systemLoad } from '../lib/calc'
import { timer, setTimerSound, useWakeLock } from '../lib/timer'
import RestTimer from '../components/RestTimer'
import ExercisePicker from '../components/ExercisePicker'
import MetaEditor from '../components/MetaEditor'
import { toast } from '../components/Toast'
import RestSelect from '../components/RestSelect'


function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return isFinite(n) && n >= 0 ? n : null
}
function topReps(reps: string | undefined): number | null {
  if (!reps) return null
  const m = reps.match(/(\d+)\s*$/)
  return m ? parseInt(m[1], 10) : null
}

export default function WorkoutPage() {
  const nav = useNavigate()
  const w = useStore((s) => s.activeWorkout)
  const settings = useStore((s) => s.settings)
  useWakeLock(settings.keepAwake && !!w)
  useEffect(() => { setTimerSound(settings.sound) }, [settings.sound])
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(i) }, [])
  if (!w) {
    return (
      <div className="page full">
        <header className="topbar"><h1 className="title">Workout</h1></header>
        <div className="empty"><div className="h2">No workout running</div>Start one from the Train tab.<div style={{ marginTop: 12 }}><button type="button" className="btn" onClick={() => nav('/')}>Go to Train</button></div></div>
      </div>
    )
  }
  return <Session w={w} />
}

function Session({ w }: { w: Workout }) {
  const nav = useNavigate()
  const s = useStore()
  const [picker, setPicker] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [updateTemplate, setUpdateTemplate] = useState(true)
  const bw = w.bodyweightKg ?? s.bodyweightAt(w.startedAt)
  const template = w.templateId ? s.templates.find((t) => t.id === w.templateId) : undefined

  const finish = () => {
    if (template && updateTemplate) {
      const next = { ...template, exercises: w.exercises.filter((we) => we.sets.some(isCounted)).map((we) => {
        const prev = template.exercises.find((te) => te.exerciseId === we.exerciseId)
        const working = we.sets.filter((x) => x.done && (x.reps ?? 0) > 0)
        return {
          id: prev?.id ?? we.id, exerciseId: we.exerciseId, rest: we.rest, note: prev?.note,
          sets: working.map((x, i) => ({ reps: prev?.sets[i]?.reps ?? String(x.reps ?? ''), weight: x.weight, type: x.type })),
        }
      }) }
      s.saveTemplate(next)
    }
    const done = s.finishWorkout()
    timer.stop()
    if (!done) { toast('Nothing logged, workout discarded'); nav('/'); return }
    toast('Workout saved')
    nav('/history')
  }

  const totals = useMemo(() => {
    let sets = 0, volume = 0
    for (const we of w.exercises) {
      const ex = s.exercise(we.exerciseId)
      for (const st of we.sets) if (isCounted(st)) { sets++; if (ex) volume += systemLoad(ex, st.weight, bw) * (st.reps ?? 0) }
    }
    return { sets, volume }
  }, [w, s, bw])

  return (
    <div className="page full">
      <header className="topbar">
        <div>
          <h1 className="title">{w.name}<small>{fmtDuration(Date.now() - w.startedAt)} · {totals.sets} sets · {Math.round(toUnit(totals.volume, s.settings.unit)).toLocaleString()} {s.settings.unit}</small></h1>
        </div>
        <div className="row">
          <Link className="btn btn-sm" to="/">Hide</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setFinishing(true)}>Finish</button>
        </div>
      </header>
      <RestTimer />
      <div className="stack" style={{ marginTop: 12 }}>
        {w.exercises.map((we) => <ExerciseBlock key={we.id} we={we} w={w} bw={bw} template={template} />)}
        <button type="button" className="btn btn-block" onClick={() => setPicker(true)}>+ Add exercise</button>
        <div className="field">
          <label>Session note</label>
          <input className="input" placeholder="How did it go?" value={w.note ?? ''} onChange={(e) => s.updateActive((x) => { x.note = e.target.value })} />
        </div>
      </div>
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={(id) => { s.addExerciseToActive(id); setPicker(false) }} />
      {finishing && (
        <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) setFinishing(false) }}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Finish workout">
            <div className="h2">Finish workout?</div>
            <div className="dim">{totals.sets} sets done. Unfinished sets are dropped.</div>
            {template && (
              <label className="row small dim"><input type="checkbox" checked={updateTemplate} onChange={(e) => setUpdateTemplate(e.target.checked)} /> Save today's weights and set counts into the “{template.name}” template</label>
            )}
            <button type="button" className="btn btn-primary btn-lg" onClick={finish}>Save workout</button>
            <button type="button" className="btn" onClick={() => setFinishing(false)}>Keep going</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExerciseBlock({ we, w, bw, template }: { we: WorkoutExercise; w: Workout; bw: number; template?: { exercises: { exerciseId: string; sets: { reps: string }[] }[] } }) {
  const s = useStore()
  const ex = s.exercise(we.exerciseId)
  const unit = s.settings.unit
  const [confirmRemove, setConfirmRemove] = useState(false)
  const sessions = useMemo(() => (ex ? sessionsFor(s.workouts, ex, s.bodyweightAt) : []), [s.workouts, ex, s.bodyweightAt])
  const last = sessions.length ? sessions[sessions.length - 1] : null
  const records = useMemo(() => (ex ? recordsBefore(sessions, ex, w.startedAt, w.id) : null), [sessions, ex, w.startedAt, w.id])
  if (!ex) return null
  const te = template?.exercises.find((t) => t.exerciseId === we.exerciseId)
  const suggestion = last && te ? suggestNext(last.sets, topReps(te.sets[0]?.reps), ex) : null
  const bwOnly = ex.type === 'bodyweight_reps'

  const update = (fn: (x: WorkoutExercise) => void) => s.updateActive((wk) => { const t = wk.exercises.find((e) => e.id === we.id); if (t) fn(t) })
  const setField = (setId: string, field: 'weight' | 'reps', raw: string) => update((x) => {
    const st = x.sets.find((q) => q.id === setId)
    if (!st) return
    const n = parseNum(raw)
    if (field === 'weight') st.weight = n == null ? null : Math.round(fromUnit(n, unit) * 1000) / 1000
    else st.reps = n == null ? null : Math.round(n)
  })
  const toggleDone = (st: SetEntry) => {
    const willBeDone = !st.done
    update((x) => {
      const q = x.sets.find((a) => a.id === st.id)
      if (!q) return
      // fill from the previous session or the previous set when tapping done on an empty row
      if (willBeDone) {
        const idx = x.sets.indexOf(q)
        const prev = last?.sets[idx] ?? x.sets[idx - 1]
        if (q.weight == null && !bwOnly && prev) q.weight = prev.weight
        if (q.reps == null && prev) q.reps = prev.reps
      }
      q.done = willBeDone
      q.doneAt = willBeDone ? Date.now() : undefined
    })
    if (willBeDone) {
      const rest = st.type === 'warmup' ? Math.min(60, we.rest) : we.rest
      if (rest > 0) timer.start(rest, ex.name)
    }
  }
  const setType = (st: SetEntry, value: string) => {
    if (value === 'remove') { update((x) => { x.sets = x.sets.filter((q) => q.id !== st.id) }); return }
    update((x) => { const q = x.sets.find((a) => a.id === st.id); if (q) q.type = value as SetType })
  }
  const isPr = (st: SetEntry): boolean => {
    if (!records || !isCounted(st)) return false
    if (bwOnly) return (st.reps ?? 0) > records.bestReps && records.bestReps > 0
    const e = displayE1rm(ex, st.weight, st.reps, bw)
    return (records.bestE1 > 0 && e > records.bestE1 + 1e-6) || (records.bestWeight > 0 && (st.weight ?? 0) > records.bestWeight + 1e-6)
  }
  let heaviest = 0
  for (const st of we.sets) if ((st.weight ?? 0) > heaviest) heaviest = st.weight ?? 0
  const plateText = ex.equipment === 'barbell' && ex.type === 'weight_reps' && heaviest > 0 && unit === 'kg' ? plates(heaviest, s.settings.barKg) : null
  const weightHeader = bwOnly ? '' : ex.type === 'weighted_bodyweight' ? '+' + unit : ex.type === 'assisted_bodyweight' ? '−' + unit : unit

  return (
    <div className="card">
      <div className="card-head">
        <div className="grow">
          <Link to={'/exercise/' + ex.id} className="h3" style={{ color: 'inherit', textDecoration: 'none' }}>{ex.name}{ex.unilateral ? <span className="tiny muted"> · per side</span> : null}</Link>
          <div className="small dim">
            {last ? <>Last time <b>{last.sets.map((x) => setLabel(ex, x, unit)).join(', ')}</b></> : 'First time logging this'}
            {suggestion && suggestion.weight !== (last?.sets[0]?.weight ?? 0) && <> · try <b>{fmtWeight(suggestion.weight, unit)}</b></>}
          </div>
        </div>
        {confirmRemove ? (
          <span className="row" style={{ gap: 4 }}>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => s.updateActive((wk) => { wk.exercises = wk.exercises.filter((e) => e.id !== we.id) })}>Remove</button>
            <button type="button" className="btn btn-sm" onClick={() => setConfirmRemove(false)}>Keep</button>
          </span>
        ) : (
          <button type="button" className="icon-btn" aria-label={'Remove ' + ex.name} onClick={() => setConfirmRemove(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
          </button>
        )}
      </div>
      <div className="card-body stack-sm">
        <MetaEditor exerciseId={ex.id} compact />
        <div className="sets">
          <div className="col-h">Set</div><div className="col-h">Prev</div><div className="col-h">{weightHeader}</div><div className="col-h">Reps</div><div className="col-h">Done</div>
          {we.sets.map((st, i) => {
            const prev = last?.sets[i]
            const pr = isPr(st)
            return (
              <div key={st.id} className={'sets' + (st.done ? ' set-row-done' : '')} style={{ display: 'contents' }}>
                <select className={'set-n ' + st.type} value={st.type} aria-label={'Set ' + (i + 1) + ' type'} onChange={(e) => setType(st, e.target.value)}>
                  <option value="working">{i + 1}</option>
                  <option value="warmup">W</option>
                  <option value="drop">D</option>
                  <option value="failure">F</option>
                  <option value="remove">Remove set</option>
                </select>
                <div className="prev">{prev ? setLabel(ex, prev, unit) : '—'}</div>
                {bwOnly ? <div className="prev">BW</div> : (
                  <input className={'set-input' + (pr ? ' pr' : '')} type="text" inputMode="decimal" placeholder={prev?.weight != null ? fmtNum(toUnit(prev.weight, unit)) : ''}
                    value={st.weight == null ? '' : fmtNum(toUnit(st.weight, unit), 2)} onChange={(e) => setField(st.id, 'weight', e.target.value)} aria-label={'Set ' + (i + 1) + ' weight'} />
                )}
                <input className={'set-input' + (pr && bwOnly ? ' pr' : '')} type="text" inputMode="numeric" placeholder={prev?.reps != null ? String(prev.reps) : ''}
                  value={st.reps == null ? '' : String(st.reps)} onChange={(e) => setField(st.id, 'reps', e.target.value)} aria-label={'Set ' + (i + 1) + ' reps'} />
                <button type="button" className={'done-btn' + (st.done ? ' on' : '')} aria-pressed={st.done} aria-label={'Set ' + (i + 1) + ' done'} onClick={() => toggleDone(st)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                </button>
              </div>
            )
          })}
        </div>
        <div className="row-between" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-sm" onClick={() => s.addSet(we.id)}>+ Add set</button>
          <div className="row" style={{ gap: 6 }}>
            {we.sets.some(isPr) && <span className="pr-badge">PR</span>}
            {plateText && <span className="tiny muted">{plateText}</span>}
            <RestSelect value={we.rest} onChange={(v) => update((x) => { x.rest = v })} />
          </div>
        </div>
      </div>
    </div>
  )
}
