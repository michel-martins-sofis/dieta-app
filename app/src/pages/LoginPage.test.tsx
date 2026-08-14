import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const mockSignIn = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}))

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset()
  })

  it('submits email and password and shows no error on success', async () => {
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
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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
  })
})
