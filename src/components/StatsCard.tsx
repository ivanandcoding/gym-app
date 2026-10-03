import { useState } from 'react'
import { useStore } from '../store'
import { fmtNum, fromUnit, toUnit, todayStr } from '../lib/calc'
import { toast } from './Toast'

/** Height, bodyweight, sex and birth year. Bodyweight and age feed the strength score. */
export default function StatsCard() {
  const s = useStore()
  const unit = s.settings.unit
  const bwNow = s.profile.weights[s.profile.weights.length - 1]?.kg ?? 73
  const [weightInput, setWeightInput] = useState(fmtNum(toUnit(bwNow, unit)))
  const [heightInput, setHeightInput] = useState(String(s.profile.heightCm))
  const [yearInput, setYearInput] = useState(s.profile.birthYear ? String(s.profile.birthYear) : '')

  const saveWeight = () => {
    const n = parseFloat(weightInput.replace(',', '.'))
    if (!isFinite(n) || n <= 0) return
    s.logBodyweight(Math.round(fromUnit(n, unit) * 10) / 10, todayStr())
    toast('Bodyweight logged for today')
  }
  const saveHeight = () => {
    const n = parseInt(heightInput, 10)
    if (isFinite(n) && n > 0) s.setProfile({ heightCm: n })
  }
  const saveYear = () => {
    const n = parseInt(yearInput, 10)
    const thisYear = new Date().getFullYear()
    if (!yearInput.trim()) { s.setProfile({ birthYear: undefined }); return }
    if (isFinite(n) && n >= thisYear - 100 && n <= thisYear - 10) s.setProfile({ birthYear: n })
    else { toast('Enter a birth year like 1995'); setYearInput(s.profile.birthYear ? String(s.profile.birthYear) : '') }
  }

  return (
    <div className="card card-pad stack-sm">
      <div className="eyebrow">Your stats</div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field grow"><label htmlFor="bw">Bodyweight today ({unit})</label><input id="bw" className="input" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} /></div>
        <button type="button" className="btn" onClick={saveWeight}>Log</button>
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field grow"><label htmlFor="ht">Height (cm)</label><input id="ht" className="input" inputMode="numeric" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} onBlur={saveHeight} /></div>
        <div className="field grow"><label htmlFor="by">Birth year</label><input id="by" className="input" inputMode="numeric" placeholder="e.g. 1995" value={yearInput} onChange={(e) => setYearInput(e.target.value)} onBlur={saveYear} /></div>
        <div className="field"><label htmlFor="sex">Sex</label>
          <select id="sex" className="select" value={s.profile.sex} onChange={(e) => s.setProfile({ sex: e.target.value as 'male' | 'female' })}><option value="male">Male</option><option value="female">Female</option></select>
        </div>
      </div>
    </div>
  )
}
