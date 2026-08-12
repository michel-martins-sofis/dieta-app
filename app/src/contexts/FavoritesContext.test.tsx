import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FavoritesProvider, useFavorites } from './FavoritesContext'

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

const FAVORITE_ROW = {
  id: 1,
  name: 'Vitamina de banana',
  calories_kcal: 250,
  protein_g: 8,
  carb_g: 40,
  fat_g: 5,
}

function TestConsumer() {
  const { favorites, loading, addFavorite, removeFavorite } = useFavorites()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{favorites.length}</span>
      <button
        onClick={() =>
          addFavorite({ name: 'Omelete', caloriesKcal: 300, proteinG: 20, carbG: 2, fatG: 22 })
        }
      >
        adicionar
      </button>
      {favorites.map((favorite) => (
        <button key={favorite.id} onClick={() => removeFavorite(favorite.id)}>
          remover-{favorite.id}
        </button>
      ))}
    </div>
  )
}

describe('FavoritesContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' }, loading: false })
    mockOrder.mockReset().mockResolvedValue({ data: [FAVORITE_ROW], error: null })
    mockSingle.mockReset().mockResolvedValue({
      data: { id: 2, name: 'Omelete', calories_kcal: 300, protein_g: 20, carb_g: 2, fat_g: 22 },
      error: null,
    })
    mockDeleteEq.mockReset().mockResolvedValue({ error: null })
  })

  it('loads favorites for the current user', async () => {
    render(
      <FavoritesProvider>
        <TestConsumer />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('adds a favorite and appends it to state', async () => {
    render(
      <FavoritesProvider>
        <TestConsumer />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('adicionar'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', name: 'Omelete' }))
  })

  it('removes a favorite from state', async () => {
    render(
      <FavoritesProvider>
        <TestConsumer />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('remover-1'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 1)
  })
})
