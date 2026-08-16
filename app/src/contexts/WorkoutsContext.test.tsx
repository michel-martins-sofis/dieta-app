import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkoutsProvider, useWorkouts } from './WorkoutsContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockInsert = vi.fn()

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildChain() {
  const chain = {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return chain
    },
    eq: (...args: unknown[]) => {
      mockEq(...args)
      return chain
    },
    order: (...args: unknown[]) => mockOrder(...args),
    insert: (...args: unknown[]) => {
      mockInsert(...args)
      return Promise.resolve({ error: null })
    },
  }
  return chain
}

const WORKOUT_ROW = {
  id: 1,
  workout_date: '2026-06-03',
  type: 'strength',
  duration_minutes: null,
  notes: null,
  confidence: 'confirmed',
  workout_exercises: [
    {
      id: 10,
      name: 'agachamento',
      sort_order: 0,
      workout_sets: [
        { id: 100, reps: 1, reps_min: null, reps_max: null, load_kg: 180, set_count: null, is_pr: true, notes: null, sort_order: 0 },
      ],
    },
  ],
}

const RECORD_ROW = { id: 1, exercise: 'agachamento', load_kg: 180, reps: 1, record_date: '2026-06-03', confidence: 'confirmed' }

function TestConsumer() {
  const { fetchWorkouts, addWorkout, fetchPersonalRecords } = useWorkouts()
  return (
    <div>
      <button
        onClick={async () => {
          const { workouts } = await fetchWorkouts()
          document.title = JSON.stringify(workouts)
        }}
      >
        buscar-treinos
      </button>
      <button onClick={() => addWorkout({ workoutDate: '2026-08-15', type: 'pernas', durationMinutes: 45, notes: 'ok' })}>
        adicionar-treino
      </button>
      <button
        onClick={async () => {
          const { records } = await fetchPersonalRecords()
          document.title = `records:${records.length}`
        }}
      >
        buscar-recordes
      </button>
    </div>
  )
}

describe('WorkoutsContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' } })
    mockOrder.mockReset().mockResolvedValue({ data: [WORKOUT_ROW], error: null })
    mockInsert.mockReset()
  })

  it('fetches workouts with nested exercises and sets, mapped to camelCase', async () => {
    render(
      <WorkoutsProvider>
        <TestConsumer />
      </WorkoutsProvider>
    )
    await userEvent.click(screen.getByText('buscar-treinos'))
    expect(mockFrom).toHaveBeenCalledWith('workouts')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')

    const workouts = JSON.parse(document.title)
    expect(workouts).toHaveLength(1)
    expect(workouts[0].exercises[0].name).toBe('agachamento')
    expect(workouts[0].exercises[0].sets[0]).toEqual({
      id: 100,
      reps: 1,
      repsMin: null,
      repsMax: null,
      loadKg: 180,
      setCount: null,
      isPr: true,
      notes: null,
    })
  })

  it('inserts a basic workout', async () => {
    render(
      <WorkoutsProvider>
        <TestConsumer />
      </WorkoutsProvider>
    )
    await userEvent.click(screen.getByText('adicionar-treino'))
    expect(mockFrom).toHaveBeenCalledWith('workouts')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', workout_date: '2026-08-15', type: 'pernas', duration_minutes: 45 })
    )
  })

  it('fetches personal records scoped to the current user', async () => {
    mockOrder.mockResolvedValue({ data: [RECORD_ROW], error: null })
    render(
      <WorkoutsProvider>
        <TestConsumer />
      </WorkoutsProvider>
    )
    await userEvent.click(screen.getByText('buscar-recordes'))
    expect(mockFrom).toHaveBeenCalledWith('personal_records')
    expect(document.title).toBe('records:1')
  })

  it('returns an error when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    render(
      <WorkoutsProvider>
        <TestConsumer />
      </WorkoutsProvider>
    )
    await userEvent.click(screen.getByText('adicionar-treino'))
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
