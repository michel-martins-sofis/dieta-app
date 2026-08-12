import { useState } from 'react'
import type { DailyCalorieTotal } from '../contexts/FoodEntriesContext'

const WIDTH = 640
const HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 }
const MAX_BAR_WIDTH = 24

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatFullDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export function CaloriesChart({ totals, target }: { totals: DailyCalorieTotal[]; target: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const hasAnyData = totals.some((total) => total.caloriesKcal > 0)
  if (!hasAnyData) {
    return <p className="footnote">Ainda não há refeições registradas nesse período.</p>
  }

  const innerWidth = WIDTH - PADDING.left - PADDING.right
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom
  const maxValue = Math.max(target, ...totals.map((total) => total.caloriesKcal)) * 1.1 || 1

  const bandWidth = innerWidth / totals.length
  const barWidth = Math.min(MAX_BAR_WIDTH, bandWidth * 0.6)

  function xFor(index: number): number {
    return PADDING.left + index * bandWidth + bandWidth / 2
  }

  function yFor(value: number): number {
    return PADDING.top + innerHeight - (value / maxValue) * innerHeight
  }

  const ticks = [0, maxValue / 2, maxValue]
  const hovered = hoverIndex !== null ? totals[hoverIndex] : null
  const labelIndexes =
    totals.length <= 3 ? totals.map((_, index) => index) : [0, Math.floor((totals.length - 1) / 2), totals.length - 1]

  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img" aria-label="Calorias consumidas por dia, comparadas à meta">
        {ticks.map((tick) => (
          <g key={`tick-${tick}`}>
            <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={yFor(tick)} y2={yFor(tick)} className="chart-gridline" />
            <text x={PADDING.left - 8} y={yFor(tick)} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {totals.map((total, index) => (
          <rect
            key={total.date}
            x={xFor(index) - barWidth / 2}
            y={yFor(total.caloriesKcal)}
            width={barWidth}
            height={Math.max(0, PADDING.top + innerHeight - yFor(total.caloriesKcal))}
            rx={4}
            className={hoverIndex === index ? 'chart-bar chart-bar--active' : 'chart-bar'}
            tabIndex={0}
            aria-label={`${formatFullDate(total.date)}: ${total.caloriesKcal} kcal, meta ${target} kcal`}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex((current) => (current === index ? null : current))}
            onFocus={() => setHoverIndex(index)}
            onBlur={() => setHoverIndex((current) => (current === index ? null : current))}
          />
        ))}

        {target > 0 && (
          <>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yFor(target)}
              y2={yFor(target)}
              className="chart-target-line"
            />
            <text x={WIDTH - PADDING.right} y={yFor(target) - 6} className="chart-axis-label" textAnchor="end">
              Meta: {target} kcal
            </text>
          </>
        )}

        {labelIndexes.map((index) => (
          <text key={`label-${index}`} x={xFor(index)} y={HEIGHT - 8} className="chart-axis-label" textAnchor="middle">
            {formatShortDate(totals[index].date)}
          </text>
        ))}
      </svg>

      {hovered && (
        <div className="chart-tooltip" style={{ left: `${(xFor(hoverIndex ?? 0) / WIDTH) * 100}%` }}>
          <strong>{hovered.caloriesKcal} kcal</strong>
          <span>{formatFullDate(hovered.date)}</span>
        </div>
      )}

      <details className="chart-table-toggle">
        <summary>Ver dados em texto</summary>
        <table className="chart-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Calorias (kcal)</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((total) => (
              <tr key={total.date}>
                <td>{formatFullDate(total.date)}</td>
                <td>{total.caloriesKcal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
