import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, LineChart, Dumbbell, User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/diario', label: 'Diário', icon: UtensilsCrossed },
  { to: '/historico', label: 'Histórico', icon: LineChart },
  { to: '/treinos', label: 'Treinos', icon: Dumbbell },
  { to: '/profile', label: 'Perfil', icon: User },
]

function Brand() {
  return (
    <div className="brand-wordmark app-sidebar-brand">
      <span className="brand-mark" aria-hidden="true" />
      DietaFlow
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Brand />
        <nav className="app-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `app-nav-link${isActive ? ' app-nav-link-active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-footer">
          <ThemeToggle variant="inline" />
          <button type="button" className="app-nav-link" onClick={() => signOut()}>
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <Brand />
          <ThemeToggle variant="floating" />
        </header>

        <main className="app-content">{children}</main>

        <nav className="app-bottom-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `app-bottom-nav-link${isActive ? ' app-bottom-nav-link-active' : ''}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
