import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './ThemeToggle'

const mockToggleTheme = vi.fn()
const mockUseTheme = vi.fn()

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockToggleTheme.mockReset()
    mockUseTheme.mockReset().mockReturnValue({ theme: 'light', toggleTheme: mockToggleTheme })
  })

  it('shows a control to switch to dark mode while on light theme', async () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /mudar para tema escuro/i })
    await userEvent.click(button)
    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('shows a control to switch to light mode while on dark theme', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', toggleTheme: mockToggleTheme })
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /mudar para tema claro/i })).toBeInTheDocument()
  })
})
