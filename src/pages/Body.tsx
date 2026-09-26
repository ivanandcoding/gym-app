import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { EXERCISES } from '../data/exercises'
import { e1rm, fmtNum, fmtWeight, fromUnit, isCounted, setsPerBodyPart, systemLoad, toUnit, todayStr } from '../lib/calc'
import { CATEGORY_LABEL, EXERCISE_TO_LIFT, LIFT_CATEGORY, ageFactor, liftScore, loadForScore, nextTier, rank, tierFor, type Category, type LiftResult, type RankLift } from '../lib/ranking'
import { BODY_PARTS, BODY_PART_LABEL } from '../types'
import { toast } from '../components/Toast'

const LIFT_NAME: Record<RankLift, string> = {
  backSquat: 'Squat', frontSquat: 'Front squat', deadlift: 'Deadlift', sumoDeadlift: 'Sumo deadlift', benchPress: 'Bench press',
  inclineBenchPress: 'Incline bench', dip: 'Dip', overheadPress: 'Overhead press', pushPress: 'Push press', chinup: 'Chin-up', pullup: 'Pull-up', pendlayRow: 'Barbell row',
}

export default function Body() {
  const s = useStore()
  const unit = s.settings.unit
  const bwNow = s.profile.weights[s.profile.weights.length - 1]?.kg ?? 73
  const [weightInput, setWeightInput] = useState(fmtNum(toUnit(bwNow, unit)))
  const [heightInput, setHeightInput] = useState(String(s.profile.heightCm))
  const [yearInput, setYearInput] = useState(s.profile.birthYear ? String(s.profile.birthYear) : '')
  const birthYear = s.profile.birthYear
  const ageAt = (ts: number): number | null => (birthYear ? new Date(ts).getFullYear() - birthYear : null)
  const ageNow = ageAt(Date.now())
  const factorNow = ageFactor(ageNow)

  // Best score per rankable lift, each session scored at the bodyweight and age of that day.
  const results = useMemo(() => {
    const lifts: LiftResult[] = []
    for (const w of s.workouts) {
      if (!w.finishedAt) continue
      const bw = w.bodyweightKg ?? s.bodyweightAt(w.startedAt)
      const age = birthYear ? new Date(w.startedAt).getFullYear() - birthYear : null
      for (const we of w.exercises) {
        const lift = EXERCISE_TO_LIFT[we.exerciseId]
        const ex = s.exercise(we.exerciseId)
        if (!lift || !ex) continue
        for (const st of we.sets) {
          if (!isCounted(st) || (st.reps ?? 0) > 10) continue
          const load = e1rm(systemLoad(ex, st.weight, bw), st.reps ?? 0)
          const score = liftScore(lift, load, bw, s.profile.sex, age)
          lifts.push({ lift, exerciseId: we.exerciseId, loadKg: load, score, date: w.startedAt })
        }
      }
    }
    return rank(lifts)
  }, [s.workouts, s.profile.sex, birthYear, s])

  const weekSets = useMemo(() => {
    const now = Date.now()
    const week = setsPerBodyPart(s.workouts, Object.fromEntries(s.allExercises().map((e) => [e.id, e])), now - 7 * 86400000, now)
    const month = setsPerBodyPart(s.workouts, Object.fromEntries(s.allExercises().map((e) => [e.id, e])), now - 28 * 86400000, now)
    return { week, month }
  }, [s.workouts, s])

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
    else { toast('Enter a birth year like 1995'); setYearInput(birthYear ? String(birthYear) : '') }
  }
  const overallTier = results.overall != null ? tierFor(results.overall) : null
  const rankableNames = EXERCISES.filter((e) => EXERCISE_TO_LIFT[e.id]).map((e) => e.name)

  return (
    <div className="page">
      <header className="topbar"><h1 className="title">Body<small>{s.profile.heightCm} cm · {fmtWeight(bwNow, unit)}{ageNow != null ? ' · ' + ageNow + ' years' : ''}</small></h1></header>
      <div className="stack">
        <div className="card card-pad">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Your stats</div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field grow"><label htmlFor="bw">Bodyweight today ({unit})</label><input id="bw" className="input" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} /></div>
            <button type="button" className="btn" onClick={saveWeight}>Log</button>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <div className="field grow"><label htmlFor="ht">Height (cm)</label><input id="ht" className="input" inputMode="numeric" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} onBlur={saveHeight} /></div>
            <div className="field"><label htmlFor="sex">Sex</label>
              <select id="sex" className="select" value={s.profile.sex} onChange={(e) => s.setProfile({ sex: e.target.value as 'male' | 'female' })}><option value="male">Male</option><option value="female">Female</option></select>
            </div>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <div className="field grow"><label htmlFor="by">Birth year</label><input id="by" className="input" inputMode="numeric" placeholder="e.g. 1995" value={yearInput} onChange={(e) => setYearInput(e.target.value)} onBlur={saveYear} /></div>
            <div className="field grow"><label>Age adjustment</label><div className="input" style={{ display: 'flex', alignItems: 'center' }}>{ageNow == null ? 'not set' : factorNow === 1 ? 'none (peak years, 23 to 40)' : '×' + fmtNum(factorNow, 3) + ' at ' + ageNow}</div></div>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>Rankings are normalised by bodyweight and age on the day of each lift. Age uses the powerlifting Foster and McCulloch coefficients: ages 23 to 40 are the baseline, younger and older lifters get credit for the same weight. Height is shown for your record but does not change the score: no published standard uses it.</p>
        </div>

        <div className="card">
          <div className="card-head">
            <div><div className="h3">Strength score</div><div className="tiny muted">Wilks-based, against strength athletes</div></div>
            {overallTier && <span className="rank-tier" style={{ color: overallTier.color }}>{overallTier.name}</span>}
          </div>
          <div className="card-body">
            {results.overall == null ? (
              <div className="empty small">Log a set of 10 reps or fewer on a rankable lift to get a score: {rankableNames.join(', ')}.</div>
            ) : (
              <>
                <div className="tiles" style={{ marginBottom: 10 }}>
                  <div className="tile" style={{ padding: 0 }}><div className="label">Overall</div><div className="value">{fmtNum(results.overall, 1)}</div><div className="sub">{nextTier(results.overall) ? 'next: ' + nextTier(results.overall)!.name + ' at ' + nextTier(results.overall)!.min : 'top tier'}</div></div>
                  <div className="tile" style={{ padding: 0 }}><div className="label">Balance</div><div className="value">{results.balance == null ? '—' : fmtNum(results.balance, 0)}</div><div className="sub">100 = all lifts equally strong</div></div>
                </div>
                <table className="data"><thead><tr><th>Pattern</th><th>Best lift</th><th>Score</th><th>Level</th></tr></thead><tbody>
                  {(Object.keys(CATEGORY_LABEL) as Category[]).map((cat) => {
                    const r = results.byCategory[cat]
                    const t = r ? tierFor(r.score) : null
                    return <tr key={cat}><td>{CATEGORY_LABEL[cat]}</td><td>{r ? LIFT_NAME[r.lift] + ' ' + loadLabel(r, bwNow, unit) : <span className="muted">not logged</span>}</td><td>{r ? fmtNum(r.score, 1) : '—'}</td><td>{t ? <span style={{ color: t.color, fontWeight: 700 }}>{t.name}</span> : '—'}</td></tr>
                  })}
                </tbody></table>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div><div className="h3">By body part</div><div className="tiny muted">From the lifts that load each muscle</div></div></div>
          <div className="card-body">
            {BODY_PARTS.map((bp) => {
              const r = results.bodyParts.find((x) => x.bodyPart === bp)!
              const t = r.score != null ? tierFor(r.score) : null
              const pct = r.score != null ? Math.max(4, Math.min(100, (r.score / 125) * 100)) : 0
              return (
                <div key={bp} className="rank-row">
                  <div><div className="bold">{BODY_PART_LABEL[bp]}</div><div className="tiny muted">{r.drivers.length ? r.drivers.map((l) => LIFT_NAME[l]).join(', ') : 'no ranked lift yet'}</div></div>
                  <div className="rank-bar"><i style={{ width: pct + '%', background: t?.color ?? 'var(--line)' }} /></div>
                  <div className="right"><div className="rank-tier" style={{ color: t?.color ?? 'var(--muted)' }}>{t ? t.name : '—'}</div><div className="tiny muted num">{r.score != null ? fmtNum(r.score, 0) : ''}</div></div>
                </div>
              )
            })}
            <p className="tiny muted" style={{ marginTop: 8 }}>Only barbell lifts, dips, pull-ups and chin-ups have public standards. Dumbbell, cable and machine work shows in Progress but cannot be ranked yet.</p>
          </div>
        </div>

        {results.lifts.length > 0 && (
          <div className="card">
            <div className="card-head"><div className="h3">Next level targets</div></div>
            <div className="card-body table-wrap">
              <table className="data"><thead><tr><th>Lift</th><th>Now</th><th>Level</th><th>Next level at</th></tr></thead><tbody>
                {results.lifts.sort((a, b) => b.score - a.score).map((r) => {
                  const nt = nextTier(r.score)
                  const target = nt ? loadForScore(r.lift, nt.min, bwNow, s.profile.sex, ageNow) : null
                  return <tr key={r.lift}><td><Link to={'/exercise/' + r.exerciseId}>{LIFT_NAME[r.lift]}</Link> <span className="tiny muted">{CATEGORY_LABEL[LIFT_CATEGORY[r.lift]]}</span></td><td>{loadLabel(r, bwNow, unit)}</td><td style={{ color: tierFor(r.score).color, fontWeight: 700 }}>{tierFor(r.score).name}</td><td>{target != null && nt ? loadLabelKg(r.lift, target, bwNow, unit) + ' (' + nt.name + ')' : '—'}</td></tr>
                })}
              </tbody></table>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-head"><div><div className="h3">Weekly sets</div><div className="tiny muted">Primary muscle counts 1, secondary 0.5 · aim for 10–20</div></div></div>
          <div className="card-body table-wrap">
            <table className="data"><thead><tr><th>Body part</th><th>Last 7 days</th><th>4-week avg</th></tr></thead><tbody>
              {BODY_PARTS.map((bp) => {
                const wk = weekSets.week[bp] ?? 0
                const avg = (weekSets.month[bp] ?? 0) / 4
                return <tr key={bp}><td>{BODY_PART_LABEL[bp]}</td><td style={{ color: wk >= 10 ? 'var(--good)' : wk > 0 ? undefined : 'var(--muted)' }}>{fmtNum(wk, 1)}</td><td>{fmtNum(avg, 1)}</td></tr>
              })}
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  )
}

function loadLabel(r: LiftResult, bwNow: number, unit: 'kg' | 'lb'): string {
  return loadLabelKg(r.lift, r.loadKg, bwNow, unit)
}
function loadLabelKg(lift: RankLift, loadKg: number, bwNow: number, unit: 'kg' | 'lb'): string {
  const belt = lift === 'dip' || lift === 'chinup' || lift === 'pullup'
  if (belt) { const added = loadKg - bwNow; return (added >= 0 ? '+' : '') + fmtNum(toUnit(added, unit)) + ' ' + unit }
  return fmtNum(toUnit(loadKg, unit)) + ' ' + unit
}
