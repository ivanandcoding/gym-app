import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { fmtAgo, fmtDate, fmtDuration, uid } from '../lib/calc'
import Notices from '../components/Notices'

export default function Train() {
  const nav = useNavigate()
  const templates = useStore((s) => s.templates)
  const active = useStore((s) => s.activeWorkout)
  const exercise = useStore((s) => s.exercise)
  const startWorkout = useStore((s) => s.startWorkout)
  const saveTemplate = useStore((s) => s.saveTemplate)
  const discard = useStore((s) => s.discardWorkout)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const start = (templateId?: string) => {
    startWorkout(templateId)
    nav('/workout')
  }
  const newTemplate = () => {
    const t = { id: uid('t'), name: 'New template', exercises: [], createdAt: Date.now(), updatedAt: Date.now() }
    saveTemplate(t)
    nav('/template/' + t.id)
  }
  const doneSets = active ? active.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0) : 0

  return (
    <div className="page">
      <header className="topbar"><h1 className="title">Train</h1></header>
      <div className="stack">
        <Notices />
        {active && (
          <div className="card card-pad stack-sm" style={{ borderColor: 'var(--accent)' }}>
            <div className="eyebrow">Workout in progress</div>
            <div className="h2">{active.name}</div>
            <div className="small dim">Started {fmtDuration(Date.now() - active.startedAt)} ago · {doneSets} sets done</div>
            <div className="row" style={{ marginTop: 6 }}>
              <button type="button" className="btn btn-primary grow" onClick={() => nav('/workout')}>Continue</button>
              {confirmDiscard ? (
                <>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => { discard(); setConfirmDiscard(false) }}>Discard it</button>
                  <button type="button" className="btn btn-sm" onClick={() => setConfirmDiscard(false)}>Keep</button>
                </>
              ) : <button type="button" className="btn btn-sm" onClick={() => setConfirmDiscard(true)}>Discard</button>}
            </div>
          </div>
        )}

        {templates.map((t) => {
          const isOpen = !!open[t.id]
          const names = t.exercises.map((e) => exercise(e.exerciseId)?.name ?? '?')
          return (
            <div key={t.id} className="card">
              <div className="card-head" style={{ alignItems: 'flex-start' }}>
                <div className="grow">
                  <div className="h2">{t.name}</div>
                  <div className="last-done">
                    {t.lastUsedAt ? <><span className="last-done-ago">{fmtAgo(t.lastUsedAt)}</span><span className="dim"> · {fmtDate(t.lastUsedAt, true)}</span></> : <span className="dim">Not done yet</span>}
                  </div>
                </div>
                <button type="button" className="btn btn-sm" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [t.id]: !isOpen })}>
                  {names.length} {names.length === 1 ? 'exercise' : 'exercises'} <span aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
                </button>
              </div>
              {isOpen && (
                <div className="card-body">
                  <ol className="ex-list">
                    {names.length ? names.map((n, i) => <li key={i}>{n}<span className="tiny muted"> · {t.exercises[i].sets.length} sets</span></li>) : <li className="dim">No exercises yet</li>}
                  </ol>
                </div>
              )}
              <div className="card-body row">
                <button type="button" className="btn btn-primary grow" disabled={!!active} onClick={() => start(t.id)}>Start</button>
                <Link className="btn" to={'/template/' + t.id}>Edit</Link>
              </div>
            </div>
          )
        })}

        <div className="row">
          <button type="button" className="btn grow" onClick={newTemplate}>+ New template</button>
          <button type="button" className="btn btn-ghost" disabled={!!active} onClick={() => start()}>Empty workout</button>
        </div>
      </div>
    </div>
  )
}
