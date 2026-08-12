export interface PortionNutrition {
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

export function scaleByGrams(per100g: PortionNutrition, grams: number): PortionNutrition {
  const factor = grams / 100
  return {
    caloriesKcal: Math.round(per100g.caloriesKcal * factor),
    proteinG: Math.round(per100g.proteinG * factor * 10) / 10,
    carbG: Math.round(per100g.carbG * factor * 10) / 10,
    fatG: Math.round(per100g.fatG * factor * 10) / 10,
  }
}
