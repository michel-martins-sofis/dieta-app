import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FoodLogPage } from './FoodLogPage'
import { todayDateString } from '../contexts/FoodEntriesContext'

const mockRemoveEntry = vi.fn()
const mockFetchEntriesByDate = vi.fn()
const mockUseFoodEntries = vi.fn()
const mockFetchPlansByDate = vi.fn()
const mockRemovePlannedMeal = vi.fn()
const mockDuplicateDay = vi.fn()

vi.mock('../contexts/FoodEntriesContext', async () => {
  const actual = await vi.importActual<typeof import('../contexts/FoodEntriesContext')>('../contexts/FoodEntriesContext')
  return { ...actual, useFoodEntries: () => mockUseFoodEntries() }
})

vi.mock('../contexts/MealPlansContext', () => ({
  useMealPlans: () => ({
    fetchPlansByDate: mockFetchPlansByDate,
    removePlannedMeal: mockRemovePlannedMeal,
    duplicateDay: mockDuplicateDay,
  }),
}))

function yesterday(): string {
  const date = new Date(`${todayDateString()}T00:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

function tomorrow(): string {
  const date = new Date(`${todayDateString()}T00:00:00`)
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

describe('FoodLogPage', () => {
  beforeEach(() => {
    mockRemoveEntry.mockReset().mockResolvedValue({ error: null })
    mockFetchEntriesByDate.mockReset().mockResolvedValue({ entries: [], error: null })
    mockUseFoodEntries
      .mockReset()
      .mockReturnValue({ entries: [], removeEntry: mockRemoveEntry, fetchEntriesByDate: mockFetchEntriesByDate })
    mockFetchPlansByDate.mockReset().mockResolvedValue({ plans: [], error: null })
    mockRemovePlannedMeal.mockReset().mockResolvedValue({ error: null })
    mockDuplicateDay.mockReset().mockResolvedValue({ error: null })
  })

  it('shows a message when there are no entries yet', () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/nenhum alimento registrado/i)).toBeInTheDocument()
  })

  it("shows today's food entries, the add-food button and an edit link per entry", () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [
        { id: 1, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 },
        { id: 2, mealType: 'lunch', name: 'Arroz e feijão', caloriesKcal: 400, proteinG: 15, carbG: 60, fatG: 5 },
      ],
      removeEntry: mockRemoveEntry,
      fetchEntriesByDate: mockFetchEntriesByDate,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Café com leite')).toBeInTheDocument()
    expect(screen.getByText('Arroz e feijão')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /adicionar alimento/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /editar/i })).toHaveLength(2)
  })

  it('shows a placeholder instead of "null kcal" for entries without nutrition data', () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [
        { id: 1, mealType: 'lunch', name: 'Marmita', caloriesKcal: null, proteinG: null, carbG: null, fatG: null },
      ],
      removeEntry: mockRemoveEntry,
      fetchEntriesByDate: mockFetchEntriesByDate,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/sem dados nutricionais/i)).toBeInTheDocument()
  })

  it('removes an entry when Remover is clicked', async () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [{ id: 1, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 }],
      removeEntry: mockRemoveEntry,
      fetchEntriesByDate: mockFetchEntriesByDate,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: /remover/i }))
    expect(mockRemoveEntry).toHaveBeenCalledWith(1)
  })

  it('navigates to the previous day and fetches its entries, disallowing new additions there', async () => {
    mockFetchEntriesByDate.mockResolvedValue({
      entries: [{ id: 9, mealType: 'dinner', name: 'Sopa', caloriesKcal: 200, proteinG: 10, carbG: 20, fatG: 5 }],
      error: null,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Dia anterior' }))

    expect(mockFetchEntriesByDate).toHaveBeenCalledWith(yesterday())
    expect(await screen.findByText('Sopa')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /adicionar alimento/i })).not.toBeInTheDocument()
    expect(screen.getByText(/não é possível adicionar novos alimentos em dias passados/i)).toBeInTheDocument()
  })

  it('shows an error when fetching a previous day fails', async () => {
    mockFetchEntriesByDate.mockResolvedValue({ entries: [], error: 'Falha ao carregar refeições.' })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Dia anterior' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar refeições.')
  })

  it('shows planned meals (not editable) and allows adding when viewing a future date', async () => {
    mockFetchPlansByDate.mockResolvedValue({
      plans: [
        { id: 3, plannedDate: tomorrow(), mealType: 'lunch', name: 'Frango grelhado', caloriesKcal: 300, proteinG: 30, carbG: 10, fatG: 8 },
      ],
      error: null,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: /dia seguinte/i }))

    expect(mockFetchPlansByDate).toHaveBeenCalledWith(tomorrow())
    expect(await screen.findByText('Frango grelhado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /adicionar alimento/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument()
  })

  it('removes a planned meal via removePlannedMeal when viewing a future date', async () => {
    mockFetchPlansByDate.mockResolvedValue({
      plans: [
        { id: 3, plannedDate: tomorrow(), mealType: 'lunch', name: 'Frango grelhado', caloriesKcal: 300, proteinG: 30, carbG: 10, fatG: 8 },
      ],
      error: null,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: /dia seguinte/i }))
    await screen.findByText('Frango grelhado')

    await userEvent.click(screen.getByRole('button', { name: /remover/i }))

    expect(mockRemovePlannedMeal).toHaveBeenCalledWith(3)
  })

  it('previews and confirms repeating the previous day into today', async () => {
    mockFetchEntriesByDate.mockResolvedValue({
      entries: [{ id: 9, mealType: 'dinner', name: 'Sopa', caloriesKcal: 200, proteinG: 10, carbG: 20, fatG: 5 }],
      error: null,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: /repetir dia anterior/i }))
    expect(await screen.findByText(/copiar 1 item de/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(mockDuplicateDay).toHaveBeenCalledWith(yesterday(), todayDateString())
  })
})
