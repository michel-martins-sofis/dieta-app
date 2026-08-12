import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>conteudo protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows a loading message while auth state is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    renderWithRoute()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('redirects to /login when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    renderWithRoute()
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })

  it('renders children when there is a user', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'a@b.com' }, loading: false })
    renderWithRoute()
    expect(screen.getByText('conteudo protegido')).toBeInTheDocument()
  })
})
