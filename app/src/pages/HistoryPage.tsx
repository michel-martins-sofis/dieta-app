import { useEffect, useState, type FormEvent } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { useWeightLogs, type WeightLog } from '../contexts/WeightLogsContext'
import { useFoodEntries, todayDateString, type DailyCalorieTotal } from '../contexts/FoodEntriesContext'
import { WeightChart } from '../components/WeightChart'
import { CaloriesChart } from '../components/CaloriesChart'

const WEIGHT_RANGE_DAYS = 30
const CALORIES_RANGE_DAYS = 14

export function HistoryPage() {
  const { profile, saveProfile } = useProfile()
  const { logWeight, fetchRecentLogs } = useWeightLogs()
  const { fetchDailyCalorieTotals } = useFoodEntries()

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [calorieTotals, setCalorieTotals] = useState<DailyCalorieTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [weightInput, setWeightInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      setLoading(true)
      const [weightResult, caloriesResult] = await Promise.all([
        fetchRecentLogs(WEIGHT_RANGE_DAYS),
        fetchDailyCalorieTotals(CALORIES_RANGE_DAYS),
      ])
      if (ignore) return
      if (weightResult.error) {
        setError(weightResult.error)
      } else if (caloriesResult.error) {
        setError(caloriesResult.error)
      } else {
        setError(null)
      }
      setWeightLogs(weightResult.logs)
      setCalorieTotals(caloriesResult.totals)
      setLoading(false)
    }

    load()

    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogWeight(event: FormEvent) {
    event.preventDefault()
    const parsedWeight = Number(weightInput)
    if (!parsedWeight || parsedWeight <= 0) {
      setError('Informe um peso válido.')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)

    const today = todayDateString()
    const { error: logError } = await logWeight(parsedWeight, today)
    if (logError) {
      setSubmitting(false)
      setError(logError)
      return
    }

    if (profile) {
      await saveProfile({
        age: profile.age,
        weightKg: parsedWeight,
        heightCm: profile.heightCm,
        sex: profile.sex,
        activityLevel: profile.activityLevel,
        goal: profile.goal,
        dailyCaloriesTarget: profile.dailyCaloriesTarget,
        dailyProteinG: profile.dailyProteinG,
        dailyCarbG: profile.dailyCarbG,
        dailyFatG: profile.dailyFatG,
      })
    }

    const { logs, error: refetchError } = await fetchRecentLogs(WEIGHT_RANGE_DAYS)
    setSubmitting(false)
    if (refetchError) {
      setError(refetchError)
      return
    }
    setWeightLogs(logs)
    setWeightInput('')
    setNotice('Peso registrado.')
  }

  return (
    <div className="page-container">
      <div className="top-bar">
        <h1>Histórico</h1>
      </div>

      <div className="section-card">
        <form onSubmit={handleLogWeight} className="inline-form">
          <div className="form-field">
            <label htmlFor="history-weight">Peso de hoje (kg)</label>
            <input
              id="history-weight"
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              min={1}
              step="0.1"
              required
            />
          </div>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar peso'}
          </button>
        </form>

        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
      </div>

      <div className="section-card">
        <h2>Evolução do peso</h2>
        {loading ? <p className="footnote">Carregando...</p> : <WeightChart logs={weightLogs} />}
      </div>

      <div className="section-card">
        <h2>Calorias consumidas (últimos {CALORIES_RANGE_DAYS} dias)</h2>
        {loading ? (
          <p className="footnote">Carregando...</p>
        ) : (
          <CaloriesChart totals={calorieTotals} target={profile?.dailyCaloriesTarget ?? 0} />
        )}
      </div>
    </div>
  )
}
