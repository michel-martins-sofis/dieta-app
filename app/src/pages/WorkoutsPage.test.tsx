import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkoutsPage } from './WorkoutsPage'

const mockFetchWorkouts = vi.fn()
const mockAddWorkout = vi.fn()
const mockFetchPersonalRecords = vi.fn()

vi.mock('../contexts/WorkoutsContext', () => ({
  useWorkouts: () => ({
    fetchWorkouts: mockFetchWorkouts,
    addWorkout: mockAddWorkout,
    fetchPersonalRecords: mockFetchPersonalRecords,
  }),
}))

describe('WorkoutsPage', () => {
  beforeEach(() => {
    mockFetchWorkouts.mockReset().mockResolvedValue({ workouts: [], error: null })
    mockAddWorkout.mockReset().mockResolvedValue({ error: null })
    mockFetchPersonalRecords.mockReset().mockResolvedValue({ records: [], error: null })
  })

  it('shows a message when there are no workouts yet', async () => {
    render(<WorkoutsPage />)
    expect(await screen.findByText(/nenhum treino registrado ainda/i)).toBeInTheDocument()
  })

  it('lists workouts with their exercises and sets', async () => {
    mockFetchWorkouts.mockResolvedValue({
      workouts: [
        {
          id: 1,
          workoutDate: '2026-06-03',
          type: 'strength',
          durationMinutes: null,
          notes: null,
          confidence: 'confirmed',
          exercises: [
            {
              id: 10,
              name: 'agachamento',
              sets: [
                { id: 100, reps: 1, repsMin: null, repsMax: null, loadKg: 180, setCount: null, isPr: true, notes: null },
              ],
            },
          ],
        },
      ],
      error: null,
    })
    render(<WorkoutsPage />)
    expect(await screen.findByText('Força')).toBeInTheDocument()
    await userEvent.click(screen.getByText(/ver exercícios/i))
    expect(screen.getByText('agachamento')).toBeInTheDocument()
    expect(screen.getByText(/180 kg/)).toBeInTheDocument()
    expect(screen.getByText(/recorde pessoal/i)).toBeInTheDocument()
  })

  it('shows personal records when present', async () => {
    mockFetchPersonalRecords.mockResolvedValue({
      records: [{ id: 1, exercise: 'supino', loadKg: 100, reps: 1, recordDate: null, confidence: 'confirmed' }],
      error: null,
    })
    render(<WorkoutsPage />)
    expect(await screen.findByText('supino')).toBeInTheDocument()
  })

  it('submits a basic workout form', async () => {
    render(<WorkoutsPage />)
    await screen.findByText(/nenhum treino registrado ainda/i)

    await userEvent.type(screen.getByLabelText('Tipo'), 'pernas')
    await userEvent.click(screen.getByRole('button', { name: /registrar treino/i }))

    expect(mockAddWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pernas', durationMinutes: null, notes: null })
    )
  })
})
