import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealPlansProvider, useMealPlans } from './MealPlansContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()
const mockAddEntry = vi.fn()
const mockFetchEntriesByDate = vi.fn()

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('./FoodEntriesContext', async () => {
  const actual = await vi.importActual<typeof import('./FoodEntriesContext')>('./FoodEntriesContext')
  return {
    ...actual,
    useFoodEntries: () => ({ addEntry: mockAddEntry, fetchEntriesByDate: mockFetchEntriesByDate }),
  }
})

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
    delete: () => {
      mockDelete()
      return { eq: (...eqArgs: unknown[]) => mockDeleteEq(...eqArgs) }
    },
  }
  return chain
}

const PLAN_ROW = {
  id: 1,
  planned_date: '2026-09-01',
  meal_type: 'lunch',
  name: 'Frango grelhado',
  calories_kcal: 300,
  protein_g: 30,
  carb_g: 10,
  fat_g: 8,
}

function TestConsumer() {
  const { fetchPlansByDate, addPlannedMeal, removePlannedMeal, duplicateDay, commitPlannedDay } = useMealPlans()
  return (
    <div>
      <button
        onClick={async () => {
          const { plans } = await fetchPlansByDate('2026-09-01')
          document.title = `plans:${plans.length}`
        }}
      >
        buscar-planos
      </button>
      <button
        onClick={() =>
          addPlannedMeal(
            { mealType: 'lunch', name: 'Frango grelhado', caloriesKcal: 300, proteinG: 30, carbG: 10, fatG: 8 },
            '2026-09-01'
          )
        }
      >
        adicionar-plano
      </button>
      <button onClick={() => removePlannedMeal(1)}>remover-plano</button>
      <button onClick={() => duplicateDay('2026-08-01', '2099-01-01')}>duplicar-futuro</button>
      <button
        onClick={async () => {
          const { error } = await commitPlannedDay('2099-01-01')
          document.title = error ?? 'ok'
        }}
      >
        confirmar-futuro-invalido
      </button>
    </div>
  )
}

describe('MealPlansContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' } })
    mockOrder.mockReset().mockResolvedValue({ data: [PLAN_ROW], error: null })
    mockInsert.mockReset()
    mockDeleteEq.mockReset().mockResolvedValue({ error: null })
    mockAddEntry.mockReset().mockResolvedValue({ error: null })
    mockFetchEntriesByDate.mockReset().mockResolvedValue({
      entries: [
        { id: 5, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 },
      ],
      error: null,
    })
  })

  it('fetches plans for a given date scoped to the current user', async () => {
    render(
      <MealPlansProvider>
        <TestConsumer />
      </MealPlansProvider>
    )
    await userEvent.click(screen.getByText('buscar-planos'))
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockEq).toHaveBeenCalledWith('planned_date', '2026-09-01')
    expect(document.title).toBe('plans:1')
  })

  it('inserts a planned meal for the given date', async () => {
    render(
      <MealPlansProvider>
        <TestConsumer />
      </MealPlansProvider>
    )
    await userEvent.click(screen.getByText('adicionar-plano'))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', planned_date: '2026-09-01', name: 'Frango grelhado' })
    )
  })

  it('removes a planned meal by id', async () => {
    render(
      <MealPlansProvider>
        <TestConsumer />
      </MealPlansProvider>
    )
    await userEvent.click(screen.getByText('remover-plano'))
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 1)
  })

  it('duplicating into a future date inserts planned meals instead of real entries', async () => {
    render(
      <MealPlansProvider>
        <TestConsumer />
      </MealPlansProvider>
    )
    await userEvent.click(screen.getByText('duplicar-futuro'))
    expect(mockFetchEntriesByDate).toHaveBeenCalledWith('2026-08-01')
    expect(mockAddEntry).not.toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ planned_date: '2099-01-01', name: 'Café com leite' })
    )
  })

  it('refuses to commit a plan for a date in the future', async () => {
    render(
      <MealPlansProvider>
        <TestConsumer />
      </MealPlansProvider>
    )
    await userEvent.click(screen.getByText('confirmar-futuro-invalido'))
    expect(document.title).toMatch(/só é possível confirmar/i)
    expect(mockAddEntry).not.toHaveBeenCalled()
  })
})
