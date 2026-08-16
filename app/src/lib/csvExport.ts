import { MEAL_LABELS, type FoodEntryWithDate } from '../contexts/FoodEntriesContext'
import type { WeightLog } from '../contexts/WeightLogsContext'
import type { WaterLog } from '../contexts/WaterLogsContext'

const HEADER = [
  'data',
  'tipo',
  'detalhe',
  'calorias_kcal',
  'proteina_g',
  'carboidrato_g',
  'gordura_g',
  'peso_kg',
  'agua_ml',
]

interface CsvRow {
  date: string
  tipo: string
  detalhe: string
  caloriesKcal: string
  proteinG: string
  carbG: string
  fatG: string
  weightKg: string
  amountMl: string
}

function numberOrBlank(value: number | null): string {
  return value === null ? '' : String(value)
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowToLine(row: CsvRow): string {
  return [row.date, row.tipo, row.detalhe, row.caloriesKcal, row.proteinG, row.carbG, row.fatG, row.weightKg, row.amountMl]
    .map(escapeCsvField)
    .join(',')
}

export function toCsv(entries: FoodEntryWithDate[], weightLogs: WeightLog[], waterLogs: WaterLog[]): string {
  const rows: CsvRow[] = [
    ...entries.map((entry) => ({
      date: entry.loggedDate,
      tipo: 'alimento',
      detalhe: `${MEAL_LABELS[entry.mealType]}: ${entry.name}`,
      caloriesKcal: numberOrBlank(entry.caloriesKcal),
      proteinG: numberOrBlank(entry.proteinG),
      carbG: numberOrBlank(entry.carbG),
      fatG: numberOrBlank(entry.fatG),
      weightKg: '',
      amountMl: '',
    })),
    ...weightLogs.map((log) => ({
      date: log.loggedDate,
      tipo: 'peso',
      detalhe: '',
      caloriesKcal: '',
      proteinG: '',
      carbG: '',
      fatG: '',
      weightKg: String(log.weightKg),
      amountMl: '',
    })),
    ...waterLogs.map((log) => ({
      date: log.loggedDate,
      tipo: 'agua',
      detalhe: '',
      caloriesKcal: '',
      proteinG: '',
      carbG: '',
      fatG: '',
      weightKg: '',
      amountMl: String(log.amountMl),
    })),
  ]

  rows.sort((a, b) => a.date.localeCompare(b.date))

  return [HEADER.join(','), ...rows.map(rowToLine)].join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
