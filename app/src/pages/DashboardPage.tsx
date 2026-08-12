import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { useFoodEntries, type MealType } from '../contexts/FoodEntriesContext'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const { entries, removeEntry } = useFoodEntries()

  const totals = entries.reduce(
    (acc, entry) => ({
      caloriesKcal: acc.caloriesKcal + entry.caloriesKcal,
      proteinG: acc.proteinG + entry.proteinG,
      carbG: acc.carbG + entry.carbG,
      fatG: acc.fatG + entry.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbG: 0, fatG: 0 }
  )

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
            <h2>Hoje: consumido vs. meta</h2>
            <div className="goal-grid">
              <div className="goal-stat">
                <strong>
                  {totals.caloriesKcal} / {profile.dailyCaloriesTarget} kcal
                </strong>
                <span>Calorias</span>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.proteinG} / {profile.dailyProteinG} g
                </strong>
                <span>Proteína</span>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.carbG} / {profile.dailyCarbG} g
                </strong>
                <span>Carboidrato</span>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.fatG} / {profile.dailyFatG} g
                </strong>
                <span>Gordura</span>
              </div>
            </div>
          </div>
        )}

        <div className="top-bar">
          <h2>Refeições de hoje</h2>
          <Link to="/add-food" className="button button-primary">
            Adicionar alimento
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="footnote">Nenhum alimento registrado ainda hoje.</p>
        ) : (
          <ul className="entry-list">
            {entries.map((entry) => (
              <li key={entry.id} className="entry-item">
                <div>
                  <strong>{entry.name}</strong>
                  <span className="entry-meta">
                    {MEAL_LABELS[entry.mealType]} · {entry.caloriesKcal} kcal
                  </span>
                </div>
                <button type="button" className="button button-secondary" onClick={() => removeEntry(entry.id)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="footnote">
          <Link to="/profile">Editar perfil</Link>
        </p>
      </div>
    </div>
  )
}
