import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${variant === 'floating' ? 'theme-toggle-floating' : 'theme-toggle-inline'}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {variant === 'inline' && <span>{isDark ? 'Tema claro' : 'Tema escuro'}</span>}
    </button>
  )
}
