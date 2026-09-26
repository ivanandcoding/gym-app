import { useRef, useState } from 'react'
import { fmtDate, fmtNum } from '../lib/calc'

export interface ChartPoint { date: number; value: number; sub?: string }

interface Props {
  points: ChartPoint[]
  format: (v: number) => string
  ariaLabel: string
}

function niceStep(span: number, target: number): number {
  const raw = span / target
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= raw) return m * pow
  return 10 * pow
}

export default function Chart({ points, format, ariaLabel }: Props) {
  const [active, setActive] = useState<number | null>(null)
  const host = useRef<HTMLDivElement>(null)
  if (!points.length) return <div className="empty small">No sessions yet</div>

  const W = 600, H = 250, L = 46, R = 58, T = 18, B = 30
  const vals = points.map((p) => p.value)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (hi - lo < 1e-9) { lo -= 5; hi += 5 }
  const step = niceStep((hi - lo) * 1.25, 4)
  const y0 = Math.floor((lo - (hi - lo) * 0.15) / step) * step
  const y1 = Math.ceil((hi + (hi - lo) * 0.15) / step) * step
  const t0 = points[0].date, t1 = points[points.length - 1].date
  const x = (d: number) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((d - t0) / (t1 - t0)) * (W - L - R))
  const y = (v: number) => T + ((y1 - v) / (y1 - y0)) * (H - T - B)
  const coords = points.map((p) => [x(p.date), y(p.value)] as const)
  const linePath = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ')
  const areaPath = linePath + ` L${coords[coords.length - 1][0].toFixed(1)} ${y(y0).toFixed(1)} L${coords[0][0].toFixed(1)} ${y(y0).toFixed(1)} Z`

  const ticks: number[] = []
  for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(v)
  const nx = Math.min(points.length, 5)
  const xIdx = [...new Set(Array.from({ length: nx }, (_, i) => (nx === 1 ? 0 : Math.round((i * (points.length - 1)) / (nx - 1)))))]
  let runMax = -Infinity, maxI = 0
  vals.forEach((v, i) => { if (v > runMax) { runMax = v; maxI = i } })
  const prs = vals.map((v, i) => i > 0 && v > Math.max(...vals.slice(0, i)))
  const end = coords[coords.length - 1]

  const onMove = (clientX: number) => {
    const svg = host.current?.querySelector('svg')
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * W
    let best = 0
    coords.forEach((c, i) => { if (Math.abs(c[0] - px) < Math.abs(coords[best][0] - px)) best = i })
    setActive(best)
  }
  const tipLeft = active != null && host.current ? (coords[active][0] / W) * host.current.getBoundingClientRect().width : 0
  const tipRight = active != null && host.current ? tipLeft > host.current.getBoundingClientRect().width / 2 : false

  return (
    <div className="chart" ref={host}>
      <svg
        viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} tabIndex={0}
        onPointerMove={(e) => onMove(e.clientX)} onPointerDown={(e) => onMove(e.clientX)} onPointerLeave={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault()
            setActive((a) => Math.max(0, Math.min(points.length - 1, (a ?? points.length - 1) + (e.key === 'ArrowRight' ? 1 : -1))))
          }
          if (e.key === 'Escape') setActive(null)
        }}
        onBlur={() => setActive(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="tick" x={L - 8} y={y(v) + 4} textAnchor="end">{fmtNum(v)}</text>
          </g>
        ))}
        <line className="axis" x1={L} x2={W - R} y1={y(y0)} y2={y(y0)} />
        {xIdx.map((i) => (
          <text key={i} className="tick" x={x(points[i].date)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
            {fmtDate(points[i].date)}
          </text>
        ))}
        {points.length > 1 && <path className="area" d={areaPath} />}
        {points.length > 1 && <path className="line" d={linePath} />}
        {active != null && <line className="xhair" x1={coords[active][0]} x2={coords[active][0]} y1={T} y2={y(y0)} />}
        {coords.map((c, i) => <circle key={i} className={'dot' + (prs[i] ? ' pr' : '')} cx={c[0]} cy={c[1]} r={active === i ? 5.5 : 4} />)}
        <text className="lbl" x={end[0] + 10} y={end[1] + 4}>{format(points[points.length - 1].value)}</text>
        {maxI !== points.length - 1 && points.length > 2 && (
          <text className="lbl sub" x={coords[maxI][0]} y={coords[maxI][1] - 10} textAnchor="middle">best {format(points[maxI].value)}</text>
        )}
        <rect className="hit" x={L} y={T} width={W - L - R} height={H - T} />
      </svg>
      {active != null && (
        <div className="tip" style={tipRight ? { right: Math.max(0, (host.current?.getBoundingClientRect().width ?? 0) - tipLeft + 12) } : { left: tipLeft + 12 }}>
          <div><b>{format(points[active].value)}</b></div>
          <div className="small dim">{fmtDate(points[active].date, true)}{points[active].sub ? ' · ' + points[active].sub : ''}</div>
        </div>
      )}
    </div>
  )
}
