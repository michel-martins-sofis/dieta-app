import { describe, it, expect } from 'vitest'
import { scaleByGrams } from './foodPortion'

describe('scaleByGrams', () => {
  it('scales per-100g nutrition to the given grams', () => {
    const result = scaleByGrams({ caloriesKcal: 200, proteinG: 10, carbG: 20, fatG: 5 }, 150)
    expect(result).toEqual({ caloriesKcal: 300, proteinG: 15, carbG: 30, fatG: 7.5 })
  })

  it('scales down for a small portion', () => {
    const result = scaleByGrams({ caloriesKcal: 123.5, proteinG: 2.6, carbG: 25.8, fatG: 1.0 }, 50)
    expect(result.caloriesKcal).toBe(62)
    expect(result.proteinG).toBe(1.3)
  })

  it('returns zero for zero grams', () => {
    const result = scaleByGrams({ caloriesKcal: 200, proteinG: 10, carbG: 20, fatG: 5 }, 0)
    expect(result).toEqual({ caloriesKcal: 0, proteinG: 0, carbG: 0, fatG: 0 })
  })
})
