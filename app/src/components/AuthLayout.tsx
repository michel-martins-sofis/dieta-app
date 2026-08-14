import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-theme-toggle">
        <ThemeToggle variant="floating" />
      </div>

      <div className="auth-brand">
        <div className="brand-wordmark">
          <span className="brand-mark" aria-hidden="true" />
          DietaFlow
        </div>
        <p className="auth-brand-tagline">Sua nutrição, organizada e no controle.</p>
        <p className="auth-brand-subtext">
          Registre refeições, acompanhe metas de calorias e macros, e veja sua evolução ao longo do tempo.
        </p>
      </div>

      <div className="auth-form-side">{children}</div>
    </div>
  )
}
