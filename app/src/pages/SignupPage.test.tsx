import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignupPage } from './SignupPage'

const mockSignUp = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}))

describe('SignupPage', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
  })

  it('submits email and password and shows no error or notice when a session is returned', async () => {
    mockSignUp.mockResolvedValue({ error: null, session: { user: { email: 'test@example.com' } } })
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a confirmation notice when signup succeeds without a session', async () => {
    mockSignUp.mockResolvedValue({ error: null, session: null })
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/verifique seu e-mail/i)
  })

  it('shows an error message when signup fails', async () => {
    mockSignUp.mockResolvedValue({ error: 'Email already registered', session: null })
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered')
  })
})
