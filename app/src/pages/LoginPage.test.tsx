import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const mockSignIn = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    mockNavigate.mockReset()
  })

  it('submits email and password and navigates to /dashboard on success', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error message when login fails', async () => {
    mockSignIn.mockResolvedValue({ error: 'Invalid login credentials' })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
