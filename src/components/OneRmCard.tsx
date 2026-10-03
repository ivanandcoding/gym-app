import { useState } from 'react'
import { useStore } from '../store'
import type { Exercise } from '../types'
import { dateToTs, fmtDate, fmtNum, fromUnit, toUnit, todayStr } from '../lib/calc'
import ExercisePicker from './ExercisePicker'
import { toast } from './Toast'

/** Maxes actually lifted, per tracked exercise, with a log form and history. */
export default function OneRmCard() {
  const s = useStore()
  const unit = s.settings.unit
  const [logging, setLogging] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [date, setDate] = useState(todayStr())
  const [weight, setWeight] = useState('')
  const [bw, setBw] = useState('')

  const label = (ex: Exercise, kg: number) =>
    (ex.type === 'weighted_bodyweight' ? (kg >= 0 ? '+' : '') : ex.type === 'assisted_bodyweight' ? '−' : '') + fmtNum(toUnit(kg, unit)) + ' ' + unit
  const startLog = (exId: string) => {
    setLogging(exId); setOpen(null); setDate(todayStr()); setWeight('')
    setBw(fmtNum(toUnit(s.bodyweightAt(Date.now()), unit)))
  }
  const onDate = (d: string) => {
    setDate(d)
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) setBw(fmtNum(toUnit(s.bodyweightAt(dateToTs(d)), unit)))
  }
  const save = () => {
    const ex = logging ? s.exercise(logging) : undefined
    const w = parseFloat(weight.replace(',', '.'))
    const b = parseFloat(bw.replace(',', '.'))
    if (!ex || !isFinite(w) || (ex.type === 'weight_reps' && w <= 0) || !isFinite(b) || b <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast('Enter the weight, your bodyweight and the date'); return
    }
    s.addOneRm({ exerciseId: ex.id, date, weightKg: Math.round(fromUnit(w, unit) * 100) / 100, bodyweightKg: Math.round(fromUnit(b, unit) * 10) / 10 })
    setLogging(null)
    toast(ex.name + ' 1RM logged')
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><div className="h3">Tested 1RMs</div><div className="tiny muted">Maxes you actually lifted, not estimates</div></div>
        <button type="button" className="btn btn-sm" onClick={() => setPicker(true)}>+ Lift</button>
      </div>
      <div className="card-body">
        {s.oneRmLifts.map((exId) => {
          const ex = s.exercise(exId)
          if (!ex) return null
          const entries = s.oneRms.filter((r) => r.exerciseId === exId)
          const best = entries.length ? entries.reduce((a, b) => (b.weightKg > a.weightKg ? b : a)) : null
          const isOpen = open === exId
          return (
            <div key={exId} style={{ borderBottom: '1px solid var(--grid)', padding: '8px 0' }}>
              <div className="row-between">
                <div className="grow">
                  <div className="bold">{ex.name}</div>
                  <div className="small dim num">{best ? <><b style={{ color: 'var(--ink)' }}>{label(ex, best.weightKg)}</b> · {fmtDate(dateToTs(best.date))}{entries.length > 1 ? ' · ' + entries.length + ' tests' : ''}</> : 'No tested max yet'}</div>
                </div>
                <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                  {entries.length > 0 && <button type="button" className="btn btn-sm" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : exId); setLogging(null) }}>{isOpen ? 'Hide' : 'All'}</button>}
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => startLog(exId)}>Log</button>
                  <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} aria-label={'Stop tracking ' + ex.name} onClick={() => s.setOneRmLifts(s.oneRmLifts.filter((x) => x !== exId))}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              </div>
              {logging === exId && (
                <div className="stack-sm" style={{ marginTop: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 10 }}>
                  <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
                    <div className="field grow"><label>{ex.type === 'weighted_bodyweight' ? 'Added weight (' + unit + ')' : ex.type === 'assisted_bodyweight' ? 'Assistance (' + unit + ')' : '1RM (' + unit + ')'}</label>
                      <input className="input" inputMode="decimal" autoFocus value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="One rep max weight" /></div>
                    <div className="field grow"><label>Bodyweight ({unit})</label>
                      <input className="input" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} aria-label="Bodyweight on the day" /></div>
                  </div>
                  <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
                    <div className="field grow"><label>Date</label><input className="input" type="date" value={date} onChange={(e) => onDate(e.target.value)} aria-label="Date of the max" /></div>
                    <button type="button" className="btn btn-primary" onClick={save}>Save</button>
                    <button type="button" className="btn" onClick={() => setLogging(null)}>Cancel</button>
                  </div>
                </div>
              )}
              {isOpen && (
                <table className="data" style={{ marginTop: 6 }}><tbody>
                  {[...entries].reverse().map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(dateToTs(r.date), true)}</td>
                      <td><b>{label(ex, r.weightKg)}</b></td>
                      <td className="dim">at {fmtNum(toUnit(r.bodyweightKg, unit))} {unit}</td>
                      <td>{confirm === r.id ? (
                        <span className="confirm"><button type="button" className="btn btn-sm btn-danger" onClick={() => { s.deleteOneRm(r.id); setConfirm(null) }}>Delete</button><button type="button" className="btn btn-sm" onClick={() => setConfirm(null)}>Keep</button></span>
                      ) : <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(r.id)}>Remove</button>}</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
            </div>
          )
        })}
        {!s.oneRmLifts.length && <div className="empty small">No lifts tracked. Tap “+ Lift” to add one.</div>}
      </div>
      <ExercisePicker open={picker} title="Track a 1RM for" onClose={() => setPicker(false)} onPick={(id) => { if (!s.oneRmLifts.includes(id)) s.setOneRmLifts(s.oneRmLifts.concat(id)); setPicker(false) }} />
    </div>
  )
}
