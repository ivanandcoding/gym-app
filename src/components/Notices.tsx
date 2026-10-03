import { useState } from 'react'
import { useStore } from '../store'
import { newestSnapshotWithData, restoreSnapshot } from '../lib/backup'
import { dateToTs, fmtDate } from '../lib/calc'
import { toast } from './Toast'

function flag(key: string): boolean { try { return localStorage.getItem(key) === '1' } catch { return false } }
function setFlag(key: string) { try { localStorage.setItem(key, '1') } catch { /* ignore */ } }

/** Two one-off notices on the Train tab: open from the Home Screen on iPhone, and restore a backup when the log is empty. */
export default function Notices() {
  const workouts = useStore((s) => s.workouts.length)
  const [, rerender] = useState(0)
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = (navigator as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  const showInstall = isIOS && !standalone && !flag('gym-notice-install')
  const snap = workouts === 0 ? newestSnapshotWithData() : null
  const showRestore = !!snap && !flag('gym-notice-restore-' + snap.key)

  if (!showInstall && !showRestore) return null
  return (
    <div className="stack">
      {showInstall && (
        <div className="card card-pad stack-sm" style={{ borderColor: 'var(--accent)' }}>
          <div className="bold">Open this from your Home Screen</div>
          <div className="small dim">In Safari, tap Share, then "Add to Home Screen". Safari and the Home Screen icon keep separate data, so always log in the same one.</div>
          <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setFlag('gym-notice-install'); rerender((n) => n + 1) }}>Got it</button>
        </div>
      )}
      {showRestore && snap && (
        <div className="card card-pad stack-sm" style={{ borderColor: 'var(--accent)' }}>
          <div className="bold">Your log is empty, but a backup exists</div>
          <div className="small dim">{fmtDate(dateToTs(snap.date), true)} · {snap.workouts} workouts, saved on this device.</div>
          <div className="row">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { const r = restoreSnapshot(snap.key); toast(r.message) }}>Restore it</button>
            <button type="button" className="btn btn-sm" onClick={() => { setFlag('gym-notice-restore-' + snap.key); rerender((n) => n + 1) }}>Not now</button>
          </div>
        </div>
      )}
    </div>
  )
}
