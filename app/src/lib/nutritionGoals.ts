export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose_weight' | 'gain_muscle' | 'maintain'

export interface NutritionInput {
  age: number
  weightKg: number
  heightCm: number
  sex: Sex
  activityLevel: ActivityLevel
  goal: Goal
}

export interface NutritionGoals {
  calories: number
  proteinG: number
  carbG: number
  fatG: number
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  lose_weight: -500,
  gain_muscle: 300,
  maintain: 0,
}

const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  lose_weight: 2.0,
  gain_muscle: 1.8,
  maintain: 1.6,
}

const FAT_CALORIE_FRACTION = 0.25
const MIN_CALORIES = 1200

export function calculateBmr(input: Pick<NutritionInput, 'age' | 'weightKg' | 'heightCm' | 'sex'>): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age
  return input.sex === 'male' ? base + 5 : base - 161
}

export function calculateNutritionGoals(input: NutritionInput): NutritionGoals {
  const bmr = calculateBmr(input)
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]
  const adjustedCalories = tdee + GOAL_CALORIE_ADJUSTMENT[input.goal]
  const calories = Math.max(MIN_CALORIES, Math.round(adjustedCalories))

  const proteinG = Math.round(GOAL_PROTEIN_PER_KG[input.goal] * input.weightKg)
  const fatCalories = calories * FAT_CALORIE_FRACTION
  const fatG = Math.round(fatCalories / 9)
  const proteinCalories = proteinG * 4
  const remainingCalories = Math.max(0, calories - proteinCalories - fatCalories)
  const carbG = Math.round(remainingCalories / 4)

  return { calories, proteinG, carbG, fatG }
}
