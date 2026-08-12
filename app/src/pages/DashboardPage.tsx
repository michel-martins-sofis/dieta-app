import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { user, signOut } = useAuth()

  return (
    <div>
      <h1>Painel</h1>
      <p>Logado como: {user?.email}</p>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  )
}
