import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodEntriesProvider, useFoodEntries } from './FoodEntriesContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockSingle = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildSelectChain() {
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
      return {
        select: (...selArgs: unknown[]) => {
          mockInsertSelect(...selArgs)
          return { single: () => mockSingle() }
        },
      }
    },
    delete: () => {
      mockDelete()
      return { eq: (...eqArgs: unknown[]) => mockDeleteEq(...eqArgs) }
    },
  }
  return chain
}

const ENTRY_ROW = {
  id: 1,
  meal_type: 'breakfast',
  name: 'Café com leite',
  calories_kcal: 120,
  protein_g: 6,
  carb_g: 12,
  fat_g: 4,
}

function TestConsumer() {
  const { entries, loading, addEntry, removeEntry } = useFoodEntries()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{entries.length}</span>
      <button
        onClick={() =>
          addEntry({
            mealType: 'lunch',
            name: 'Arroz e feijão',
            caloriesKcal: 400,
            proteinG: 15,
            carbG: 60,
            fatG: 5,
          })
        }
      >
        adicionar
      </button>
      {entries.map((entry) => (
        <button key={entry.id} onClick={() => removeEntry(entry.id)}>
          remover-{entry.id}
        </button>
      ))}
    </div>
  )
}

describe('FoodEntriesContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildSelectChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' }, loading: false })
    mockOrder.mockReset().mockResolvedValue({ data: [ENTRY_ROW], error: null })
    mockSingle.mockReset().mockResolvedValue({
      data: { id: 2, meal_type: 'lunch', name: 'Arroz e feijão', calories_kcal: 400, protein_g: 15, carb_g: 60, fat_g: 5 },
      error: null,
    })
    mockDeleteEq.mockReset().mockResolvedValue({ error: null })
  })

  it('loads today\'s entries for the current user', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('stays loading while auth is still resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('adds a new entry and appends it to state', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('adicionar'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', meal_type: 'lunch', calories_kcal: 400 })
    )
  })

  it('removes an entry from state', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('remover-1'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 1)
  })
})
