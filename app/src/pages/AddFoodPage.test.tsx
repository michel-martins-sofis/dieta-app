import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AddFoodPage } from './AddFoodPage'
import { todayDateString } from '../contexts/FoodEntriesContext'

const today = todayDateString()

const mockAddEntry = vi.fn()
const mockUpdateEntry = vi.fn()
const mockFetchEntriesByDate = vi.fn()
const mockAddFavorite = vi.fn()
const mockUseFoodEntries = vi.fn()
const mockUseFavorites = vi.fn()
const mockAddPlannedMeal = vi.fn()
const mockSearchFoods = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/FoodEntriesContext', async () => {
  const actual = await vi.importActual<typeof import('../contexts/FoodEntriesContext')>('../contexts/FoodEntriesContext')
  return { ...actual, useFoodEntries: () => mockUseFoodEntries() }
})

vi.mock('../contexts/MealPlansContext', () => ({
  useMealPlans: () => ({ addPlannedMeal: mockAddPlannedMeal }),
}))

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => mockUseFavorites(),
}))

vi.mock('../lib/foodsApi', () => ({
  searchFoods: (...args: unknown[]) => mockSearchFoods(...args),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('AddFoodPage', () => {
  beforeEach(() => {
    mockAddEntry.mockReset()
    mockUpdateEntry.mockReset()
    mockFetchEntriesByDate.mockReset()
    mockAddFavorite.mockReset()
    mockAddPlannedMeal.mockReset()
    mockSearchFoods.mockReset()
    mockNavigate.mockReset()
    mockUseFoodEntries
      .mockReset()
      .mockReturnValue({ addEntry: mockAddEntry, updateEntry: mockUpdateEntry, fetchEntriesByDate: mockFetchEntriesByDate })
    mockUseFavorites.mockReset().mockReturnValue({ favorites: [], addFavorite: mockAddFavorite })
  })

  it('searches for a food, scales it by grams, and adds it to the selected meal', async () => {
    mockSearchFoods.mockResolvedValue([
      { id: 1, name: 'Arroz, integral, cozido', category: 'Cereais', caloriesKcal: 124, proteinG: 2.6, carbG: 25.8, fatG: 1 },
    ])
    mockAddEntry.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <AddFoodPage />
      </MemoryRouter>
    )

    await userEvent.type(screen.getByLabelText('Nome do alimento'), 'arroz')
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))
    await userEvent.click(await screen.findByText('Arroz, integral, cozido'))
    await userEvent.clear(screen.getByLabelText('Quantidade (g)'))
    await userEvent.type(screen.getByLabelText('Quantidade (g)'), '200')
    await userEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))

    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        mealType: 'breakfast',
        caloriesKcal: 248,
        proteinG: 5.2,
      }),
      today
    )
    expect(mockNavigate).toHaveBeenCalledWith(`/diario?date=${today}`)
  })

  it('adds a manual entry and optionally saves it as a favorite', async () => {
    mockAddEntry.mockResolvedValue({ error: null })
    mockAddFavorite.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <AddFoodPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Manual' }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Omelete')
    await userEvent.type(screen.getByLabelText('Calorias (kcal)'), '300')
    await userEvent.type(screen.getByLabelText('Proteína (g)'), '20')
    await userEvent.click(screen.getByLabelText(/salvar como favorito/i))
    await userEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))

    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Omelete', caloriesKcal: 300, proteinG: 20 }),
      today
    )
    expect(mockAddFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Omelete', caloriesKcal: 300, proteinG: 20 })
    )
  })

  it('adds an entry directly from a saved favorite', async () => {
    mockUseFavorites.mockReturnValue({
      favorites: [{ id: 1, name: 'Vitamina de banana', caloriesKcal: 250, proteinG: 8, carbG: 40, fatG: 5 }],
      addFavorite: mockAddFavorite,
    })
    mockAddEntry.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <AddFoodPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Favoritos' }))
    await userEvent.click(screen.getByText(/Vitamina de banana/))

    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Vitamina de banana', caloriesKcal: 250 }),
      today
    )
    expect(mockNavigate).toHaveBeenCalledWith(`/diario?date=${today}`)
  })

  it('shows an edit form pre-filled from the entry passed via navigation state, and saves via updateEntry', async () => {
    mockUpdateEntry.mockResolvedValue({ error: null })
    const entry = {
      id: 7,
      mealType: 'dinner' as const,
      name: 'Sopa de legumes',
      caloriesKcal: 180,
      proteinG: 8,
      carbG: 20,
      fatG: 4,
    }

    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/add-food', search: `?edit=7&date=${today}`, state: { entry } }]}
      >
        <AddFoodPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Editar alimento' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Sopa de legumes')
    expect(screen.getByLabelText('Calorias (kcal)')).toHaveValue(180)

    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    expect(mockUpdateEntry).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ name: 'Sopa de legumes', caloriesKcal: 180 })
    )
    expect(mockNavigate).toHaveBeenCalledWith(`/diario?date=${today}`)
  })

  it('plans a future meal instead of logging it when the target date is in the future', async () => {
    mockAddPlannedMeal.mockResolvedValue({ error: null })
    const futureDate = '2099-01-01'

    render(
      <MemoryRouter initialEntries={[{ pathname: '/add-food', search: `?date=${futureDate}` }]}>
        <AddFoodPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Manual' }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Salada')
    await userEvent.type(screen.getByLabelText('Calorias (kcal)'), '150')
    await userEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))

    expect(mockAddPlannedMeal).toHaveBeenCalledWith(expect.objectContaining({ name: 'Salada' }), futureDate)
    expect(mockAddEntry).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith(`/diario?date=${futureDate}`)
  })
})
