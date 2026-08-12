import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FoodLogPage } from './FoodLogPage'

const mockRemoveEntry = vi.fn()
const mockUseFoodEntries = vi.fn()

vi.mock('../contexts/FoodEntriesContext', async () => {
  const actual = await vi.importActual<typeof import('../contexts/FoodEntriesContext')>('../contexts/FoodEntriesContext')
  return { ...actual, useFoodEntries: () => mockUseFoodEntries() }
})

describe('FoodLogPage', () => {
  beforeEach(() => {
    mockRemoveEntry.mockReset()
    mockUseFoodEntries.mockReset().mockReturnValue({ entries: [], removeEntry: mockRemoveEntry })
  })

  it('shows a message when there are no entries yet', () => {
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/nenhum alimento registrado/i)).toBeInTheDocument()
  })

  it("shows today's food entries", () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [
        { id: 1, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 },
        { id: 2, mealType: 'lunch', name: 'Arroz e feijão', caloriesKcal: 400, proteinG: 15, carbG: 60, fatG: 5 },
      ],
      removeEntry: mockRemoveEntry,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Café com leite')).toBeInTheDocument()
    expect(screen.getByText('Arroz e feijão')).toBeInTheDocument()
  })

  it('removes an entry when Remover is clicked', async () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [{ id: 1, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 }],
      removeEntry: mockRemoveEntry,
    })
    render(
      <MemoryRouter>
        <FoodLogPage />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: /remover/i }))
    expect(mockRemoveEntry).toHaveBeenCalledWith(1)
  })
})
