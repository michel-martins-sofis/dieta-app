import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useProfile } from '../contexts/ProfileContext'
import { useWeightLogs, type WeightLog } from '../contexts/WeightLogsContext'
import {
  useFoodEntries,
  todayDateString,
  type DailyCalorieTotal,
  type DailyMacroTotal,
} from '../contexts/FoodEntriesContext'
import { useWaterLogs, type DailyWaterTotal } from '../contexts/WaterLogsContext'
import { WeightChart } from '../components/WeightChart'
import { CaloriesChart } from '../components/CaloriesChart'
import { MacrosChart } from '../components/MacrosChart'
import { calculateAdherence } from '../lib/adherence'

const WEIGHT_RANGE_DAYS = 30
const CALORIES_RANGE_DAYS = 14
const WATER_RANGE_DAYS = 7
const WATER_QUICK_AMOUNTS = [250, 500]

export function HistoryPage() {
  const { profile, saveProfile } = useProfile()
  const { logWeight, fetchRecentLogs } = useWeightLogs()
  const { fetchDailyCalorieTotals, fetchDailyMacroTotals } = useFoodEntries()
  const { addWater, fetchDailyWaterTotals } = useWaterLogs()

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [calorieTotals, setCalorieTotals] = useState<DailyCalorieTotal[]>([])
  const [macroTotals, setMacroTotals] = useState<DailyMacroTotal[]>([])
  const [waterTotals, setWaterTotals] = useState<DailyWaterTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [weightInput, setWeightInput] = useState('')
  const [weightMoment, setWeightMoment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [waterAmount, setWaterAmount] = useState('')
  const [waterSubmitting, setWaterSubmitting] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [weightResult, caloriesResult, macrosResult, waterResult] = await Promise.all([
      fetchRecentLogs(WEIGHT_RANGE_DAYS),
      fetchDailyCalorieTotals(CALORIES_RANGE_DAYS),
      fetchDailyMacroTotals(CALORIES_RANGE_DAYS),
      fetchDailyWaterTotals(WATER_RANGE_DAYS),
    ])
    if (weightResult.error) {
      setError(weightResult.error)
    } else if (caloriesResult.error) {
      setError(caloriesResult.error)
    } else if (macrosResult.error) {
      setError(macrosResult.error)
    } else if (waterResult.error) {
      setError(waterResult.error)
    } else {
      setError(null)
    }
    setWeightLogs(weightResult.logs)
    setCalorieTotals(caloriesResult.totals)
    setMacroTotals(macrosResult.totals)
    setWaterTotals(waterResult.totals)
    setLoading(false)
  }

  useEffect(() => {
    let ignore = false

    async function load() {
      await loadAll()
      if (ignore) return
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
    const { error: logError } = await logWeight(parsedWeight, today, weightMoment || null)
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
    setWeightMoment('')
    setNotice('Peso registrado.')
  }

  async function handleAddWater(amountMl: number) {
    if (!amountMl || amountMl <= 0) {
      setError('Informe uma quantidade de água válida.')
      return
    }
    setWaterSubmitting(true)
    setError(null)
    const { error: waterError } = await addWater(amountMl, todayDateString())
    if (waterError) {
      setWaterSubmitting(false)
      setError(waterError)
      return
    }
    const { totals, error: refetchError } = await fetchDailyWaterTotals(WATER_RANGE_DAYS)
    setWaterSubmitting(false)
    if (refetchError) {
      setError(refetchError)
      return
    }
    setWaterTotals(totals)
    setWaterAmount('')
  }

  const caloriesAdherence = calculateAdherence(
    calorieTotals.map((total) => ({ date: total.date, value: total.caloriesKcal })),
    profile?.dailyCaloriesTarget ?? 0
  )
  const proteinAdherence = calculateAdherence(
    macroTotals.map((total) => ({ date: total.date, value: total.proteinG })),
    profile?.dailyProteinG ?? 0
  )
  const carbAdherence = calculateAdherence(
    macroTotals.map((total) => ({ date: total.date, value: total.carbG })),
    profile?.dailyCarbG ?? 0
  )
  const fatAdherence = calculateAdherence(
    macroTotals.map((total) => ({ date: total.date, value: total.fatG })),
    profile?.dailyFatG ?? 0
  )

  const todayWaterMl = waterTotals.length > 0 ? waterTotals[waterTotals.length - 1].amountMl : 0

  return (
    <div className="page-container">
      <div className="top-bar">
        <h1>Histórico</h1>
        <Link to="/exportar" className="button button-secondary">
          <Download size={16} /> Exportar relatório
        </Link>
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
          <div className="form-field">
            <label htmlFor="history-weight-moment">Momento (opcional)</label>
            <select id="history-weight-moment" value={weightMoment} onChange={(e) => setWeightMoment(e.target.value)}>
              <option value="">Não informado</option>
              <option value="fasting">Em jejum</option>
              <option value="pre_workout">Pré-treino</option>
              <option value="post_workout">Pós-treino</option>
            </select>
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
        <h2>Água</h2>
        <p>
          Hoje: <strong>{todayWaterMl} ml</strong>
        </p>
        <div className="inline-form">
          <div className="top-bar-actions">
            {WATER_QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="button button-secondary"
                disabled={waterSubmitting}
                onClick={() => handleAddWater(amount)}
              >
                +{amount}ml
              </button>
            ))}
          </div>
          <div className="form-field">
            <label htmlFor="water-amount">Quantidade personalizada (ml)</label>
            <input
              id="water-amount"
              type="number"
              value={waterAmount}
              onChange={(e) => setWaterAmount(e.target.value)}
              min={1}
            />
          </div>
          <button
            type="button"
            className="button button-primary"
            disabled={waterSubmitting}
            onClick={() => handleAddWater(Number(waterAmount))}
          >
            {waterSubmitting ? 'Registrando...' : 'Adicionar'}
          </button>
        </div>

        <details className="chart-table-toggle">
          <summary>Ver últimos {WATER_RANGE_DAYS} dias</summary>
          <table className="chart-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Água (ml)</th>
              </tr>
            </thead>
            <tbody>
              {waterTotals.map((total) => (
                <tr key={total.date}>
                  <td>{total.date}</td>
                  <td>{total.amountMl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
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

      <div className="section-card">
        <h2>Macros e adesão à meta</h2>
        {loading ? (
          <p className="footnote">Carregando...</p>
        ) : (
          <>
            <div className="goal-grid">
              <div className="goal-stat goal-stat--calories">
                <strong>
                  {caloriesAdherence.withinTargetDays}/{caloriesAdherence.loggedDays}
                </strong>
                <span>Dias dentro da meta de calorias</span>
              </div>
              <div className="goal-stat goal-stat--protein">
                <strong>
                  {proteinAdherence.withinTargetDays}/{proteinAdherence.loggedDays}
                </strong>
                <span>Dias dentro da meta de proteína</span>
              </div>
              <div className="goal-stat goal-stat--carb">
                <strong>
                  {carbAdherence.withinTargetDays}/{carbAdherence.loggedDays}
                </strong>
                <span>Dias dentro da meta de carboidrato</span>
              </div>
              <div className="goal-stat goal-stat--fat">
                <strong>
                  {fatAdherence.withinTargetDays}/{fatAdherence.loggedDays}
                </strong>
                <span>Dias dentro da meta de gordura</span>
              </div>
            </div>
            <MacrosChart totals={macroTotals} />
          </>
        )}
      </div>
    </div>
  )
}
