import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

const mockSignOut = vi.fn()
const mockRemoveEntry = vi.fn()
const mockUseAuth = vi.fn()
const mockUseProfile = vi.fn()
const mockUseFoodEntries = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

vi.mock('../contexts/FoodEntriesContext', () => ({
  useFoodEntries: () => mockUseFoodEntries(),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    mockSignOut.mockReset()
    mockRemoveEntry.mockReset()
    mockUseAuth.mockReset().mockReturnValue({ user: { email: 'a@b.com' }, signOut: mockSignOut })
    mockUseProfile.mockReset().mockReturnValue({
      profile: { dailyCaloriesTarget: 2500, dailyProteinG: 130, dailyCarbG: 300, dailyFatG: 70 },
    })
    mockUseFoodEntries.mockReset().mockReturnValue({ entries: [], removeEntry: mockRemoveEntry })
  })

  it('shows the daily target', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/2500 kcal/)).toBeInTheDocument()
  })

  it('does not show a target section when there is no profile', () => {
    mockUseProfile.mockReturnValue({ profile: null })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.queryByText(/consumido vs/i)).not.toBeInTheDocument()
  })

  it('reflects consumed totals from food entries in the goal cards', () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [
        { id: 1, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 },
        { id: 2, mealType: 'lunch', name: 'Arroz e feijão', caloriesKcal: 400, proteinG: 15, carbG: 60, fatG: 5 },
      ],
      removeEntry: mockRemoveEntry,
    })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/520.*2500 kcal/)).toBeInTheDocument()
  })

  it('links to the food diary page instead of listing entries inline', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /ver diário/i })).toHaveAttribute('href', '/diario')
    expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument()
  })

  it('links to the history page', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /ver histórico/i })).toHaveAttribute('href', '/historico')
  })
})
