import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WaterLogsProvider, useWaterLogs } from './WaterLogsContext'
import { todayDateString } from './FoodEntriesContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildChain() {
  const chain = {
    insert: (...args: unknown[]) => {
      mockInsert(...args)
      return Promise.resolve({ error: null })
    },
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return chain
    },
    eq: (...args: unknown[]) => {
      mockEq(...args)
      return chain
    },
    gte: (...args: unknown[]) => {
      const result = mockGte(...args)
      if (result && typeof result === 'object') {
        ;(result as { lte?: unknown }).lte = (...lteArgs: unknown[]) => {
          mockLte(...lteArgs)
          return result
        }
      }
      return result
    },
  }
  return chain
}

function TestConsumer() {
  const { addWater, fetchDailyWaterTotals, fetchLogsInRange } = useWaterLogs()
  return (
    <div>
      <button onClick={() => addWater(250, todayDateString())}>adicionar</button>
      <button
        onClick={async () => {
          const { totals } = await fetchDailyWaterTotals(3)
          document.title = totals.map((t) => `${t.date}:${t.amountMl}`).join(',')
        }}
      >
        totais
      </button>
      <button
        onClick={async () => {
          const { logs } = await fetchLogsInRange('2026-08-01', '2026-08-10')
          document.title = `intervalo:${logs.length}`
        }}
      >
        intervalo
      </button>
    </div>
  )
}

describe('WaterLogsContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' } })
    mockInsert.mockReset()
    mockGte.mockReset().mockResolvedValue({ data: [], error: null })
    mockLte.mockReset()
  })

  it('inserts a new water log row for the given date (does not overwrite)', async () => {
    render(
      <WaterLogsProvider>
        <TestConsumer />
      </WaterLogsProvider>
    )
    await userEvent.click(screen.getByText('adicionar'))
    expect(mockFrom).toHaveBeenCalledWith('water_logs')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', amount_ml: 250 })
    )
  })

  it('sums multiple logs per day into a daily total, filling empty days with zero', async () => {
    const today = todayDateString()
    mockGte.mockResolvedValue({
      data: [
        { logged_date: today, amount_ml: 250 },
        { logged_date: today, amount_ml: 300 },
      ],
      error: null,
    })
    render(
      <WaterLogsProvider>
        <TestConsumer />
      </WaterLogsProvider>
    )
    await userEvent.click(screen.getByText('totais'))
    expect(document.title).toContain(`${today}:550`)
  })

  it('fetches logs within an arbitrary date range', async () => {
    mockGte.mockResolvedValue({ data: [{ id: 1, logged_date: '2026-08-05', amount_ml: 200 }], error: null })
    render(
      <WaterLogsProvider>
        <TestConsumer />
      </WaterLogsProvider>
    )
    await userEvent.click(screen.getByText('intervalo'))
    expect(mockGte).toHaveBeenCalledWith('logged_date', '2026-08-01')
    expect(mockLte).toHaveBeenCalledWith('logged_date', '2026-08-10')
    expect(document.title).toBe('intervalo:1')
  })

  it('returns an error when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    render(
      <WaterLogsProvider>
        <TestConsumer />
      </WaterLogsProvider>
    )
    await userEvent.click(screen.getByText('adicionar'))
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
