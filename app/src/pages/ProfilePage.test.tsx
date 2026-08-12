import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from './ProfilePage'

const mockSaveProfile = vi.fn()
const mockUseProfile = vi.fn()

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

describe('ProfilePage', () => {
  beforeEach(() => {
    mockSaveProfile.mockReset()
    mockUseProfile.mockReset().mockReturnValue({ profile: null, saveProfile: mockSaveProfile })
  })

  it('calculates suggested targets from the entered profile data', async () => {
    render(<ProfilePage />)
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

  it('saves the profile with the entered and calculated values', async () => {
    mockSaveProfile.mockResolvedValue({ error: null })
    render(<ProfilePage />)
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))

    expect(mockSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ age: 30, weightKg: 80, heightCm: 180 })
    )
  })

  it('shows an error message when saving fails', async () => {
    mockSaveProfile.mockResolvedValue({ error: 'Falha ao salvar' })
    render(<ProfilePage />)
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar')
  })
})
