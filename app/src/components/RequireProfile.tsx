import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'

export function RequireProfile({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile()

  if (loading) {
    return <p>Carregando...</p>
  }

  if (!profile) {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}
