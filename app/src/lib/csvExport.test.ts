import { describe, it, expect, vi, afterEach } from 'vitest'
import { toCsv, downloadCsv } from './csvExport'
import type { FoodEntryWithDate } from '../contexts/FoodEntriesContext'
import type { WeightLog } from '../contexts/WeightLogsContext'
import type { WaterLog } from '../contexts/WaterLogsContext'

const ENTRY: FoodEntryWithDate = {
  id: 1,
  loggedDate: '2026-08-05',
  mealType: 'breakfast',
  name: 'Café com leite',
  caloriesKcal: 120,
  proteinG: 6,
  carbG: 12,
  fatG: 4,
  amount: null,
  unit: null,
  notes: null,
  confidence: null,
}

const WEIGHT_LOG: WeightLog = { id: 1, loggedDate: '2026-08-03', weightKg: 80, moment: null, confidence: null }
const WATER_LOG: WaterLog = { id: 1, loggedDate: '2026-08-04', amountMl: 250 }

describe('toCsv', () => {
  it('builds a header row followed by one row per record, sorted by date', () => {
    const csv = toCsv([ENTRY], [WEIGHT_LOG], [WATER_LOG])
    const lines = csv.split('\n')
    expect(lines[0]).toBe(
      'data,tipo,detalhe,calorias_kcal,proteina_g,carboidrato_g,gordura_g,peso_kg,agua_ml'
    )
    expect(lines).toHaveLength(4)
    expect(lines[1]).toContain('2026-08-03,peso')
    expect(lines[2]).toContain('2026-08-04,agua')
    expect(lines[3]).toContain('2026-08-05,alimento')
  })

  it('includes meal label and food name in the detalhe column', () => {
    const csv = toCsv([ENTRY], [], [])
    expect(csv).toContain('Café da manhã: Café com leite')
  })

  it('escapes commas and quotes in text fields', () => {
    const csv = toCsv(
      [{ ...ENTRY, name: 'Arroz, feijão "caseiro"' }],
      [],
      []
    )
    expect(csv).toContain('"Café da manhã: Arroz, feijão ""caseiro"""')
  })

  it('returns just the header when there is no data', () => {
    const csv = toCsv([], [], [])
    expect(csv.split('\n')).toHaveLength(1)
  })
})

describe('downloadCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a hidden anchor, clicks it, and revokes the object URL', () => {
    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = originalCreateElement(tagName)
      if (tagName === 'a') {
        el.click = clickSpy
      }
      return el
    })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    downloadCsv('relatorio.csv', 'a,b\n1,2')

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(appendSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
