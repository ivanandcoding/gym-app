import { useRef, useState } from 'react'
import { useStore } from '../store'
import { todayStr } from '../lib/calc'
import { toast } from '../components/Toast'
import { NEUTRALS, THEMES } from '../data/themes'
import RestSelect from '../components/RestSelect'
import StatsCard from '../components/StatsCard'
import BackupsCard from '../components/BackupsCard'

export default function SettingsPage() {
  const s = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  const exportData = () => {
    const blob = new Blob([s.exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'gym-app-backup-' + todayStr() + '.json'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  const importData = (f: File | undefined) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => { const r = s.importJson(String(reader.result)); toast(r.message) }
    reader.readAsText(f)
  }

  return (
    <div className="page">
      <header className="topbar"><h1 className="title">Settings</h1></header>
      <div className="stack">
        <div className="card card-pad stack-sm">
          <div className="eyebrow">Theme</div>
          <div className="row" style={{ gap: 8 }}>
            {THEMES.map((t) => {
              const on = (s.settings.theme ?? 'forest') === t.id
              return (
                <button key={t.id} type="button" className="btn grow" aria-pressed={on} onClick={() => s.setSettings({ theme: t.id })}
                  style={{ background: NEUTRALS.bg, borderColor: on ? t.accent2 : NEUTRALS.surface, color: NEUTRALS.ink, borderWidth: 2, minHeight: 56, flexDirection: 'column', gap: 4 }}>
                  <span className="row" style={{ gap: 4 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 7, background: t.accent }} />
                    <span style={{ width: 14, height: 14, borderRadius: 7, background: t.accent2 }} />
                  </span>
                  <span>{t.name}{on ? ' ✓' : ''}</span>
                </button>
              )
            })}
          </div>
        </div>

        <StatsCard />

        <div className="card card-pad stack-sm">
          <div className="eyebrow">Training</div>
          <div className="row-between"><span>Weight unit</span>
            <div className="seg"><button type="button" aria-pressed={s.settings.unit === 'kg'} onClick={() => s.setSettings({ unit: 'kg' })}>kg</button><button type="button" aria-pressed={s.settings.unit === 'lb'} onClick={() => s.setSettings({ unit: 'lb' })}>lb</button></div>
          </div>
          <div className="row-between"><span>Barbell weight (plate math)</span>
            <select className="select" style={{ width: 'auto' }} value={s.settings.barKg} onChange={(e) => s.setSettings({ barKg: +e.target.value })}><option value={20}>20 kg</option><option value={15}>15 kg</option><option value={10}>10 kg</option></select>
          </div>
          <div className="row-between"><span>Default rest for new exercises</span>
            <RestSelect label="" value={s.settings.defaultRest} onChange={(v) => s.setSettings({ defaultRest: v })} />
          </div>
          <label className="row-between"><span>Keep the screen on during a workout</span><input type="checkbox" checked={s.settings.keepAwake} onChange={(e) => s.setSettings({ keepAwake: e.target.checked })} /></label>
          <label className="row-between"><span>Beep when rest is over</span><input type="checkbox" checked={s.settings.sound} onChange={(e) => s.setSettings({ sound: e.target.checked })} /></label>
          <p className="tiny muted">On iPhone the timer can only alert while the app is on screen, which is why the screen stays on. Put the phone face up between sets.</p>
        </div>

        <div className="card card-pad stack-sm">
          <div className="eyebrow">Your data</div>
          <p className="small dim">Everything is stored on this device. Export a backup now and then, and after any change you would hate to lose.</p>
          <div className="row">
            <button type="button" className="btn" onClick={exportData}>Export backup</button>
            <button type="button" className="btn" onClick={() => file.current?.click()}>Import backup</button>
            <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { importData(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <BackupsCard />
          <div className="row" style={{ marginTop: 6 }}>
            {confirmWipe ? (
              <>
                <span className="small">Delete all workouts, templates and notes?</span>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => { s.wipe(); setConfirmWipe(false); toast('Everything deleted') }}>Yes, delete</button>
                <button type="button" className="btn btn-sm" onClick={() => setConfirmWipe(false)}>Keep</button>
              </>
            ) : <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmWipe(true)}>Delete all data</button>}
          </div>
        </div>

      </div>
    </div>
  )
}
