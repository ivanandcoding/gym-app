import { useMemo } from 'react'
import { useStore } from '../store'
import { dateToTs, e1rm, fmtNum, isCounted, setsPerBodyPart, systemLoad } from '../lib/calc'
import { EXERCISE_TO_LIFT, liftScore, nextTier, rank, tierFor, TIERS, type LiftResult } from '../lib/ranking'
import { BODY_PARTS, BODY_PART_LABEL } from '../types'
import OneRmCard from '../components/OneRmCard'

export default function Body() {
  const s = useStore()
  const birthYear = s.profile.birthYear

  // Best score per rankable lift, each scored at the bodyweight and age of that day.
  const results = useMemo(() => {
    const lifts: LiftResult[] = []
    const ageAt = (ts: number) => (birthYear ? new Date(ts).getFullYear() - birthYear : null)
    for (const w of s.workouts) {
      if (!w.finishedAt) continue
      const bw = w.bodyweightKg ?? s.bodyweightAt(w.startedAt)
      for (const we of w.exercises) {
        const lift = EXERCISE_TO_LIFT[we.exerciseId]
        const ex = s.exercise(we.exerciseId)
        if (!lift || !ex) continue
        for (const st of we.sets) {
          if (!isCounted(st) || (st.reps ?? 0) > 10) continue
          const load = e1rm(systemLoad(ex, st.weight, bw), st.reps ?? 0)
          lifts.push({ lift, exerciseId: we.exerciseId, loadKg: load, score: liftScore(lift, load, bw, s.profile.sex, ageAt(w.startedAt)), date: w.startedAt })
        }
      }
    }
    for (const r of s.oneRms) {
      const lift = EXERCISE_TO_LIFT[r.exerciseId]
      const ex = s.exercise(r.exerciseId)
      if (!lift || !ex) continue
      const ts = dateToTs(r.date)
      const load = systemLoad(ex, r.weightKg, r.bodyweightKg)
      lifts.push({ lift, exerciseId: r.exerciseId, loadKg: load, score: liftScore(lift, load, r.bodyweightKg, s.profile.sex, ageAt(ts)), date: ts, tested: true })
    }
    return rank(lifts)
  }, [s.workouts, s.oneRms, s.profile.sex, birthYear, s])

  const weekSets = useMemo(() => {
    const now = Date.now()
    const map = Object.fromEntries(s.allExercises().map((e) => [e.id, e]))
    return { week: setsPerBodyPart(s.workouts, map, now - 7 * 86400000, now), month: setsPerBodyPart(s.workouts, map, now - 28 * 86400000, now) }
  }, [s.workouts, s])

  const overall = results.overall
  const tier = overall != null ? tierFor(overall) : null
  const next = overall != null ? nextTier(overall) : null
  const floor = tier ? Math.max(0, tier.min === -Infinity ? 0 : tier.min) : 0
  const progress = overall != null && next ? Math.min(1, Math.max(0, (overall - floor) / (next.min - floor))) : overall != null ? 1 : 0

  return (
    <div className="page">
      <header className="topbar"><h1 className="title">Body</h1></header>
      <div className="stack">
        <div className="card hero">
          <div className="eyebrow">Strength score</div>
          {overall == null ? (
            <div className="dim" style={{ marginTop: 6 }}>Log a barbell lift, dip or pull-up to get a score.</div>
          ) : (
            <>
              <div className="hero-score" style={{ color: tier!.color }}>{fmtNum(overall, 0)}</div>
              <div className="hero-tier" style={{ color: tier!.color }}>{tier!.name}</div>
              <div className="hero-bar"><i style={{ width: progress * 100 + '%', background: tier!.color }} /></div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-head"><div className="h3">By body part</div></div>
          <div className="card-body">
            {BODY_PARTS.map((bp) => {
              const r = results.bodyParts.find((x) => x.bodyPart === bp)!
              const t = r.score != null ? tierFor(r.score) : null
              const pct = r.score != null ? Math.max(4, Math.min(100, (r.score / TIERS[0].min) * 100)) : 0
              return (
                <div key={bp} className="rank-row">
                  <div className="bold">{BODY_PART_LABEL[bp]}</div>
                  <div className="rank-bar"><i style={{ width: pct + '%', background: t?.color ?? 'var(--line)' }} /></div>
                  <div className="right"><div className="rank-tier" style={{ color: t?.color ?? 'var(--muted)' }}>{t ? t.name : '—'}</div><div className="tiny muted num">{r.score != null ? fmtNum(r.score, 0) : ''}</div></div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="h3">Weekly sets</div></div>
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

        <OneRmCard />
      </div>
    </div>
  )
}
