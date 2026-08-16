import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Copy, Pencil, Plus } from 'lucide-react'
import { useFoodEntries, MEAL_LABELS, todayDateString, type FoodEntry, type MealType } from '../contexts/FoodEntriesContext'
import { useMealPlans } from '../contexts/MealPlansContext'

type DisplayItem = {
  id: number
  mealType: MealType
  name: string
  caloriesKcal: number | null
}

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
  const { fetchPlansByDate, removePlannedMeal, duplicateDay } = useMealPlans()
  const [searchParams] = useSearchParams()
  const today = todayDateString()
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') ?? today)
  const [historyEntries, setHistoryEntries] = useState<DisplayItem[]>([])
  const [historyKind, setHistoryKind] = useState<'entries' | 'plans'>('entries')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [repeatCandidate, setRepeatCandidate] = useState<FoodEntry[] | null>(null)
  const [repeatBusy, setRepeatBusy] = useState(false)

  const isToday = selectedDate === today
  const isPast = selectedDate < today
  const isFuture = selectedDate > today
  const visibleEntries: DisplayItem[] = isToday ? entries : historyEntries

  useEffect(() => {
    if (isToday) return
    let ignore = false
    setHistoryLoading(true)
    setHistoryError(null)

    const kind = isFuture ? 'plans' : 'entries'
    setHistoryKind(kind)

    const request = isFuture ? fetchPlansByDate(selectedDate) : fetchEntriesByDate(selectedDate)
    request.then((result) => {
      if (ignore) return
      setHistoryLoading(false)
      if (result.error) {
        setHistoryError(result.error)
        setHistoryEntries([])
        return
      }
      setHistoryEntries('plans' in result ? result.plans : result.entries)
    })
    return () => {
      ignore = true
    }
  }, [selectedDate, isToday, isFuture, fetchEntriesByDate, fetchPlansByDate])

  useEffect(() => {
    setRepeatCandidate(null)
  }, [selectedDate])

  async function handleRemove(id: number) {
    if (isToday) {
      const { error } = await removeEntry(id)
      if (error) {
        setHistoryError(error)
      }
      return
    }

    const { error } = historyKind === 'plans' ? await removePlannedMeal(id) : await removeEntry(id)
    if (error) {
      setHistoryError(error)
      return
    }
    setHistoryEntries((current) => current.filter((entry) => entry.id !== id))
  }

  async function handleRepeatPreviousDay() {
    setHistoryError(null)
    const previousDate = shiftDate(selectedDate, -1)
    const { entries: previous, error } = await fetchEntriesByDate(previousDate)
    if (error) {
      setHistoryError(error)
      return
    }
    setRepeatCandidate(previous)
  }

  async function handleConfirmRepeat() {
    setRepeatBusy(true)
    setHistoryError(null)
    const previousDate = shiftDate(selectedDate, -1)
    const { error } = await duplicateDay(previousDate, selectedDate)
    setRepeatBusy(false)
    setRepeatCandidate(null)
    if (error) {
      setHistoryError(error)
      return
    }
    if (isFuture) {
      const { plans, error: refreshError } = await fetchPlansByDate(selectedDate)
      if (refreshError) {
        setHistoryError(refreshError)
        return
      }
      setHistoryEntries(plans)
    }
  }

  return (
    <div className="page-container">
      <div className="top-bar">
        <h1>Diário alimentar</h1>
        {!isPast && (
          <Link to={`/add-food?date=${selectedDate}`} className="button button-primary">
            <Plus size={16} /> Adicionar alimento
          </Link>
        )}
      </div>

      <div className="section-card">
        <div className="date-nav">
          <button
            type="button"
            className="button button-secondary"
            aria-label="Dia anterior"
            onClick={() => setSelectedDate((current) => shiftDate(current, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="date-nav-current">
            <strong>{isToday ? 'Hoje' : formatDateLabel(selectedDate)}</strong>
            <input
              type="date"
              className="date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || today)}
            />
          </div>
          <button
            type="button"
            className="button button-secondary"
            aria-label="Dia seguinte"
            onClick={() => setSelectedDate((current) => shiftDate(current, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {isPast && <p className="footnote">Não é possível adicionar novos alimentos em dias passados.</p>}
        {isFuture && <p className="footnote">Planejamento para um dia futuro — nada será contado como consumido até você confirmar.</p>}

        {!isPast &&
          (repeatCandidate === null ? (
            <button type="button" className="button button-secondary" onClick={handleRepeatPreviousDay}>
              <Copy size={16} /> Repetir dia anterior
            </button>
          ) : (
            <div className="inline-form">
              {repeatCandidate.length === 0 ? (
                <p className="footnote">Nenhum item no dia anterior para copiar.</p>
              ) : (
                <>
                  <p>
                    Copiar {repeatCandidate.length}{' '}
                    {repeatCandidate.length === 1 ? 'item' : 'itens'} de {formatDateLabel(shiftDate(selectedDate, -1))}?
                  </p>
                  <div className="top-bar-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setRepeatCandidate(null)}
                      disabled={repeatBusy}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={handleConfirmRepeat}
                      disabled={repeatBusy}
                    >
                      {repeatBusy ? 'Copiando...' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

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
                    {MEAL_LABELS[entry.mealType]} ·{' '}
                    {entry.caloriesKcal === null ? 'sem dados nutricionais' : `${entry.caloriesKcal} kcal`}
                  </span>
                </div>
                <div className="top-bar-actions">
                  {!isFuture && (
                    <Link
                      to={`/add-food?edit=${entry.id}&date=${selectedDate}`}
                      state={{ entry }}
                      className="button button-secondary"
                      aria-label="Editar"
                    >
                      <Pencil size={16} />
                    </Link>
                  )}
                  <button type="button" className="button button-secondary" onClick={() => handleRemove(entry.id)}>
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
