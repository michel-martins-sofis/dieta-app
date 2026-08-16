import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { useFoodEntries, todayDateString, type FoodEntryInput, type MealType } from './FoodEntriesContext'

export interface MealPlan {
  id: number
  plannedDate: string
  mealType: MealType
  name: string
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

interface MealPlanRow {
  id: number
  planned_date: string
  meal_type: MealType
  name: string
  calories_kcal: number
  protein_g: number
  carb_g: number
  fat_g: number
}

interface MealPlansContextValue {
  fetchPlansByDate: (date: string) => Promise<{ plans: MealPlan[]; error: string | null }>
  addPlannedMeal: (input: FoodEntryInput, plannedDate: string) => Promise<{ error: string | null }>
  removePlannedMeal: (id: number) => Promise<{ error: string | null }>
  duplicateDay: (fromDate: string, toDate: string) => Promise<{ error: string | null }>
  commitPlannedDay: (date: string) => Promise<{ error: string | null }>
}

const MealPlansContext = createContext<MealPlansContextValue | undefined>(undefined)

function fromRow(row: MealPlanRow): MealPlan {
  return {
    id: row.id,
    plannedDate: row.planned_date,
    mealType: row.meal_type,
    name: row.name,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
  }
}

export function MealPlansProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { addEntry, fetchEntriesByDate } = useFoodEntries()

  const fetchPlansByDate = useCallback(
    async (date: string) => {
      if (!userId) {
        return { plans: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('meal_plans')
        .select('id, planned_date, meal_type, name, calories_kcal, protein_g, carb_g, fat_g')
        .eq('user_id', userId)
        .eq('planned_date', date)
        .order('created_at')

      if (fetchError) {
        return { plans: [], error: fetchError.message }
      }

      return { plans: (data as MealPlanRow[]).map(fromRow), error: null }
    },
    [userId]
  )

  const addPlannedMeal = useCallback(
    async (input: FoodEntryInput, plannedDate: string) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { error: insertError } = await supabase.from('meal_plans').insert({
        user_id: userId,
        planned_date: plannedDate,
        meal_type: input.mealType,
        name: input.name,
        calories_kcal: input.caloriesKcal,
        protein_g: input.proteinG,
        carb_g: input.carbG,
        fat_g: input.fatG,
      })

      if (insertError) {
        return { error: insertError.message }
      }

      return { error: null }
    },
    [userId]
  )

  const removePlannedMeal = useCallback(
    async (id: number) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { error: deleteError } = await supabase.from('meal_plans').delete().eq('id', id)

      if (deleteError) {
        return { error: deleteError.message }
      }

      return { error: null }
    },
    [userId]
  )

  const duplicateDay = useCallback(
    async (fromDate: string, toDate: string) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { entries, error: fetchError } = await fetchEntriesByDate(fromDate)
      if (fetchError) {
        return { error: fetchError }
      }
      if (entries.length === 0) {
        return { error: null }
      }

      const isToday = toDate === todayDateString()
      for (const entry of entries) {
        const input: FoodEntryInput = {
          mealType: entry.mealType,
          name: entry.name,
          caloriesKcal: entry.caloriesKcal,
          proteinG: entry.proteinG,
          carbG: entry.carbG,
          fatG: entry.fatG,
        }
        const { error } = isToday ? await addEntry(input, toDate) : await addPlannedMeal(input, toDate)
        if (error) {
          return { error }
        }
      }

      return { error: null }
    },
    [userId, fetchEntriesByDate, addEntry, addPlannedMeal]
  )

  const commitPlannedDay = useCallback(
    async (date: string) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }
      if (date > todayDateString()) {
        return { error: 'Só é possível confirmar planos até o dia de hoje.' }
      }

      const { plans, error: fetchError } = await fetchPlansByDate(date)
      if (fetchError) {
        return { error: fetchError }
      }

      for (const plan of plans) {
        const input: FoodEntryInput = {
          mealType: plan.mealType,
          name: plan.name,
          caloriesKcal: plan.caloriesKcal,
          proteinG: plan.proteinG,
          carbG: plan.carbG,
          fatG: plan.fatG,
        }
        const { error } = await addEntry(input, date)
        if (error) {
          return { error }
        }
        const { error: removeError } = await removePlannedMeal(plan.id)
        if (removeError) {
          return { error: removeError }
        }
      }

      return { error: null }
    },
    [userId, fetchPlansByDate, addEntry, removePlannedMeal]
  )

  const value = useMemo<MealPlansContextValue>(
    () => ({ fetchPlansByDate, addPlannedMeal, removePlannedMeal, duplicateDay, commitPlannedDay }),
    [fetchPlansByDate, addPlannedMeal, removePlannedMeal, duplicateDay, commitPlannedDay]
  )

  return <MealPlansContext.Provider value={value}>{children}</MealPlansContext.Provider>
}

export function useMealPlans() {
  const context = useContext(MealPlansContext)
  if (!context) {
    throw new Error('useMealPlans must be used within a MealPlansProvider')
  }
  return context
}
