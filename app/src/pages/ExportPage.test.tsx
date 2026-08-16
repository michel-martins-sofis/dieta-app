import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ExportPage } from './ExportPage'

const mockFetchEntriesInRange = vi.fn()
const mockFetchWeightLogsInRange = vi.fn()
const mockFetchWaterLogsInRange = vi.fn()
const mockToCsv = vi.fn()
const mockDownloadCsv = vi.fn()

vi.mock('../contexts/FoodEntriesContext', async () => {
  const actual = await vi.importActual<typeof import('../contexts/FoodEntriesContext')>('../contexts/FoodEntriesContext')
  return { ...actual, useFoodEntries: () => ({ fetchEntriesInRange: mockFetchEntriesInRange }) }
})

vi.mock('../contexts/WeightLogsContext', () => ({
  useWeightLogs: () => ({ fetchLogsInRange: mockFetchWeightLogsInRange }),
}))

vi.mock('../contexts/WaterLogsContext', () => ({
  useWaterLogs: () => ({ fetchLogsInRange: mockFetchWaterLogsInRange }),
}))

vi.mock('../lib/csvExport', () => ({
  toCsv: (...args: unknown[]) => mockToCsv(...args),
  downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args),
}))

describe('ExportPage', () => {
  beforeEach(() => {
    mockFetchEntriesInRange.mockReset().mockResolvedValue({ entries: [{ id: 1 }], error: null })
    mockFetchWeightLogsInRange.mockReset().mockResolvedValue({ logs: [{ id: 1 }], error: null })
    mockFetchWaterLogsInRange.mockReset().mockResolvedValue({ logs: [{ id: 1 }], error: null })
    mockToCsv.mockReset().mockReturnValue('data,tipo\n2026-08-01,alimento')
    mockDownloadCsv.mockReset()
  })

  it('fetches all three datasets and downloads a csv when all checkboxes are checked', async () => {
    render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: /gerar csv/i }))

    expect(mockFetchEntriesInRange).toHaveBeenCalled()
    expect(mockFetchWeightLogsInRange).toHaveBeenCalled()
    expect(mockFetchWaterLogsInRange).toHaveBeenCalled()
    expect(mockToCsv).toHaveBeenCalledWith([{ id: 1 }], [{ id: 1 }], [{ id: 1 }])
    expect(mockDownloadCsv).toHaveBeenCalledWith(
      expect.stringMatching(/^relatorio-.*\.csv$/),
      'data,tipo\n2026-08-01,alimento'
    )
  })

  it('skips a dataset fetch when its checkbox is unchecked', async () => {
    render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByLabelText('Água'))
    await userEvent.click(screen.getByRole('button', { name: /gerar csv/i }))

    expect(mockFetchWaterLogsInRange).not.toHaveBeenCalled()
    expect(mockToCsv).toHaveBeenCalledWith([{ id: 1 }], [{ id: 1 }], [])
  })

  it('shows an error when the start date is after the end date', async () => {
    render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-08-20' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-08-01' } })
    await userEvent.click(screen.getByRole('button', { name: /gerar csv/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/data inicial precisa ser antes/i)
    expect(mockFetchEntriesInRange).not.toHaveBeenCalled()
  })

  it('shows an error when no dataset is selected', async () => {
    render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByLabelText('Alimentos registrados'))
    await userEvent.click(screen.getByLabelText('Peso'))
    await userEvent.click(screen.getByLabelText('Água'))
    await userEvent.click(screen.getByRole('button', { name: /gerar csv/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/selecione ao menos um tipo/i)
  })
})
