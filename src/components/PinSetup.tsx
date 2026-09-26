import { useState } from 'react'
import { useStore } from '../store'
import { isValidPin, makePin, verifyPin } from '../lib/pin'
import { setUnlocked } from '../lib/lock'
import { toast } from './Toast'

const LOCK_AFTER = [[0, 'Immediately'], [60, '1 minute'], [300, '5 minutes'], [900, '15 minutes'], [3600, '1 hour']] as const

export default function PinSetup() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const [mode, setMode] = useState<'idle' | 'set' | 'change' | 'remove'>('idle')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const hasPin = !!settings.pinHash

  const reset = () => { setMode('idle'); setCurrent(''); setNext(''); setRepeat('') }
  const save = async () => {
    if (hasPin && !(await verifyPin(current, settings))) { toast('Current PIN is wrong'); return }
    if (mode === 'remove') {
      setSettings({ pinHash: undefined, pinSalt: undefined, pinLength: undefined })
      toast('PIN removed'); reset(); return
    }
    if (!isValidPin(next)) { toast('Use 4 to 6 digits'); return }
    if (next !== repeat) { toast('The two PINs do not match'); return }
    setSettings(await makePin(next))
    setUnlocked(true)
    toast(hasPin ? 'PIN changed' : 'PIN set'); reset()
  }
  const pinInput = (label: string, value: string, onChange: (v: string) => void, id: string) => (
    <div className="field"><label htmlFor={id}>{label}</label>
      <input id={id} className="input" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </div>
  )

  return (
    <div className="card card-pad stack-sm">
      <div className="eyebrow">App lock</div>
      <p className="small dim" style={{ margin: 0 }}>{hasPin ? 'A PIN is required to open the app.' : 'Ask for a PIN whenever the app is opened, so nobody who picks up your phone can read your log.'}</p>
      {mode === 'idle' && (
        <div className="row">
          {!hasPin && <button type="button" className="btn" onClick={() => setMode('set')}>Set a PIN</button>}
          {hasPin && <button type="button" className="btn" onClick={() => setMode('change')}>Change PIN</button>}
          {hasPin && <button type="button" className="btn btn-danger btn-sm" onClick={() => setMode('remove')}>Remove PIN</button>}
        </div>
      )}
      {mode !== 'idle' && (
        <div className="stack-sm">
          {hasPin && pinInput('Current PIN', current, setCurrent, 'pin-current')}
          {mode !== 'remove' && pinInput('New PIN (4 to 6 digits)', next, setNext, 'pin-next')}
          {mode !== 'remove' && pinInput('Repeat new PIN', repeat, setRepeat, 'pin-repeat')}
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => void save()}>{mode === 'remove' ? 'Remove PIN' : 'Save PIN'}</button>
            <button type="button" className="btn" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}
      {hasPin && (
        <div className="row-between" style={{ marginTop: 4 }}><span>Lock again after being away for</span>
          <select className="select" style={{ width: 'auto' }} value={settings.lockAfterSec ?? 300} onChange={(e) => setSettings({ lockAfterSec: +e.target.value })}>
            {LOCK_AFTER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      )}
      <p className="tiny muted" style={{ margin: 0 }}>The PIN is stored as a salted hash on this device and travels with your backups. If you forget it, the only way in is to erase the app's data.</p>
    </div>
  )
}
