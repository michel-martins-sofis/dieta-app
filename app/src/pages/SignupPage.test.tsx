import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignupPage } from './SignupPage'

const mockSignUp = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('SignupPage', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
    mockNavigate.mockReset()
  })

  it('submits email and password and navigates to /dashboard on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error message when signup fails', async () => {
    mockSignUp.mockResolvedValue({ error: 'Email already registered' })
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
