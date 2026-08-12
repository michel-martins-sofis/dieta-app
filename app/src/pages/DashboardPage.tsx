import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()

  return (
    <div className="page">
      <div className="card card--wide">
        <div className="top-bar">
          <h1>Painel</h1>
          <button className="button button-secondary" onClick={() => signOut()}>
            Sair
          </button>
        </div>
        <p>Logado como: {user?.email}</p>
        {profile && (
          <div>
            <h2>Sua meta diária</h2>
            <div className="goal-grid">
              <div className="goal-stat">
                <strong>{profile.dailyCaloriesTarget} kcal</strong>
                <span>Calorias</span>
              </div>
              <div className="goal-stat">
                <strong>{profile.dailyProteinG} g</strong>
                <span>Proteína</span>
              </div>
              <div className="goal-stat">
                <strong>{profile.dailyCarbG} g</strong>
                <span>Carboidrato</span>
              </div>
              <div className="goal-stat">
                <strong>{profile.dailyFatG} g</strong>
                <span>Gordura</span>
              </div>
            </div>
          </div>
        )}
        <p className="footnote">
          <Link to="/profile">Editar perfil</Link>
        </p>
      </div>
    </div>
  )
}
