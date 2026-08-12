import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'

export function RequireProfile({ children }: { children: ReactNode }) {
  const { profile, loading, error } = useProfile()

  if (loading) {
    return <p>Carregando...</p>
  }

  if (error) {
    return <p role="alert">Não foi possível carregar seu perfil. Tente recarregar a página.</p>
  }

  if (!profile) {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}
