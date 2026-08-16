import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MacrosChart } from './MacrosChart'

describe('MacrosChart', () => {
  it('shows an empty-state message when there is no macro data in the period', () => {
    render(
      <MacrosChart
        totals={[
          { date: '2026-08-01', proteinG: 0, carbG: 0, fatG: 0 },
          { date: '2026-08-02', proteinG: 0, carbG: 0, fatG: 0 },
        ]}
      />
    )
    expect(screen.getByText(/ainda não há dados suficientes de macros/i)).toBeInTheDocument()
  })

  it('renders one line per macro, a legend, and a text fallback table', () => {
    const totals = [
      { date: '2026-08-01', proteinG: 100, carbG: 200, fatG: 60 },
      { date: '2026-08-02', proteinG: 110, carbG: 180, fatG: 55 },
    ]
    render(<MacrosChart totals={totals} />)
    expect(
      screen.getByRole('img', { name: /proteína, carboidrato e gordura consumidos por dia/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Proteína')).toBeInTheDocument()
    expect(screen.getByText('Carboidrato')).toBeInTheDocument()
    expect(screen.getByText('Gordura')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(totals.length + 1)
  })
})
