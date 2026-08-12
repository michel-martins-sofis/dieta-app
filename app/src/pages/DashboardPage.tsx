import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { useFoodEntries } from '../contexts/FoodEntriesContext'

export function DashboardPage() {
  const { signOut } = useAuth()
  const { profile } = useProfile()
  const { entries } = useFoodEntries()

  const totals = entries.reduce(
    (acc, entry) => ({
      caloriesKcal: acc.caloriesKcal + entry.caloriesKcal,
      proteinG: acc.proteinG + entry.proteinG,
      carbG: acc.carbG + entry.carbG,
      fatG: acc.fatG + entry.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbG: 0, fatG: 0 }
  )

  function progressPercent(consumed: number, target: number): number {
    if (!target) return 0
    return Math.min(100, Math.round((consumed / target) * 100))
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <div className="top-bar">
          <h1>Painel</h1>
          <div className="top-bar-actions">
            <Link to="/profile" style={{ textDecoration: 'none' }} className="button button-secondary">
              Editar perfil
            </Link>
            <button className="button button-secondary" onClick={() => signOut()}>
              Sair
            </button>
          </div>
        </div>

        {profile && (
          <div>
            <div className="goal-grid">
              <div className="goal-stat">
                <strong>
                  {totals.caloriesKcal} / {profile.dailyCaloriesTarget} kcal
                </strong>
                <span>Calorias</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent(totals.caloriesKcal, profile.dailyCaloriesTarget)}%` }}
                  />
                </div>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.proteinG} / {profile.dailyProteinG} g
                </strong>
                <span>Proteína</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent(totals.proteinG, profile.dailyProteinG)}%` }}
                  />
                </div>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.carbG} / {profile.dailyCarbG} g
                </strong>
                <span>Carboidrato</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent(totals.carbG, profile.dailyCarbG)}%` }}
                  />
                </div>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.fatG} / {profile.dailyFatG} g
                </strong>
                <span>Gordura</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent(totals.fatG, profile.dailyFatG)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="top-bar">
          <h2>Diário alimentar</h2>
          <Link to="/diario" style={{ textDecoration: 'none' }} className="button button-primary">
            Ver diário
          </Link>
        </div>

        <div className="top-bar">
          <h2>Histórico</h2>
          <Link to="/historico" style={{ textDecoration: 'none' }} className="button button-secondary">
            Ver histórico
          </Link>
        </div>
      </div>
    </div>
  )
}
