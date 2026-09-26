import { useState } from 'react'
import { fmtClock } from '../lib/calc'

export const REST_PRESETS = [60, 180, 240, 300, 420]

/** Accepts "2:30", "150" (seconds) or "2.5" (minutes when 20 or less). */
export function parseRest(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{1,2})$/)
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const n = parseFloat(t.replace(',', '.'))
  if (!isFinite(n) || n <= 0) return null
  return n <= 20 ? Math.round(n * 60) : Math.round(n)
}

interface Props {
  value: number
  onChange: (seconds: number) => void
  label?: string
}

export default function RestSelect({ value, onChange, label = 'Rest' }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const isPreset = REST_PRESETS.includes(value)
  const startEdit = () => { setText(fmtClock(value)); setEditing(true) }
  const commit = () => {
    const n = parseRest(text)
    if (n) onChange(Math.min(n, 3600))
    setEditing(false)
  }
  return (
    <span className="tiny muted row" style={{ gap: 4, flexWrap: 'nowrap' }}>
      {label}
      {editing ? (
        <input
          className="input" autoFocus inputMode="numeric" placeholder="m:ss" aria-label="Custom rest, minutes and seconds"
          style={{ minHeight: 32, padding: '2px 6px', width: 76 }} value={text}
          onChange={(e) => setText(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        />
      ) : (
        <>
          <select
            className="select" aria-label={label || 'Rest'} style={{ minHeight: 32, padding: '2px 6px', width: 'auto' }}
            value={isPreset ? value : 'custom'}
            onChange={(e) => { if (e.target.value === 'custom') startEdit(); else onChange(+e.target.value) }}
          >
            {REST_PRESETS.map((r) => <option key={r} value={r}>{r % 60 === 0 ? r / 60 + ' min' : fmtClock(r)}</option>)}
            <option value="custom">{isPreset ? 'Custom…' : 'Custom ' + fmtClock(value)}</option>
          </select>
          {!isPreset && (
            <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Edit custom rest" onClick={startEdit}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
            </button>
          )}
        </>
      )}
    </span>
  )
}
