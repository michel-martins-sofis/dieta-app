import { Link } from 'react-router-dom'
import { useFoodEntries, MEAL_LABELS } from '../contexts/FoodEntriesContext'

export function FoodLogPage() {
  const { entries, removeEntry } = useFoodEntries()

  return (
    <div className="page">
      <div className="card card--wide">
        <Link to="/dashboard" className="back-link">
          ← Painel
        </Link>
        <div className="top-bar">
          <h1>Diário alimentar</h1>
          <Link to="/add-food" style={{ textDecoration: 'none' }} className="button button-primary">
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
      </div>
    </div>
  )
}
