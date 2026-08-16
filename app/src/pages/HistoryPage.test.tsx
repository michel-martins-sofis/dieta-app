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
const mockFetchDailyMacroTotals = vi.fn()
const mockAddWater = vi.fn()
const mockFetchDailyWaterTotals = vi.fn()

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
  return {
    ...actual,
    useFoodEntries: () => ({
      fetchDailyCalorieTotals: mockFetchDailyCalorieTotals,
      fetchDailyMacroTotals: mockFetchDailyMacroTotals,
    }),
  }
})

vi.mock('../contexts/WaterLogsContext', () => ({
  useWaterLogs: () => ({ addWater: mockAddWater, fetchDailyWaterTotals: mockFetchDailyWaterTotals }),
}))

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
    mockFetchDailyMacroTotals.mockReset().mockResolvedValue({
      totals: [
        { date: '2026-08-09', proteinG: 118, carbG: 195, fatG: 58 },
        { date: '2026-08-10', proteinG: 122, carbG: 205, fatG: 62 },
      ],
      error: null,
    })
    mockAddWater.mockReset().mockResolvedValue({ error: null })
    mockFetchDailyWaterTotals.mockReset().mockResolvedValue({
      totals: [{ date: '2026-08-10', amountMl: 500 }],
      error: null,
    })
  })

  it('loads weight logs, calorie and macro totals, and renders the charts', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    expect(await screen.findByRole('img', { name: /evolução do peso/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /calorias consumidas por dia/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /proteína, carboidrato e gordura/i })).toBeInTheDocument()
    expect(mockFetchRecentLogs).toHaveBeenCalledWith(30)
    expect(mockFetchDailyCalorieTotals).toHaveBeenCalledWith(14)
    expect(mockFetchDailyMacroTotals).toHaveBeenCalledWith(14)
  })

  it('shows adherence tiles based on the fetched totals and profile targets', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    await screen.findByRole('img', { name: /evolução do peso/i })
    expect(screen.getByText('Dias dentro da meta de calorias')).toBeInTheDocument()
    expect(screen.getByText('Dias dentro da meta de proteína')).toBeInTheDocument()
  })

  it("shows today's water total and logs a quick amount", async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    expect(await screen.findByText('500 ml')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '+250ml' }))
    expect(mockAddWater).toHaveBeenCalledWith(250, expect.any(String))
  })

  it('links to the export page', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    await screen.findByRole('img', { name: /evolução do peso/i })
    expect(screen.getByRole('link', { name: /exportar relatório/i })).toHaveAttribute('href', '/exportar')
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

    expect(mockLogWeight).toHaveBeenCalledWith(79, expect.any(String), null)
    expect(mockSaveProfile).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 79, age: 30, heightCm: 180 }))
    expect(await screen.findByRole('status')).toHaveTextContent('Peso registrado.')
    expect(screen.getByLabelText('Peso de hoje (kg)')).toHaveValue(null)
  })

  it('passes the selected moment along when logging weight', async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    )
    await screen.findByRole('img', { name: /evolução do peso/i })

    await userEvent.type(screen.getByLabelText('Peso de hoje (kg)'), '79')
    await userEvent.selectOptions(screen.getByLabelText('Momento (opcional)'), 'post_workout')
    await userEvent.click(screen.getByRole('button', { name: /registrar peso/i }))

    expect(mockLogWeight).toHaveBeenCalledWith(79, expect.any(String), 'post_workout')
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
