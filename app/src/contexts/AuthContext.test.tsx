import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      signUp: (args: unknown) => mockSignUp(args),
      signInWithPassword: (args: unknown) => mockSignInWithPassword(args),
      signOut: () => mockSignOut(),
    },
  },
}))

function TestConsumer() {
  const { user, loading, signIn } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => signIn('a@b.com', 'password123')}>login</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockGetSession.mockReset().mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    mockSignInWithPassword.mockReset().mockResolvedValue({ error: null })
  })

  it('starts loading, then resolves to no user when there is no session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('calls supabase signInWithPassword with the given credentials', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('login'))
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' })
  })
})
