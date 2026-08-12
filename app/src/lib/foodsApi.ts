import { supabase } from './supabaseClient'

export interface FoodSearchResult {
  id: number
  name: string
  category: string | null
  caloriesKcal: number | null
  proteinG: number | null
  carbG: number | null
  fatG: number | null
}

interface FoodRow {
  id: number
  name: string
  category: string | null
  calories_kcal: number | null
  protein_g: number | null
  carb_g: number | null
  fat_g: number | null
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const { data, error } = await supabase
    .from('foods')
    .select('id, name, category, calories_kcal, protein_g, carb_g, fat_g')
    .ilike('name', `%${trimmed}%`)
    .order('name')
    .limit(20)

  if (error) {
    throw new Error(error.message)
  }

  return (data as FoodRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
  }))
}
