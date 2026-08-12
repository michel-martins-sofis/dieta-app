import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFoodEntries, MEAL_LABELS, todayDateString, type FoodEntry } from '../contexts/FoodEntriesContext'

function shiftDate(dateStr: string, deltaDays: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function FoodLogPage() {
  const { entries, removeEntry, fetchEntriesByDate } = useFoodEntries()
  const today = todayDateString()
  const [selectedDate, setSelectedDate] = useState(today)
  const [historyEntries, setHistoryEntries] = useState<FoodEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const isToday = selectedDate === today
  const visibleEntries = isToday ? entries : historyEntries

  useEffect(() => {
    if (isToday) return
    let ignore = false
    setHistoryLoading(true)
    setHistoryError(null)
    fetchEntriesByDate(selectedDate).then(({ entries: fetched, error }) => {
      if (ignore) return
      setHistoryLoading(false)
      if (error) {
        setHistoryError(error)
        setHistoryEntries([])
        return
      }
      setHistoryEntries(fetched)
    })
    return () => {
      ignore = true
    }
  }, [selectedDate, isToday, fetchEntriesByDate])

  async function handleRemove(id: number) {
    const { error } = await removeEntry(id)
    if (error) {
      setHistoryError(error)
      return
    }
    if (!isToday) {
      setHistoryEntries((current) => current.filter((entry) => entry.id !== id))
    }
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <Link to="/dashboard" className="back-link">
          ← Painel
        </Link>
        <div className="top-bar">
          <h1>Diário alimentar</h1>
          {isToday && (
            <Link to="/add-food" className="button button-primary">
              Adicionar alimento
            </Link>
          )}
        </div>

        <div className="date-nav">
          <button
            type="button"
            className="button button-secondary"
            aria-label="Dia anterior"
            onClick={() => setSelectedDate((current) => shiftDate(current, -1))}
          >
            ‹
          </button>
          <div className="date-nav-current">
            <strong>{isToday ? 'Hoje' : formatDateLabel(selectedDate)}</strong>
            <input
              type="date"
              className="date-input"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value || today)}
            />
          </div>
          <button
            type="button"
            className="button button-secondary"
            aria-label="Dia seguinte"
            disabled={isToday}
            onClick={() => setSelectedDate((current) => shiftDate(current, 1))}
          >
            ›
          </button>
        </div>

        {!isToday && (
          <p className="footnote">Alimentos só podem ser adicionados no dia de hoje.</p>
        )}

        {historyError && (
          <p role="alert" className="alert">
            {historyError}
          </p>
        )}

        {historyLoading ? (
          <p className="footnote">Carregando...</p>
        ) : visibleEntries.length === 0 ? (
          <p className="footnote">Nenhum alimento registrado {isToday ? 'ainda hoje' : 'nesse dia'}.</p>
        ) : (
          <ul className="entry-list">
            {visibleEntries.map((entry) => (
              <li key={entry.id} className="entry-item">
                <div>
                  <strong>{entry.name}</strong>
                  <span className="entry-meta">
                    {MEAL_LABELS[entry.mealType]} · {entry.caloriesKcal} kcal
                  </span>
                </div>
                <button type="button" className="button button-secondary" onClick={() => handleRemove(entry.id)}>
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
