import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { fmtDate, fmtNum, sessionsFor, setLabel, toUnit } from '../lib/calc'
import Chart from '../components/Chart'

type Metric = 'e1rm' | 'weight' | 'volume' | 'reps'

export default function Progress() {
  const s = useStore()
  const unit = s.settings.unit
  const logged = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of s.workouts) for (const we of w.exercises) count.set(we.exerciseId, (count.get(we.exerciseId) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]).filter((id) => s.exercise(id))
  }, [s.workouts, s])
  const [exId, setExId] = useState<string>('')
  const [range, setRange] = useState(0)
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [table, setTable] = useState(false)
  const current = logged.includes(exId) ? exId : logged[0]
  const ex = current ? s.exercise(current) : undefined
  const sessions = useMemo(() => (ex ? sessionsFor(s.workouts, ex, s.bodyweightAt) : []), [ex, s.workouts, s.bodyweightAt])
  const cutoff = range ? Date.now() - range * 86400000 : 0
  const shown = sessions.filter((p) => p.date >= cutoff)
  const bwOnly = ex?.type === 'bodyweight_reps'
  const m: Metric = bwOnly ? 'reps' : metric

  const value = (p: (typeof sessions)[number]) => m === 'e1rm' ? toUnit(p.bestE1, unit) : m === 'weight' ? toUnit(Math.max(...p.sets.map((x) => x.weight ?? 0)), unit) : m === 'volume' ? toUnit(p.volume, unit) : Math.max(...p.sets.map((x) => x.reps ?? 0))
  const format = (v: number) => m === 'reps' ? fmtNum(v, 0) + ' reps' : m === 'volume' ? Math.round(v).toLocaleString() + ' ' + unit : fmtNum(v) + ' ' + unit
  const points = ex ? shown.map((p) => ({ date: p.date, value: value(p), sub: p.sets.map((x) => setLabel(ex, x, unit)).join(', ') })) : []
  const best = shown.length ? shown.reduce((a, b) => (b.bestE1 > a.bestE1 ? b : a)) : null
  const last = shown.length ? shown[shown.length - 1] : null
  const first = shown.length ? shown[0] : null
  const change = first && last && first.bestE1 > 0 ? ((last.bestE1 - first.bestE1) / first.bestE1) * 100 : null

  return (
    <div className="page">
      <header className="topbar"><h1 className="title">Progress</h1></header>
      {!ex ? <div className="empty"><div className="h2">No data yet</div>Progress charts appear after your first finished workout.</div> : (
        <div className="stack">
          <div className="field">
            <label htmlFor="pex">Exercise</label>
            <select id="pex" className="select" value={current} onChange={(e) => setExId(e.target.value)}>
              {logged.map((id) => <option key={id} value={id}>{s.exercise(id)!.name}</option>)}
            </select>
          </div>
          <div className="row-between">
            <div className="seg" role="group" aria-label="Range">
              {[[90, '3 mo'], [180, '6 mo'], [365, '1 yr'], [0, 'All']].map(([d, l]) => <button key={d} type="button" aria-pressed={range === d} onClick={() => setRange(d as number)}>{l}</button>)}
            </div>
            <Link className="btn btn-sm" to={'/exercise/' + ex.id}>Notes</Link>
          </div>
          <div className="tiles">
            <div className="card tile"><div className="label">{bwOnly ? 'Most reps' : 'Best est. 1RM'}</div><div className="value">{best ? (bwOnly ? best.bestE1 : fmtNum(toUnit(best.bestE1, unit))) : '—'}<small>{bwOnly ? 'reps' : unit}</small></div><div className="sub">{best ? fmtDate(best.date) : ''}</div></div>
            <div className="card tile"><div className="label">Last session</div><div className="value">{last ? setLabel(ex, last.best, unit) : '—'}</div><div className="sub">{last ? fmtDate(last.date, true) : ''}</div></div>
            <div className="card tile"><div className="label">Change</div><div className="value" style={{ color: change != null && change < 0 ? 'var(--danger)' : change ? 'var(--good)' : undefined }}>{change == null ? '—' : (change >= 0 ? '+' : '') + fmtNum(change, 0) + '%'}</div><div className="sub">{shown.length > 1 ? 'first to last in range' : 'need two sessions'}</div></div>
            <div className="card tile"><div className="label">Sessions</div><div className="value">{shown.length}</div><div className="sub">{range ? 'last ' + range + ' days' : 'all time'}</div></div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="seg" role="group" aria-label="Metric">
                {bwOnly ? <button type="button" aria-pressed>Reps</button> : (
                  <>
                    <button type="button" aria-pressed={m === 'e1rm'} onClick={() => setMetric('e1rm')}>e1RM</button>
                    <button type="button" aria-pressed={m === 'weight'} onClick={() => setMetric('weight')}>Weight</button>
                    <button type="button" aria-pressed={m === 'volume'} onClick={() => setMetric('volume')}>Volume</button>
                    <button type="button" aria-pressed={m === 'reps'} onClick={() => setMetric('reps')}>Reps</button>
                  </>
                )}
              </div>
              <button type="button" className="btn btn-sm" aria-pressed={table} onClick={() => setTable(!table)}>{table ? 'Chart' : 'Table'}</button>
            </div>
            <div className="card-body">
              {!table ? <Chart points={points} format={format} ariaLabel={ex.name + ' progress'} /> : (
                <div className="table-wrap"><table className="data"><thead><tr><th>Date</th><th>Sets</th><th>{bwOnly ? 'Best' : 'e1RM'}</th></tr></thead><tbody>
                  {[...shown].reverse().map((p) => <tr key={p.workoutId}><td>{fmtDate(p.date, true)}</td><td>{p.sets.map((x) => setLabel(ex, x, unit)).join(', ')}</td><td>{bwOnly ? p.bestE1 : fmtNum(toUnit(p.bestE1, unit))}</td></tr>)}
                </tbody></table></div>
              )}
              {!bwOnly && m === 'e1rm' && <p className="tiny muted" style={{ marginTop: 8 }}>Estimated 1RM from your best set each session (Brzycki up to 10 reps). {ex.type === 'weighted_bodyweight' ? 'Shown as added weight; bodyweight is included in the calculation.' : ''}</p>}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="h3">All-time bests</div></div>
            <div className="card-body table-wrap">
              <table className="data"><thead><tr><th>Exercise</th><th>Best set</th><th>e1RM</th><th>Tested 1RM</th><th>When</th></tr></thead><tbody>
                {logged.map((id) => {
                  const e = s.exercise(id)!
                  const ss = sessionsFor(s.workouts, e, s.bodyweightAt)
                  if (!ss.length) return null
                  const b = ss.reduce((a, c) => (c.bestE1 > a.bestE1 ? c : a))
                  const tested = s.oneRms.filter((r) => r.exerciseId === id)
                  const tb = tested.length ? tested.reduce((a, c) => (c.weightKg > a.weightKg ? c : a)) : null
                  return <tr key={id}><td><Link to={'/exercise/' + id}>{e.name}</Link></td><td>{setLabel(e, b.best, unit)}</td><td>{e.type === 'bodyweight_reps' ? '—' : fmtNum(toUnit(b.bestE1, unit))}</td><td>{tb ? (e.type === 'weighted_bodyweight' && tb.weightKg >= 0 ? '+' : '') + fmtNum(toUnit(tb.weightKg, unit)) : '—'}</td><td>{fmtDate(b.date)}</td></tr>
                })}
              </tbody></table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
