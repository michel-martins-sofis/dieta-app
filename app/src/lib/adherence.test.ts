import { describe, it, expect } from 'vitest'
import { calculateAdherence } from './adherence'

describe('calculateAdherence', () => {
  it('counts a day as within target when inside the tolerance ratio', () => {
    const result = calculateAdherence(
      [
        { date: '2026-08-01', value: 2000 },
        { date: '2026-08-02', value: 2200 },
      ],
      2000,
      0.1
    )
    expect(result).toEqual({ loggedDays: 2, withinTargetDays: 2, percentage: 100 })
  })

  it('excludes a day outside the tolerance ratio', () => {
    const result = calculateAdherence(
      [
        { date: '2026-08-01', value: 2000 },
        { date: '2026-08-02', value: 3000 },
      ],
      2000,
      0.1
    )
    expect(result).toEqual({ loggedDays: 2, withinTargetDays: 1, percentage: 50 })
  })

  it('does not count an unlogged day (value 0) toward the denominator', () => {
    const result = calculateAdherence(
      [
        { date: '2026-08-01', value: 2000 },
        { date: '2026-08-02', value: 0 },
      ],
      2000,
      0.1
    )
    expect(result).toEqual({ loggedDays: 1, withinTargetDays: 1, percentage: 100 })
  })

  it('returns zero percentage when there is no target, without crashing on the division', () => {
    expect(calculateAdherence([{ date: '2026-08-01', value: 2000 }], 0)).toEqual({
      loggedDays: 1,
      withinTargetDays: 0,
      percentage: 0,
    })
  })

  it('returns zero percentage when there are no logged days', () => {
    expect(calculateAdherence([{ date: '2026-08-01', value: 0 }], 2000)).toEqual({
      loggedDays: 0,
      withinTargetDays: 0,
      percentage: 0,
    })
  })
})
