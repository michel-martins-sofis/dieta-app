import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireProfile } from './RequireProfile'

const mockUseProfile = vi.fn()

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/profile" element={<p>completar perfil</p>} />
        <Route
          path="/dashboard"
          element={
            <RequireProfile>
              <p>painel</p>
            </RequireProfile>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireProfile', () => {
  beforeEach(() => {
    mockUseProfile.mockReset()
  })

  it('shows a loading message while the profile is resolving', () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: true })
    renderWithRoute()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('redirects to /profile when there is no profile yet', () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: false })
    renderWithRoute()
    expect(screen.getByText('completar perfil')).toBeInTheDocument()
  })

  it('renders children when a profile exists', () => {
    mockUseProfile.mockReturnValue({ profile: { dailyCaloriesTarget: 2000 }, loading: false })
    renderWithRoute()
    expect(screen.getByText('painel')).toBeInTheDocument()
  })

  it('shows an error message when the profile failed to load', () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: false, error: 'falha ao carregar' })
    renderWithRoute()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
