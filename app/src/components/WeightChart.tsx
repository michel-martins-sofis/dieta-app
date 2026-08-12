import { useState } from 'react'
import type { WeightLog } from '../contexts/WeightLogsContext'

const WIDTH = 640
const HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 }

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatFullDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export function WeightChart({ logs }: { logs: WeightLog[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (logs.length === 0) {
    return <p className="footnote">Ainda não há peso registrado. Use o campo acima para começar.</p>
  }

  if (logs.length === 1) {
    return (
      <p className="footnote">
        Peso registrado: <strong>{logs[0].weightKg} kg</strong> em {formatFullDate(logs[0].loggedDate)}. Registre por mais
        alguns dias para ver a evolução em gráfico.
      </p>
    )
  }

  const weights = logs.map((log) => log.weightKg)
  const rawMin = Math.min(...weights)
  const rawMax = Math.max(...weights)
  const min = rawMax === rawMin ? rawMin - 1 : rawMin - (rawMax - rawMin) * 0.15
  const max = rawMax === rawMin ? rawMax + 1 : rawMax + (rawMax - rawMin) * 0.15

  const innerWidth = WIDTH - PADDING.left - PADDING.right
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom

  function xFor(index: number): number {
    return PADDING.left + (logs.length === 1 ? 0 : (index / (logs.length - 1)) * innerWidth)
  }

  function yFor(weightKg: number): number {
    const ratio = (weightKg - min) / (max - min)
    return PADDING.top + innerHeight - ratio * innerHeight
  }

  const linePoints = logs.map((log, index) => `${xFor(index)},${yFor(log.weightKg)}`).join(' ')
  const areaPoints = `${xFor(0)},${PADDING.top + innerHeight} ${linePoints} ${xFor(logs.length - 1)},${PADDING.top + innerHeight}`

  const ticks = [min, (min + max) / 2, max]
  const hovered = hoverIndex !== null ? logs[hoverIndex] : null

  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img" aria-label="Evolução do peso ao longo do tempo">
        {ticks.map((tick) => (
          <g key={`tick-${tick}`}>
            <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={yFor(tick)} y2={yFor(tick)} className="chart-gridline" />
            <text x={PADDING.left - 8} y={yFor(tick)} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
              {tick.toFixed(1)}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} className="chart-area" />
        <polyline points={linePoints} className="chart-line" />

        {logs.map((log, index) => (
          <circle
            key={`dot-${log.id}`}
            cx={xFor(index)}
            cy={yFor(log.weightKg)}
            r={5}
            className="chart-dot"
          />
        ))}

        {logs.map((log, index) => (
          <circle
            key={`hit-${log.id}`}
            cx={xFor(index)}
            cy={yFor(log.weightKg)}
            r={14}
            className="chart-hit-area"
            tabIndex={0}
            aria-label={`${formatFullDate(log.loggedDate)}: ${log.weightKg} kg`}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex((current) => (current === index ? null : current))}
            onFocus={() => setHoverIndex(index)}
            onBlur={() => setHoverIndex((current) => (current === index ? null : current))}
          />
        ))}

        {[0, Math.floor((logs.length - 1) / 2), logs.length - 1].map((index) => (
          <text
            key={`label-${index}`}
            x={xFor(index)}
            y={HEIGHT - 8}
            className="chart-axis-label"
            textAnchor="middle"
          >
            {formatShortDate(logs[index].loggedDate)}
          </text>
        ))}
      </svg>

      {hovered && (
        <div className="chart-tooltip" style={{ left: `${(xFor(hoverIndex ?? 0) / WIDTH) * 100}%` }}>
          <strong>{hovered.weightKg} kg</strong>
          <span>{formatFullDate(hovered.loggedDate)}</span>
        </div>
      )}

      <details className="chart-table-toggle">
        <summary>Ver dados em texto</summary>
        <table className="chart-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Peso (kg)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatFullDate(log.loggedDate)}</td>
                <td>{log.weightKg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
