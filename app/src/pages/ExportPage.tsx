import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFoodEntries, todayDateString } from '../contexts/FoodEntriesContext'
import { useWeightLogs } from '../contexts/WeightLogsContext'
import { useWaterLogs } from '../contexts/WaterLogsContext'
import { toCsv, downloadCsv } from '../lib/csvExport'

function daysAgoDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function ExportPage() {
  const { fetchEntriesInRange } = useFoodEntries()
  const { fetchLogsInRange: fetchWeightLogsInRange } = useWeightLogs()
  const { fetchLogsInRange: fetchWaterLogsInRange } = useWaterLogs()

  const [startDate, setStartDate] = useState(daysAgoDateString(30))
  const [endDate, setEndDate] = useState(todayDateString())
  const [includeFood, setIncludeFood] = useState(true)
  const [includeWeight, setIncludeWeight] = useState(true)
  const [includeWater, setIncludeWater] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (startDate > endDate) {
      setError('A data inicial precisa ser antes da data final.')
      return
    }
    if (!includeFood && !includeWeight && !includeWater) {
      setError('Selecione ao menos um tipo de dado para exportar.')
      return
    }

    setSubmitting(true)
    setError(null)

    const [entriesResult, weightResult, waterResult] = await Promise.all([
      includeFood ? fetchEntriesInRange(startDate, endDate) : Promise.resolve({ entries: [], error: null }),
      includeWeight ? fetchWeightLogsInRange(startDate, endDate) : Promise.resolve({ logs: [], error: null }),
      includeWater ? fetchWaterLogsInRange(startDate, endDate) : Promise.resolve({ logs: [], error: null }),
    ])

    setSubmitting(false)

    const fetchError = entriesResult.error || weightResult.error || waterResult.error
    if (fetchError) {
      setError(fetchError)
      return
    }

    const csv = toCsv(entriesResult.entries, weightResult.logs, waterResult.logs)
    downloadCsv(`relatorio-${startDate}-a-${endDate}.csv`, csv)
  }

  return (
    <div className="page-container">
      <Link to="/historico" className="back-link">
        ← Histórico
      </Link>

      <div className="section-card">
        <h1>Exportar relatório</h1>

        <div className="form-field">
          <label htmlFor="export-start">Data inicial</label>
          <input
            id="export-start"
            type="date"
            className="date-input"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="export-end">Data final</label>
          <input
            id="export-end"
            type="date"
            className="date-input"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <label className="checkbox-label">
          <input type="checkbox" checked={includeFood} onChange={(e) => setIncludeFood(e.target.checked)} />
          Alimentos registrados
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={includeWeight} onChange={(e) => setIncludeWeight(e.target.checked)} />
          Peso
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={includeWater} onChange={(e) => setIncludeWater(e.target.checked)} />
          Água
        </label>

        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}

        <button type="button" className="button button-primary" onClick={handleGenerate} disabled={submitting}>
          {submitting ? 'Gerando...' : 'Gerar CSV'}
        </button>
      </div>
    </div>
  )
}
