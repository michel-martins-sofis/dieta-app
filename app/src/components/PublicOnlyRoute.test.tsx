import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PublicOnlyRoute } from './PublicOnlyRoute'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/dashboard" element={<p>painel</p>} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <p>tela de login</p>
            </PublicOnlyRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('PublicOnlyRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows a loading message while auth state is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    renderWithRoute()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('redirects to /dashboard when there is a user', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'a@b.com' }, loading: false })
    renderWithRoute()
    expect(screen.getByText('painel')).toBeInTheDocument()
  })

  it('renders children when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    renderWithRoute()
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })
})
