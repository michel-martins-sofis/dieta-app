import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProfileProvider } from './ProfileContext'
import { RequireProfile } from '../components/RequireProfile'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockFrom = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const SESSION = { user: { id: 'user-1', email: 'a@b.com' } }

const PROFILE_ROW = {
  id: 'user-1',
  age: 30,
  weight_kg: 80,
  height_cm: 180,
  sex: 'male',
  activity_level: 'moderate',
  goal: 'maintain',
  daily_calories_target: 2500,
  daily_protein_g: 130,
  daily_carb_g: 300,
  daily_fat_g: 70,
}

function buildChain() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => mockMaybeSingle(),
  }
  return chain
}

function renderApp() {
  return render(
    <AuthProvider>
      <ProfileProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/profile" element={<p>Seu perfil</p>} />
            <Route
              path="/dashboard"
              element={
                <RequireProfile>
                  <p>Painel</p>
                </RequireProfile>
              }
            />
          </Routes>
        </MemoryRouter>
      </ProfileProvider>
    </AuthProvider>
  )
}

describe('AuthProvider + ProfileProvider + RequireProfile composition', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockOnAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockMaybeSingle.mockReset()
  })

  it('waits for auth to resolve before deciding whether to redirect to /profile, and lands on the dashboard when a profile exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION } })
    mockMaybeSingle.mockResolvedValue({ data: PROFILE_ROW, error: null })

    renderApp()

    await waitFor(() => expect(screen.getByText('Painel')).toBeInTheDocument())
    expect(screen.queryByText('Seu perfil')).not.toBeInTheDocument()
  })

  it('redirects to /profile only after both auth and profile have resolved and there truly is no profile', async () => {
    mockGetSession.mockResolvedValue({ data: { session: SESSION } })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    renderApp()

    await waitFor(() => expect(screen.getByText('Seu perfil')).toBeInTheDocument())
  })
})
