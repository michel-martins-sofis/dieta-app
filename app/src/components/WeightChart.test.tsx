import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeightChart } from './WeightChart'

describe('WeightChart', () => {
  it('shows an empty-state message when there are no logs', () => {
    render(<WeightChart logs={[]} />)
    expect(screen.getByText(/ainda não há peso registrado/i)).toBeInTheDocument()
  })

  it('shows a single-value message when there is only one log', () => {
    render(
      <WeightChart
        logs={[{ id: 1, loggedDate: '2026-08-01', weightKg: 80, moment: null, confidence: null }]}
      />
    )
    expect(screen.getByText(/80 kg/)).toBeInTheDocument()
    expect(screen.getByText(/registre por mais alguns dias/i)).toBeInTheDocument()
  })

  it('renders a chart with an accessible point for every log and a text fallback table', () => {
    const logs = [
      { id: 1, loggedDate: '2026-08-01', weightKg: 82, moment: null, confidence: null },
      { id: 2, loggedDate: '2026-08-05', weightKg: 81, moment: null, confidence: null },
      { id: 3, loggedDate: '2026-08-10', weightKg: 80, moment: null, confidence: null },
    ]
    render(<WeightChart logs={logs} />)
    expect(screen.getByRole('img', { name: /evolução do peso/i })).toBeInTheDocument()
    logs.forEach((log) => {
      expect(screen.getByLabelText(new RegExp(`${log.weightKg} kg`))).toBeInTheDocument()
    })
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(logs.length + 1)
  })
})
