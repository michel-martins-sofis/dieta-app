import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()

  return (
    <div>
      <h1>Painel</h1>
      <p>Logado como: {user?.email}</p>
      {profile && (
        <div>
          <h2>Sua meta diária</h2>
          <p>Calorias: {profile.dailyCaloriesTarget} kcal</p>
          <p>Proteína: {profile.dailyProteinG} g</p>
          <p>Carboidrato: {profile.dailyCarbG} g</p>
          <p>Gordura: {profile.dailyFatG} g</p>
        </div>
      )}
      <p>
        <Link to="/profile">Editar perfil</Link>
      </p>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  )
}
