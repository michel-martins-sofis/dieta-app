import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'

const mockSaveProfile = vi.fn()
const mockUseProfile = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('ProfilePage', () => {
  beforeEach(() => {
    mockSaveProfile.mockReset()
    mockNavigate.mockReset()
    mockUseProfile.mockReset().mockReturnValue({ profile: null, loading: false, saveProfile: mockSaveProfile })
  })

  it('shows a loading message while the profile is still resolving', () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: true, saveProfile: mockSaveProfile })
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Idade')).not.toBeInTheDocument()
  })

  it('calculates suggested targets from the entered profile data', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.selectOptions(screen.getByLabelText('Sexo biológico'), 'male')
    await userEvent.selectOptions(screen.getByLabelText('Nível de atividade física'), 'sedentary')
    await userEvent.selectOptions(screen.getByLabelText('Objetivo'), 'maintain')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))

    const bmr = 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    const expectedCalories = Math.round(bmr * 1.2)
    expect(screen.getByLabelText('Calorias (kcal/dia)')).toHaveValue(expectedCalories)
    expect(screen.getByLabelText('Proteína (g/dia)')).toHaveValue(Math.round(1.6 * 80))
  })

  it('creates a new profile and navigates to /dashboard', async () => {
    mockSaveProfile.mockResolvedValue({ error: null })
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))

    expect(mockSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ age: 30, weightKg: 80, heightCm: 180 })
    )
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('pre-fills the form and shows an update notice instead of navigating when editing an existing profile', async () => {
    mockUseProfile.mockReturnValue({
      profile: {
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
      },
      loading: false,
      saveProfile: mockSaveProfile,
    })
    mockSaveProfile.mockResolvedValue({ error: null })
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )

    expect(screen.getByLabelText('Idade')).toHaveValue(30)
    expect(screen.getByLabelText('Calorias (kcal/dia)')).toHaveValue(2000)

    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Perfil atualizado.')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows an error message when saving fails', async () => {
    mockSaveProfile.mockResolvedValue({ error: 'Falha ao salvar' })
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
