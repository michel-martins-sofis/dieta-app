import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()
const mockUseProfile = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    mockSignOut.mockReset()
    mockUseAuth.mockReset().mockReturnValue({ user: { email: 'a@b.com' }, signOut: mockSignOut })
  })

  it('shows the daily target when a profile exists', () => {
    mockUseProfile.mockReturnValue({
      profile: { dailyCaloriesTarget: 2500, dailyProteinG: 130, dailyCarbG: 300, dailyFatG: 70 },
    })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/2500 kcal/)).toBeInTheDocument()
    expect(screen.getByText(/130 g/)).toBeInTheDocument()
  })

  it('does not show a target section when there is no profile', () => {
    mockUseProfile.mockReturnValue({ profile: null })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.queryByText(/Sua meta diária/)).not.toBeInTheDocument()
  })
})
