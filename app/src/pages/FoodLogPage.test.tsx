import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FoodLogPage } from './FoodLogPage'
import { todayDateString } from '../contexts/FoodEntriesContext'

const mockRemoveEntry = vi.fn()
const mockFetchEntriesByDate = vi.fn()
const mockUseFoodEntries = vi.fn()

vi.mock('../contexts/FoodEntriesContext', async () => {
  const actual = await vi.importActual<typeof import('../contexts/FoodEntriesContext')>('../contexts/FoodEntriesContext')
  return { ...actual, useFoodEntries: () => mockUseFoodEntries() }
})

function yesterday(): string {
  const date = new Date(`${todayDateString()}T00:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

describe('FoodLogPage', () => {
  beforeEach(() => {
    mockRemoveEntry.mockReset().mockResolvedValue({ error: null })
    mockFetchEntriesByDate.mockReset().mockResolvedValue({ entries: [], error: null })
    mockUseFoodEntries
      .mockReset()
      .mockReturnValue({ entries: [], removeEntry: mockRemoveEntry, fetchEntriesByDate: mockFetchEntriesByDate })
  })

  it('shows a message when there are no entries yet', () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/nenhum alimento registrado/i)).toBeInTheDocument()
  })

  it("shows today's food entries and the add-food button", () => {
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
    expect(screen.getByRole('button', { name: /dia seguinte/i })).toBeDisabled()
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

  it('navigates to the previous day and fetches its entries instead of showing the add-food button', async () => {
    mockFetchEntriesByDate.mockResolvedValue({
      entries: [{ id: 9, mealType: 'dinner', name: 'Sopa', caloriesKcal: 200, proteinG: 10, carbG: 20, fatG: 5 }],
      error: null,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: /dia anterior/i }))

    expect(mockFetchEntriesByDate).toHaveBeenCalledWith(yesterday())
    expect(await screen.findByText('Sopa')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /adicionar alimento/i })).not.toBeInTheDocument()
    expect(screen.getByText(/só podem ser adicionados no dia de hoje/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dia seguinte/i })).not.toBeDisabled()
  })

  it('shows an error when fetching a previous day fails', async () => {
    mockFetchEntriesByDate.mockResolvedValue({ entries: [], error: 'Falha ao carregar refeições.' })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: /dia anterior/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar refeições.')
  })
})
