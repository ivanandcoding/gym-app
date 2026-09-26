import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { clearFails, failState, recordFail, verifyPin } from '../lib/pin'
import { setUnlocked } from '../lib/lock'

export default function LockScreen() {
  const settings = useStore((s) => s.settings)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [fails, setFails] = useState(failState())
  const [now, setNow] = useState(Date.now())
  const [confirmErase, setConfirmErase] = useState(false)
  const length = settings.pinLength ?? 4
  const coolingDown = fails.until > now

  useEffect(() => {
    if (!coolingDown) return
    const i = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(i)
  }, [coolingDown])

  const submit = async (candidate: string) => {
    if (busy || coolingDown) return
    setBusy(true)
    const ok = await verifyPin(candidate, settings)
    setBusy(false)
    if (ok) { clearFails(); setUnlocked(true); return }
    const f = recordFail()
    setFails(f); setNow(Date.now())
    setPin('')
    setError(f.until > Date.now() ? 'Too many tries' : 'Wrong PIN')
  }
  // auto-submit once the stored PIN length is reached
  useEffect(() => { if (pin.length === length) void submit(pin) }, [pin, length]) // eslint-disable-line react-hooks/exhaustive-deps

  const press = (d: string) => {
    if (coolingDown || busy) return
    setError('')
    setPin((p) => (p.length >= 6 ? p : p + d))
  }
  const back = () => setPin((p) => p.slice(0, -1))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') back()
      else if (e.key === 'Enter') setPin((p) => { if (p.length >= 4) void submit(p); return p })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const erase = async () => {
    try { await useStore.persist.clearStorage() } catch { /* ignore */ }
    try { localStorage.clear() } catch { /* ignore */ }
    location.reload()
  }

  return (
    <div className="lock" role="dialog" aria-label="Enter your PIN">
      <div className="lock-title">Gym</div>
      <div className="lock-sub">{coolingDown ? 'Try again in ' + Math.ceil((fails.until - now) / 1000) + ' s' : error || 'Enter your PIN'}</div>
      <div className="lock-dots" aria-label={pin.length + ' of ' + length + ' digits entered'}>
        {Array.from({ length }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} type="button" onClick={() => press(d)} disabled={coolingDown}>{d}</button>)}
        <button type="button" className="ghost" onClick={back} aria-label="Delete last digit">⌫</button>
        <button type="button" onClick={() => press('0')} disabled={coolingDown}>0</button>
        <button type="button" className="ghost" onClick={() => { if (pin.length >= 4) void submit(pin) }} aria-label="Unlock" disabled={pin.length < 4 || coolingDown}>OK</button>
      </div>
      <div style={{ marginTop: 24 }}>
        {!confirmErase ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmErase(true)}>Forgot your PIN?</button>
        ) : (
          <div className="stack-sm" style={{ alignItems: 'center' }}>
            <div className="small dim" style={{ textAlign: 'center', maxWidth: 300 }}>The only way back in is to erase everything stored in this app on this device. Restore from a backup afterwards if you have one.</div>
            <div className="row">
              <button type="button" className="btn btn-sm btn-danger" onClick={() => void erase()}>Erase app data</button>
              <button type="button" className="btn btn-sm" onClick={() => setConfirmErase(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
