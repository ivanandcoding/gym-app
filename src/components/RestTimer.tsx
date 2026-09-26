import { fmtClock } from '../lib/calc'
import { timer, useRestTimer } from '../lib/timer'

export default function RestTimer() {
  const { state, remaining } = useRestTimer()
  if (!state) return null
  const pct = Math.min(100, 100 * (1 - remaining / Math.max(1, state.total)))
  if (state.finished) {
    return (
      <div className="timer-bar over" role="status" aria-live="assertive">
        <span className="time">Go</span>
        <span className="grow">Rest done · {state.label}</span>
        <button type="button" className="btn btn-sm" onClick={() => timer.stop()}>OK</button>
      </div>
    )
  }
  return (
    <div className="timer-bar" role="timer" aria-label="Rest timer">
      <span className="time">{fmtClock(remaining)}</span>
      <div className="track"><i style={{ width: pct + '%' }} /></div>
      <button type="button" className="btn btn-sm" onClick={() => timer.add(30)}>+30</button>
      <button type="button" className="btn btn-sm" onClick={() => timer.stop()}>Skip</button>
    </div>
  )
}
