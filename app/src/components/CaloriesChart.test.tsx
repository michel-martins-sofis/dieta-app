import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CaloriesChart } from './CaloriesChart'

describe('CaloriesChart', () => {
  it('shows an empty-state message when there are no entries in the period', () => {
    render(
      <CaloriesChart
        totals={[
          { date: '2026-08-01', caloriesKcal: 0 },
          { date: '2026-08-02', caloriesKcal: 0 },
        ]}
        target={2000}
      />
    )
    expect(screen.getByText(/ainda não há refeições registradas/i)).toBeInTheDocument()
  })

  it('renders a bar per day with the target visible and a text fallback table', () => {
    const totals = [
      { date: '2026-08-01', caloriesKcal: 1800 },
      { date: '2026-08-02', caloriesKcal: 0 },
      { date: '2026-08-03', caloriesKcal: 2200 },
    ]
    render(<CaloriesChart totals={totals} target={2000} />)
    expect(screen.getByRole('img', { name: /calorias consumidas por dia/i })).toBeInTheDocument()
    expect(screen.getByText(/meta: 2000 kcal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/1800 kcal, meta 2000 kcal/i)).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(totals.length + 1)
  })
})
