import { describe, it, expect } from 'vitest'
import { calculateBmr, calculateNutritionGoals } from './nutritionGoals'

describe('calculateBmr', () => {
  it('calculates BMR for a male using Mifflin-St Jeor', () => {
    const bmr = calculateBmr({ age: 30, weightKg: 80, heightCm: 180, sex: 'male' })
    expect(bmr).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 30 + 5, 5)
  })

  it('calculates BMR for a female using Mifflin-St Jeor', () => {
    const bmr = calculateBmr({ age: 30, weightKg: 65, heightCm: 165, sex: 'female' })
    expect(bmr).toBeCloseTo(10 * 65 + 6.25 * 165 - 5 * 30 - 161, 5)
  })
})

describe('calculateNutritionGoals', () => {
  it('applies a calorie deficit and higher protein for weight loss', () => {
    const goals = calculateNutritionGoals({
      age: 30,
      weightKg: 80,
      heightCm: 180,
      sex: 'male',
      activityLevel: 'sedentary',
      goal: 'lose_weight',
    })
    const bmr = 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    const tdee = bmr * 1.2
    expect(goals.calories).toBe(Math.round(tdee - 500))
    expect(goals.proteinG).toBe(Math.round(2.0 * 80))
  })

  it('applies a calorie surplus and moderate protein for muscle gain', () => {
    const goals = calculateNutritionGoals({
      age: 25,
      weightKg: 70,
      heightCm: 175,
      sex: 'male',
      activityLevel: 'moderate',
      goal: 'gain_muscle',
    })
    const bmr = 10 * 70 + 6.25 * 175 - 5 * 25 + 5
    const tdee = bmr * 1.55
    expect(goals.calories).toBe(Math.round(tdee + 300))
    expect(goals.proteinG).toBe(Math.round(1.8 * 70))
  })

  it('keeps calories at TDEE with no adjustment for maintenance', () => {
    const goals = calculateNutritionGoals({
      age: 40,
      weightKg: 60,
      heightCm: 160,
      sex: 'female',
      activityLevel: 'light',
      goal: 'maintain',
    })
    const bmr = 10 * 60 + 6.25 * 160 - 5 * 40 - 161
    const tdee = bmr * 1.375
    expect(goals.calories).toBe(Math.round(tdee))
    expect(goals.proteinG).toBe(Math.round(1.6 * 60))
  })

  it('never returns fewer than 1200 calories even with an aggressive deficit', () => {
    const goals = calculateNutritionGoals({
      age: 60,
      weightKg: 45,
      heightCm: 150,
      sex: 'female',
      activityLevel: 'sedentary',
      goal: 'lose_weight',
    })
    expect(goals.calories).toBe(1200)
  })

  it('splits remaining calories into carbs after protein and fat are allocated', () => {
    const goals = calculateNutritionGoals({
      age: 30,
      weightKg: 80,
      heightCm: 180,
      sex: 'male',
      activityLevel: 'sedentary',
      goal: 'maintain',
    })
    const proteinCalories = goals.proteinG * 4
    const fatCalories = goals.fatG * 9
    const carbCalories = goals.carbG * 4
    expect(proteinCalories + fatCalories + carbCalories).toBeCloseTo(goals.calories, -1)
    expect(goals.fatG).toBe(Math.round(goals.calories * 0.25 / 9))
  })

  it('applies active activity multiplier (1.725)', () => {
    const goals = calculateNutritionGoals({
      age: 35,
      weightKg: 75,
      heightCm: 175,
      sex: 'male',
      activityLevel: 'active',
      goal: 'maintain',
    })
    const bmr = 10 * 75 + 6.25 * 175 - 5 * 35 + 5
    const tdee = bmr * 1.725
    expect(goals.calories).toBe(Math.round(tdee))
  })

  it('applies very_active activity multiplier (1.9)', () => {
    const goals = calculateNutritionGoals({
      age: 28,
      weightKg: 85,
      heightCm: 185,
      sex: 'male',
      activityLevel: 'very_active',
      goal: 'maintain',
    })
    const bmr = 10 * 85 + 6.25 * 185 - 5 * 28 + 5
    const tdee = bmr * 1.9
    expect(goals.calories).toBe(Math.round(tdee))
  })
})
