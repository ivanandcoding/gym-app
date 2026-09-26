import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { dateToTs, fmtDate, fmtNum, sessionsFor, setLabel, toUnit } from '../lib/calc'
import { BODY_PART_LABEL } from '../types'
import MetaEditor from '../components/MetaEditor'
import Chart from '../components/Chart'

export default function ExerciseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useStore()
  const ex = id ? s.exercise(id) : undefined
  const unit = s.settings.unit
  const sessions = useMemo(() => (ex ? sessionsFor(s.workouts, ex, s.bodyweightAt) : []), [ex, s.workouts, s.bodyweightAt])
  if (!ex) return <div className="page full"><p className="muted">Exercise not found.</p><Link to="/">Back</Link></div>
  const bwOnly = ex.type === 'bodyweight_reps'
  const points = sessions.map((p) => ({ date: p.date, value: bwOnly ? p.bestE1 : toUnit(p.bestE1, unit), sub: p.sets.map((x) => setLabel(ex, x, unit)).join(', ') }))
  const format = (v: number) => bwOnly ? fmtNum(v, 0) + ' reps' : fmtNum(v) + ' ' + unit
  const typeText = ex.type === 'weighted_bodyweight' ? 'Bodyweight + added weight' : ex.type === 'assisted_bodyweight' ? 'Bodyweight with assistance' : ex.type === 'bodyweight_reps' ? 'Reps only' : 'Weight × reps'

  return (
    <div className="page full">
      <header className="topbar">
        <h1 className="title">{ex.name}<small>{BODY_PART_LABEL[ex.bodyPart]} · {ex.equipment} · {typeText}{ex.unilateral ? ' · per side' : ''}</small></h1>
        <button type="button" className="btn btn-sm" onClick={() => nav(-1)}>Back</button>
      </header>
      <div className="stack">
        <div className="card card-pad">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Notes and machine settings</div>
          <MetaEditor exerciseId={ex.id} />
        </div>
        <div className="card">
          <div className="card-head"><div className="h3">{bwOnly ? 'Best set reps' : 'Estimated 1RM'}</div><span className="tiny muted">{sessions.length} sessions</span></div>
          <div className="card-body"><Chart points={points} format={format} ariaLabel={ex.name + ' progress'} /></div>
        </div>
        {sessions.length > 0 && (
          <div className="card">
            <div className="card-head"><div className="h3">History</div></div>
            <div className="card-body table-wrap">
              <table className="data"><thead><tr><th>Date</th><th>Sets</th><th>{bwOnly ? 'Best' : 'e1RM'}</th></tr></thead><tbody>
                {[...sessions].reverse().map((p) => <tr key={p.workoutId}><td>{fmtDate(p.date, true)}</td><td>{p.sets.map((x) => setLabel(ex, x, unit)).join(', ')}</td><td>{bwOnly ? p.bestE1 : fmtNum(toUnit(p.bestE1, unit))}</td></tr>)}
              </tbody></table>
            </div>
          </div>
        )}
        {s.oneRms.some((r) => r.exerciseId === ex.id) && (
          <div className="card">
            <div className="card-head"><div className="h3">Tested 1RMs</div></div>
            <div className="card-body table-wrap">
              <table className="data"><thead><tr><th>Date</th><th>1RM</th><th>Bodyweight</th></tr></thead><tbody>
                {s.oneRms.filter((r) => r.exerciseId === ex.id).slice().reverse().map((r) => <tr key={r.id}><td>{fmtDate(dateToTs(r.date), true)}</td><td>{(ex.type === 'weighted_bodyweight' && r.weightKg >= 0 ? '+' : '') + fmtNum(toUnit(r.weightKg, unit))} {unit}</td><td>{fmtNum(toUnit(r.bodyweightKg, unit))} {unit}</td></tr>)}
              </tbody></table>
            </div>
          </div>
        )}
        {ex.custom && (
          <div className="card card-pad stack-sm">
            <div className="eyebrow">Custom exercise</div>
            <div className="field"><label>Name</label><input className="input" value={ex.name} onChange={(e) => s.updateExercise(ex.id, { name: e.target.value })} /></div>
            <button type="button" className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { s.updateExercise(ex.id, { archived: true }); nav(-1) }}>Hide from the exercise list</button>
          </div>
        )}
      </div>
    </div>
  )
}
