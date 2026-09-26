import { useState } from 'react'
import { useStore } from '../store'
import { uid } from '../lib/calc'

/** Pinned note and machine settings for one exercise, shown every session. */
export default function MetaEditor({ exerciseId, compact = false }: { exerciseId: string; compact?: boolean }) {
  const meta = useStore((s) => s.exerciseMeta[exerciseId]) ?? { settings: [] }
  const setMeta = useStore((s) => s.setMeta)
  const [editing, setEditing] = useState(!compact && !meta.pinnedNote && meta.settings.length === 0)
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')

  const addSetting = () => {
    if (!label.trim()) return
    setMeta(exerciseId, { settings: meta.settings.concat({ id: uid('ms'), label: label.trim(), value: value.trim() }) })
    setLabel(''); setValue('')
  }
  const updateSetting = (id: string, patch: { label?: string; value?: string }) =>
    setMeta(exerciseId, { settings: meta.settings.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  const removeSetting = (id: string) => setMeta(exerciseId, { settings: meta.settings.filter((s) => s.id !== id) })

  const hasContent = !!meta.pinnedNote || meta.settings.length > 0
  if (!editing) {
    return (
      <div className="stack-sm">
        {meta.pinnedNote && (
          <div className="note-pinned">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 17v5M5 17h14M8 3h8l-1 7 3 3v4H6v-4l3-3z" /></svg>
            <span>{meta.pinnedNote}</span>
          </div>
        )}
        {meta.settings.length > 0 && (
          <div className="settings-grid">
            {meta.settings.map((s) => <div key={s.id} className="setting-chip"><span className="dim">{s.label}</span><b>{s.value || '—'}</b></div>)}
          </div>
        )}
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>
          {hasContent ? 'Edit note and settings' : '+ Note or machine settings'}
        </button>
      </div>
    )
  }
  return (
    <div className="stack-sm card-pad" style={{ background: 'var(--surface-2)', borderRadius: 10 }}>
      <div className="field">
        <label>Pinned note (shown every time)</label>
        <textarea className="textarea" rows={2} placeholder="e.g. Seat on 4, handles at the top notch, slow eccentric"
          value={meta.pinnedNote ?? ''} onChange={(e) => setMeta(exerciseId, { pinnedNote: e.target.value })} />
      </div>
      <div className="field">
        <label>Machine settings</label>
        {meta.settings.map((s) => (
          <div key={s.id} className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" placeholder="Setting" value={s.label} onChange={(e) => updateSetting(s.id, { label: e.target.value })} />
            <input className="input" placeholder="Value" value={s.value} style={{ maxWidth: 110 }} onChange={(e) => updateSetting(s.id, { value: e.target.value })} />
            <button type="button" className="icon-btn" aria-label="Remove setting" onClick={() => removeSetting(s.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        ))}
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="input" placeholder="e.g. Seat height" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSetting() }} />
          <input className="input" placeholder="e.g. 4" value={value} style={{ maxWidth: 110 }} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addSetting() }} />
          <button type="button" className="btn btn-sm" onClick={addSetting}>Add</button>
        </div>
      </div>
      <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(false)}>Done</button>
    </div>
  )
}
