import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchFoods } from './foodsApi'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockIlike = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildChain() {
  const chain = {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return chain
    },
    ilike: (...args: unknown[]) => {
      mockIlike(...args)
      return chain
    },
    order: (...args: unknown[]) => {
      mockOrder(...args)
      return chain
    },
    limit: (...args: unknown[]) => mockLimit(...args),
  }
  return chain
}

describe('searchFoods', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockLimit.mockReset()
  })

  it('returns an empty array without querying for a blank query', async () => {
    const results = await searchFoods('   ')
    expect(results).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('searches foods by name and maps rows to camelCase', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Arroz, integral, cozido',
          category: 'Cereais',
          calories_kcal: 124,
          protein_g: 2.6,
          carb_g: 25.8,
          fat_g: 1,
        },
      ],
      error: null,
    })

    const results = await searchFoods('arroz')

    expect(mockIlike).toHaveBeenCalledWith('name', '%arroz%')
    expect(results).toEqual([
      {
        id: 1,
        name: 'Arroz, integral, cozido',
        category: 'Cereais',
        caloriesKcal: 124,
        proteinG: 2.6,
        carbG: 25.8,
        fatG: 1,
      },
    ])
  })

  it('throws when the query fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'db error' } })
    await expect(searchFoods('arroz')).rejects.toThrow('db error')
  })
})
