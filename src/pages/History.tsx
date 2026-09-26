import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { fmtDate, fmtDuration, isCounted, recordsBefore, sessionsFor, setLabel, systemLoad, toUnit, displayE1rm } from '../lib/calc'
import { toast } from '../components/Toast'

export default function History() {
  const s = useStore()
  const [open, setOpen] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const list = useMemo(() => s.workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt - a.startedAt), [s.workouts])
  const unit = s.settings.unit

  const prCount = (wId: string): number => {
    const w = s.workouts.find((x) => x.id === wId)!
    const bw = w.bodyweightKg ?? s.bodyweightAt(w.startedAt)
    let n = 0
    for (const we of w.exercises) {
      const ex = s.exercise(we.exerciseId)
      if (!ex) continue
      const rec = recordsBefore(sessionsFor(s.workouts, ex, s.bodyweightAt), ex, w.startedAt, w.id)
      const hit = we.sets.some((st) => isCounted(st) && (ex.type === 'bodyweight_reps'
        ? (st.reps ?? 0) > rec.bestReps && rec.bestReps > 0
        : (rec.bestE1 > 0 && displayE1rm(ex, st.weight, st.reps, bw) > rec.bestE1 + 1e-6)))
      if (hit) n++
    }
    return n
  }

  let month = ''
  return (
    <div className="page">
      <header className="topbar"><h1 className="title">History<small>{list.length} workouts</small></h1></header>
      {!list.length && <div className="empty"><div className="h2">Nothing logged yet</div>Finish a workout and it shows up here.</div>}
      <div className="stack">
        {list.map((w) => {
          const m = new Date(w.startedAt).toLocaleString('en', { month: 'long', year: 'numeric' })
          const header = m !== month ? (month = m, <div className="eyebrow" style={{ marginTop: 6 }}>{m}</div>) : null
          const bw = w.bodyweightKg ?? s.bodyweightAt(w.startedAt)
          let sets = 0, volume = 0
          for (const we of w.exercises) { const ex = s.exercise(we.exerciseId); for (const st of we.sets) if (isCounted(st)) { sets++; if (ex) volume += systemLoad(ex, st.weight, bw) * (st.reps ?? 0) } }
          const prs = prCount(w.id)
          const isOpen = open === w.id
          return (
            <div key={w.id}>
              {header}
              <div className="card">
                <button type="button" className="list-item" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : w.id); setConfirm(null) }}>
                  <div className="grow">
                    <div className="h3">{w.name} <span className="small muted">· {fmtDate(w.startedAt, true)}</span></div>
                    <div className="small dim">{w.exercises.map((e) => s.exercise(e.exerciseId)?.name ?? '?').join(', ')}</div>
                    <div className="tiny muted num">{sets} sets · {Math.round(toUnit(volume, unit)).toLocaleString()} {unit}{w.finishedAt ? ' · ' + fmtDuration(w.finishedAt - w.startedAt) : ''}</div>
                  </div>
                  {prs > 0 && <span className="pr-badge">{prs} PR</span>}
                </button>
                {isOpen && (
                  <div className="card-body" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                    {w.exercises.map((we) => {
                      const ex = s.exercise(we.exerciseId)
                      if (!ex) return null
                      return (
                        <div key={we.id} className="row-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--grid)', fontSize: 14 }}>
                          <Link to={'/exercise/' + ex.id}>{ex.name}</Link>
                          <span className="dim num right">{we.sets.filter(isCounted).map((st) => setLabel(ex, st, unit)).join(', ')}</span>
                        </div>
                      )
                    })}
                    {w.note && <p className="small dim" style={{ marginTop: 8 }}>{w.note}</p>}
                    <div className="row" style={{ marginTop: 10 }}>
                      {confirm === w.id ? (
                        <>
                          <span className="small">Delete this workout?</span>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => { s.deleteWorkout(w.id); setConfirm(null); toast('Workout deleted') }}>Delete</button>
                          <button type="button" className="btn btn-sm" onClick={() => setConfirm(null)}>Keep</button>
                        </>
                      ) : <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirm(w.id)}>Delete</button>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
