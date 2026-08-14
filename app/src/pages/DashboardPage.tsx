import { Flame, Beef, Wheat, Droplet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { useFoodEntries } from '../contexts/FoodEntriesContext'

export function DashboardPage() {
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
    <div className="page-container">
      <div className="top-bar">
        <h1>Painel</h1>
      </div>

      {profile && (
        <div className="goal-grid">
          <div className="goal-stat goal-stat--calories">
            <span className="goal-stat-icon">
              <Flame size={18} />
            </span>
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
          <div className="goal-stat goal-stat--protein">
            <span className="goal-stat-icon">
              <Beef size={18} />
            </span>
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
          <div className="goal-stat goal-stat--carb">
            <span className="goal-stat-icon">
              <Wheat size={18} />
            </span>
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
          <div className="goal-stat goal-stat--fat">
            <span className="goal-stat-icon">
              <Droplet size={18} />
            </span>
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
      )}

      <div className="section-card">
        <div className="top-bar">
          <h2>Diário alimentar</h2>
          <Link to="/diario" className="button button-primary">
            Ver diário
          </Link>
        </div>
      </div>

      <div className="section-card">
        <div className="top-bar">
          <h2>Histórico</h2>
          <Link to="/historico" className="button button-secondary">
            Ver histórico
          </Link>
        </div>
      </div>
    </div>
  )
}
