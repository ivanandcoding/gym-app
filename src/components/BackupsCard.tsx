import { useState } from 'react'
import { listSnapshots, restoreSnapshot, takeSnapshot } from '../lib/backup'
import { dateToTs, fmtDate } from '../lib/calc'
import { toast } from './Toast'

/** Automatic daily snapshots kept on this device, with restore. */
export default function BackupsCard() {
  const [tick, setTick] = useState(0)
  const [confirm, setConfirm] = useState<string | null>(null)
  const snaps = listSnapshots()
  void tick
  return (
    <div className="stack-sm">
      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => { toast(takeSnapshot(true) ? 'Backup saved' : 'Nothing to back up yet'); setTick((t) => t + 1) }}>Back up now</button>
      {snaps.length === 0 ? <div className="tiny muted">None yet. One is saved automatically each day you open the app.</div> : (
        <table className="data"><tbody>
          {snaps.map((b) => (
            <tr key={b.key}>
              <td>{fmtDate(dateToTs(b.date), true)}</td>
              <td className="dim">{b.workouts} workouts</td>
              <td>{confirm === b.key ? (
                <span className="confirm">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => { const r = restoreSnapshot(b.key); toast(r.message); setConfirm(null); setTick((t) => t + 1) }}>Restore</button>
                  <button type="button" className="btn btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
                </span>
              ) : <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(b.key)}>Restore</button>}</td>
            </tr>
          ))}
        </tbody></table>
      )}
    </div>
  )
}
