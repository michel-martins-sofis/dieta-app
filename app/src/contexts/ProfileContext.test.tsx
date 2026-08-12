import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileProvider, useProfile } from './ProfileContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()
const mockSingle = vi.fn()

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildChain() {
  const chain = {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return chain
    },
    eq: (...args: unknown[]) => {
      mockEq(...args)
      return chain
    },
    upsert: (...args: unknown[]) => {
      mockUpsert(...args)
      return chain
    },
    maybeSingle: () => mockMaybeSingle(),
    single: () => mockSingle(),
  }
  return chain
}

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

function TestConsumer() {
  const { profile, loading, saveProfile } = useProfile()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="calories">{profile ? profile.dailyCaloriesTarget : 'none'}</span>
      <button
        onClick={() =>
          saveProfile({
            age: 31,
            weightKg: 81,
            heightCm: 180,
            sex: 'male',
            activityLevel: 'moderate',
            goal: 'maintain',
            dailyCaloriesTarget: 2600,
            dailyProteinG: 130,
            dailyCarbG: 310,
            dailyFatG: 72,
          })
        }
      >
        salvar
      </button>
    </div>
  )
}

describe('ProfileContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' }, loading: false })
    mockMaybeSingle.mockReset().mockResolvedValue({ data: PROFILE_ROW, error: null })
    mockSingle.mockReset().mockResolvedValue({ data: { ...PROFILE_ROW, daily_calories_target: 2600 }, error: null })
  })

  it('loads the existing profile for the current user', async () => {
    render(
      <ProfileProvider>
        <TestConsumer />
      </ProfileProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('calories').textContent).toBe('2500')
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('has no profile and stops loading when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    render(
      <ProfileProvider>
        <TestConsumer />
      </ProfileProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('calories').textContent).toBe('none')
  })

  it('stays loading while auth is still resolving, and does not fetch prematurely', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    render(
      <ProfileProvider>
        <TestConsumer />
      </ProfileProvider>
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('saves the profile via upsert and updates state', async () => {
    render(
      <ProfileProvider>
        <TestConsumer />
      </ProfileProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('salvar'))
    await waitFor(() => expect(screen.getByTestId('calories').textContent).toBe('2600'))
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', daily_calories_target: 2600 })
    )
  })

  it('surfaces a fetch error instead of silently treating it as "no profile"', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'db unavailable' } })

    function ErrorConsumer() {
      const { loading, error } = useProfile()
      return (
        <div>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="error">{error ?? 'none'}</span>
        </div>
      )
    }

    render(
      <ProfileProvider>
        <ErrorConsumer />
      </ProfileProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('error').textContent).toBe('db unavailable')
  })
})
