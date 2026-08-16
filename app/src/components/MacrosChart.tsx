import { useState } from 'react'
import type { DailyMacroTotal } from '../contexts/FoodEntriesContext'

const WIDTH = 640
const HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 }

const SERIES = [
  { key: 'proteinG', label: 'Proteína', className: 'protein' },
  { key: 'carbG', label: 'Carboidrato', className: 'carb' },
  { key: 'fatG', label: 'Gordura', className: 'fat' },
] as const

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatFullDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export function MacrosChart({ totals }: { totals: DailyMacroTotal[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const hasAnyData = totals.some((total) => total.proteinG > 0 || total.carbG > 0 || total.fatG > 0)
  if (!hasAnyData || totals.length < 2) {
    return <p className="footnote">Ainda não há dados suficientes de macros nesse período.</p>
  }

  const innerWidth = WIDTH - PADDING.left - PADDING.right
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom
  const maxValue =
    Math.max(...totals.flatMap((total) => [total.proteinG, total.carbG, total.fatG])) * 1.1 || 1

  function xFor(index: number): number {
    return PADDING.left + (index / (totals.length - 1)) * innerWidth
  }

  function yFor(value: number): number {
    return PADDING.top + innerHeight - (value / maxValue) * innerHeight
  }

  const ticks = [0, maxValue / 2, maxValue]
  const hovered = hoverIndex !== null ? totals[hoverIndex] : null

  return (
    <div className="chart-wrapper">
      <div className="chart-legend">
        {SERIES.map((series) => (
          <span key={series.key} className={`chart-legend-item chart-legend-item--${series.className}`}>
            {series.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="chart-svg"
        role="img"
        aria-label="Proteína, carboidrato e gordura consumidos por dia"
      >
        {ticks.map((tick) => (
          <g key={`tick-${tick}`}>
            <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={yFor(tick)} y2={yFor(tick)} className="chart-gridline" />
            <text x={PADDING.left - 8} y={yFor(tick)} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {SERIES.map((series) => (
          <polyline
            key={series.key}
            points={totals.map((total, index) => `${xFor(index)},${yFor(total[series.key])}`).join(' ')}
            className={`chart-line chart-line--${series.className}`}
          />
        ))}

        {totals.map((total, index) => (
          <circle
            key={`hit-${total.date}`}
            cx={xFor(index)}
            cy={PADDING.top + innerHeight / 2}
            r={14}
            className="chart-hit-area"
            tabIndex={0}
            aria-label={`${formatFullDate(total.date)}: proteína ${total.proteinG}g, carboidrato ${total.carbG}g, gordura ${total.fatG}g`}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex((current) => (current === index ? null : current))}
            onFocus={() => setHoverIndex(index)}
            onBlur={() => setHoverIndex((current) => (current === index ? null : current))}
          />
        ))}

        {[0, Math.floor((totals.length - 1) / 2), totals.length - 1].map((index) => (
          <text key={`label-${index}`} x={xFor(index)} y={HEIGHT - 8} className="chart-axis-label" textAnchor="middle">
            {formatShortDate(totals[index].date)}
          </text>
        ))}
      </svg>

      {hovered && (
        <div className="chart-tooltip" style={{ left: `${(xFor(hoverIndex ?? 0) / WIDTH) * 100}%` }}>
          <strong>{formatFullDate(hovered.date)}</strong>
          <span>P: {hovered.proteinG}g · C: {hovered.carbG}g · G: {hovered.fatG}g</span>
        </div>
      )}

      <details className="chart-table-toggle">
        <summary>Ver dados em texto</summary>
        <table className="chart-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Proteína (g)</th>
              <th>Carboidrato (g)</th>
              <th>Gordura (g)</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((total) => (
              <tr key={total.date}>
                <td>{formatFullDate(total.date)}</td>
                <td>{total.proteinG}</td>
                <td>{total.carbG}</td>
                <td>{total.fatG}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
