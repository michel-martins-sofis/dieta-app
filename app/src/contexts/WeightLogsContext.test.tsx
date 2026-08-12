import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeightLogsProvider, useWeightLogs } from './WeightLogsContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockOrder = vi.fn()

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
    upsert: (...args: unknown[]) => {
      mockUpsert(...args)
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
      mockGte(...args)
      return chain
    },
    order: (...args: unknown[]) => mockOrder(...args),
  }
  return chain
}

function TestConsumer() {
  const { logWeight, fetchRecentLogs } = useWeightLogs()
  return (
    <div>
      <button onClick={() => logWeight(79.5, '2026-08-12')}>registrar</button>
      <button
        onClick={async () => {
          const { logs } = await fetchRecentLogs(30)
          document.title = String(logs.length)
        }}
      >
        buscar
      </button>
    </div>
  )
}

describe('WeightLogsContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUpsert.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockGte.mockReset()
    mockOrder.mockReset().mockResolvedValue({
      data: [{ id: 1, logged_date: '2026-08-01', weight_kg: 80 }],
      error: null,
    })
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' } })
  })

  it('upserts a weight log for the given date', async () => {
    render(
      <WeightLogsProvider>
        <TestConsumer />
      </WeightLogsProvider>
    )
    await userEvent.click(screen.getByText('registrar'))
    expect(mockFrom).toHaveBeenCalledWith('weight_logs')
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'user-1', logged_date: '2026-08-12', weight_kg: 79.5 },
      { onConflict: 'user_id,logged_date' }
    )
  })

  it('fetches recent logs scoped to the current user', async () => {
    render(
      <WeightLogsProvider>
        <TestConsumer />
      </WeightLogsProvider>
    )
    await userEvent.click(screen.getByText('buscar'))
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(document.title).toBe('1')
  })

  it('returns an error when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    render(
      <WeightLogsProvider>
        <TestConsumer />
      </WeightLogsProvider>
    )
    await userEvent.click(screen.getByText('registrar'))
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
