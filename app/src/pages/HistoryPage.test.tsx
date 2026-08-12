import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HistoryPage } from './HistoryPage'

const mockUseProfile = vi.fn()
const mockSaveProfile = vi.fn()
const mockLogWeight = vi.fn()
const mockFetchRecentLogs = vi.fn()
const mockFetchDailyCalorieTotals = vi.fn()

const PROFILE = {
  age: 30,
  weightKg: 80,
  heightCm: 180,
  sex: 'male',
  activityLevel: 'sedentary',
  goal: 'maintain',
  dailyCaloriesTarget: 2000,
  dailyProteinG: 120,
  dailyCarbG: 200,
  dailyFatG: 60,
}

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

vi.mock('../contexts/WeightLogsContext', () => ({
  useWeightLogs: () => ({ logWeight: mockLogWeight, fetchRecentLogs: mockFetchRecentLogs }),
}))

vi.mock('../contexts/FoodEntriesContext', async () => {
  const actual = await vi.importActual<typeof import('../contexts/FoodEntriesContext')>('../contexts/FoodEntriesContext')
  return { ...actual, useFoodEntries: () => ({ fetchDailyCalorieTotals: mockFetchDailyCalorieTotals }) }
})

describe('HistoryPage', () => {
  beforeEach(() => {
    mockUseProfile.mockReset().mockReturnValue({ profile: PROFILE, saveProfile: mockSaveProfile })
    mockSaveProfile.mockReset().mockResolvedValue({ error: null })
    mockLogWeight.mockReset().mockResolvedValue({ error: null })
    mockFetchRecentLogs.mockReset().mockResolvedValue({
      logs: [
        { id: 1, loggedDate: '2026-08-01', weightKg: 82 },
        { id: 2, loggedDate: '2026-08-10', weightKg: 80 },
      ],
      error: null,
    })
    mockFetchDailyCalorieTotals.mockReset().mockResolvedValue({
      totals: [
        { date: '2026-08-09', caloriesKcal: 1900 },
        { date: '2026-08-10', caloriesKcal: 2100 },
      ],
      error: null,
    })
  })

  it('loads weight logs and calorie totals and renders both charts', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    expect(await screen.findByRole('img', { name: /evolução do peso/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /calorias consumidas por dia/i })).toBeInTheDocument()
    expect(mockFetchRecentLogs).toHaveBeenCalledWith(30)
    expect(mockFetchDailyCalorieTotals).toHaveBeenCalledWith(14)
  })

  it('logs today\'s weight, syncs the profile weight, and refreshes the chart', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    await screen.findByRole('img', { name: /evolução do peso/i })

    await userEvent.type(screen.getByLabelText('Peso de hoje (kg)'), '79')
    await userEvent.click(screen.getByRole('button', { name: /registrar peso/i }))

    expect(mockLogWeight).toHaveBeenCalledWith(79, expect.any(String))
    expect(mockSaveProfile).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 79, age: 30, heightCm: 180 }))
    expect(await screen.findByRole('status')).toHaveTextContent('Peso registrado.')
    expect(screen.getByLabelText('Peso de hoje (kg)')).toHaveValue(null)
  })

  it('shows an error and does not call logWeight for an invalid weight', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    await screen.findByRole('img', { name: /evolução do peso/i })

    // Bypasses native required/min validation (already guarded by the input's own
    // attributes) to exercise the component's own defensive check directly.
    const form = screen.getByRole('button', { name: /registrar peso/i }).closest('form')
    fireEvent.submit(form!)

    expect(await screen.findByRole('alert')).toHaveTextContent(/informe um peso válido/i)
    expect(mockLogWeight).not.toHaveBeenCalled()
  })

  it('shows an error when loading the history fails', async () => {
    mockFetchRecentLogs.mockResolvedValue({ logs: [], error: 'Falha ao carregar peso.' })
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar peso.')
  })
})
