import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodEntriesProvider, useFoodEntries, todayDateString } from './FoodEntriesContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockSingle = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()
const mockUpdate = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdateSelect = vi.fn()
const mockUpdateSingle = vi.fn()

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
    gte: (...args: unknown[]) => {
      const result = mockGte(...args)
      if (result && typeof result === 'object') {
        // Allows `.gte(...).lte(...)` (fetchEntriesInRange) to resolve through the
        // same configured mockGte value, without disturbing the existing
        // `.gte(...)`-is-terminal shape used by fetchDailyCalorieTotals/fetchDailyMacroTotals.
        ;(result as { lte?: unknown }).lte = (...lteArgs: unknown[]) => {
          mockLte(...lteArgs)
          return result
        }
      }
      return result
    },
    insert: (...args: unknown[]) => {
      mockInsert(...args)
      return {
        select: (...selArgs: unknown[]) => {
          mockInsertSelect(...selArgs)
          return { single: () => mockSingle() }
        },
      }
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args)
      return {
        eq: (...eqArgs: unknown[]) => {
          mockUpdateEq(...eqArgs)
          return {
            select: (...selArgs: unknown[]) => {
              mockUpdateSelect(...selArgs)
              return { single: () => mockUpdateSingle() }
            },
          }
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
  const {
    entries,
    loading,
    addEntry,
    updateEntry,
    removeEntry,
    fetchEntriesByDate,
    fetchDailyCalorieTotals,
    fetchDailyMacroTotals,
    fetchEntriesInRange,
  } = useFoodEntries()
  const [historyCount, setHistoryCount] = useState<number | null>(null)
  const [totalsSummary, setTotalsSummary] = useState<string | null>(null)
  const [macroSummary, setMacroSummary] = useState<string | null>(null)
  const [rangeSummary, setRangeSummary] = useState<string | null>(null)
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{entries.length}</span>
      <span data-testid="history-count">{historyCount ?? 'none'}</span>
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
      <button
        onClick={() =>
          addEntry(
            {
              mealType: 'lunch',
              name: 'Arroz e feijão',
              caloriesKcal: 400,
              proteinG: 15,
              carbG: 60,
              fatG: 5,
            },
            '2026-08-20'
          )
        }
      >
        adicionar-futuro
      </button>
      <button
        onClick={() =>
          updateEntry(1, {
            mealType: 'dinner',
            name: 'Sopa',
            caloriesKcal: 200,
            proteinG: 10,
            carbG: 20,
            fatG: 5,
          })
        }
      >
        editar-1
      </button>
      {entries.map((entry) => (
        <button key={entry.id} onClick={() => removeEntry(entry.id)}>
          remover-{entry.id}
        </button>
      ))}
      <button
        onClick={async () => {
          const { entries: fetched } = await fetchEntriesByDate('2026-08-01')
          setHistoryCount(fetched.length)
        }}
      >
        buscar-2026-08-01
      </button>
      <span data-testid="totals-summary">{totalsSummary ?? 'none'}</span>
      <button
        onClick={async () => {
          const { totals } = await fetchDailyCalorieTotals(3)
          setTotalsSummary(totals.map((t) => `${t.date}:${t.caloriesKcal}`).join(','))
        }}
      >
        totais-3-dias
      </button>
      <span data-testid="macro-summary">{macroSummary ?? 'none'}</span>
      <button
        onClick={async () => {
          const { totals } = await fetchDailyMacroTotals(3)
          setMacroSummary(totals.map((t) => `${t.date}:${t.proteinG}/${t.carbG}/${t.fatG}`).join(','))
        }}
      >
        macros-3-dias
      </button>
      <span data-testid="range-summary">{rangeSummary ?? 'none'}</span>
      <button
        onClick={async () => {
          const { entries: fetched } = await fetchEntriesInRange('2026-08-01', '2026-08-10')
          setRangeSummary(fetched.map((e) => `${e.loggedDate}:${e.name}`).join(','))
        }}
      >
        intervalo
      </button>
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
    mockGte.mockReset().mockResolvedValue({ data: [], error: null })
    mockLte.mockReset()
    mockUpdateEq.mockReset()
    mockUpdateSelect.mockReset()
    mockUpdateSingle.mockReset().mockResolvedValue({
      data: { id: 1, meal_type: 'dinner', name: 'Sopa', calories_kcal: 200, protein_g: 10, carb_g: 20, fat_g: 5 },
      error: null,
    })
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

  it('adds an entry for a future date without touching the current entries state', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('adicionar-futuro'))
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ logged_date: '2026-08-20' }))
    expect(screen.getByTestId('count').textContent).toBe('1')
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

  it('updates an existing entry in state', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('editar-1'))
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 1)
    await waitFor(() => expect(screen.getByText('remover-1')).toBeInTheDocument())
  })

  it('fetches entries for an arbitrary past date without touching the current entries state', async () => {
    mockOrder
      .mockResolvedValueOnce({ data: [ENTRY_ROW], error: null })
      .mockResolvedValueOnce({ data: [ENTRY_ROW, { ...ENTRY_ROW, id: 2 }], error: null })
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('buscar-2026-08-01'))
    await waitFor(() => expect(screen.getByTestId('history-count').textContent).toBe('2'))
    expect(mockEq).toHaveBeenCalledWith('logged_date', '2026-08-01')
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('aggregates daily calorie totals over a date range, filling days with no entries as zero', async () => {
    const today = todayDateString()
    const yesterday = new Date(`${today}T00:00:00`)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    mockGte.mockResolvedValue({
      data: [
        { logged_date: yesterdayStr, calories_kcal: 300 },
        { logged_date: yesterdayStr, calories_kcal: 150 },
      ],
      error: null,
    })
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('totais-3-dias'))
    await waitFor(() =>
      expect(screen.getByTestId('totals-summary').textContent).toContain(`${yesterdayStr}:450`)
    )
    expect(screen.getByTestId('totals-summary').textContent).toContain(`${today}:0`)
  })

  it('aggregates daily macro totals over a date range, filling days with no entries as zero', async () => {
    const today = todayDateString()
    const yesterday = new Date(`${today}T00:00:00`)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    mockGte.mockResolvedValue({
      data: [{ logged_date: yesterdayStr, protein_g: 10, carb_g: 20, fat_g: 5 }],
      error: null,
    })
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('macros-3-dias'))
    await waitFor(() =>
      expect(screen.getByTestId('macro-summary').textContent).toContain(`${yesterdayStr}:10/20/5`)
    )
    expect(screen.getByTestId('macro-summary').textContent).toContain(`${today}:0/0/0`)
  })

  it('fetches entries within an arbitrary date range', async () => {
    mockGte.mockResolvedValue({
      data: [{ ...ENTRY_ROW, logged_date: '2026-08-05' }],
      error: null,
    })
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('intervalo'))
    await waitFor(() =>
      expect(screen.getByTestId('range-summary').textContent).toBe('2026-08-05:Café com leite')
    )
    expect(mockGte).toHaveBeenCalledWith('logged_date', '2026-08-01')
    expect(mockLte).toHaveBeenCalledWith('logged_date', '2026-08-10')
  })
})
