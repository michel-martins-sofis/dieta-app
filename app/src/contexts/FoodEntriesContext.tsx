import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

export interface FoodEntry {
  id: number
  mealType: MealType
  name: string
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

export interface FoodEntryInput {
  mealType: MealType
  name: string
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

export interface DailyCalorieTotal {
  date: string
  caloriesKcal: number
}

interface FoodEntryRow {
  id: number
  meal_type: MealType
  name: string
  calories_kcal: number
  protein_g: number
  carb_g: number
  fat_g: number
}

interface FoodEntriesContextValue {
  entries: FoodEntry[]
  loading: boolean
  error: string | null
  addEntry: (input: FoodEntryInput) => Promise<{ error: string | null }>
  removeEntry: (id: number) => Promise<{ error: string | null }>
  fetchEntriesByDate: (date: string) => Promise<{ entries: FoodEntry[]; error: string | null }>
  fetchDailyCalorieTotals: (days: number) => Promise<{ totals: DailyCalorieTotal[]; error: string | null }>
}

const FoodEntriesContext = createContext<FoodEntriesContextValue | undefined>(undefined)

function fromRow(row: FoodEntryRow): FoodEntry {
  return {
    id: row.id,
    mealType: row.meal_type,
    name: row.name,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
  }
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function buildDateRange(days: number): string[] {
  const dates: string[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dates.push(daysAgoDateString(offset))
  }
  return dates
}

export function FoodEntriesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!userId) {
      setEntries([])
      setError(null)
      setLoading(false)
      return
    }

    let ignore = false
    setLoading(true)

    const fetchEntries = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('food_entries')
          .select('id, meal_type, name, calories_kcal, protein_g, carb_g, fat_g')
          .eq('user_id', userId)
          .eq('logged_date', todayDateString())
          .order('created_at')
        if (ignore) return
        if (fetchError) {
          setError(fetchError.message)
          setEntries([])
          return
        }
        setError(null)
        setEntries((data as FoodEntryRow[]).map(fromRow))
      } catch (err) {
        if (ignore) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar refeições.')
        setEntries([])
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchEntries()

    return () => {
      ignore = true
    }
  }, [authLoading, userId])

  const addEntry = useCallback(
    async (input: FoodEntryInput) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { data, error: insertError } = await supabase
        .from('food_entries')
        .insert({
          user_id: userId,
          logged_date: todayDateString(),
          meal_type: input.mealType,
          name: input.name,
          calories_kcal: input.caloriesKcal,
          protein_g: input.proteinG,
          carb_g: input.carbG,
          fat_g: input.fatG,
        })
        .select('id, meal_type, name, calories_kcal, protein_g, carb_g, fat_g')
        .single()

      if (insertError) {
        return { error: insertError.message }
      }

      setEntries((current) => [...current, fromRow(data as FoodEntryRow)])
      return { error: null }
    },
    [userId]
  )

  const removeEntry = useCallback(
    async (id: number) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { error: deleteError } = await supabase.from('food_entries').delete().eq('id', id)

      if (deleteError) {
        return { error: deleteError.message }
      }

      setEntries((current) => current.filter((entry) => entry.id !== id))
      return { error: null }
    },
    [userId]
  )

  const fetchEntriesByDate = useCallback(
    async (date: string) => {
      if (!userId) {
        return { entries: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('food_entries')
        .select('id, meal_type, name, calories_kcal, protein_g, carb_g, fat_g')
        .eq('user_id', userId)
        .eq('logged_date', date)
        .order('created_at')

      if (fetchError) {
        return { entries: [], error: fetchError.message }
      }

      return { entries: (data as FoodEntryRow[]).map(fromRow), error: null }
    },
    [userId]
  )

  const fetchDailyCalorieTotals = useCallback(
    async (days: number) => {
      if (!userId) {
        return { totals: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('food_entries')
        .select('logged_date, calories_kcal')
        .eq('user_id', userId)
        .gte('logged_date', daysAgoDateString(days - 1))

      if (fetchError) {
        return { totals: [], error: fetchError.message }
      }

      const totalsByDate = new Map<string, number>()
      for (const row of data as { logged_date: string; calories_kcal: number }[]) {
        totalsByDate.set(row.logged_date, (totalsByDate.get(row.logged_date) ?? 0) + row.calories_kcal)
      }

      const totals = buildDateRange(days).map((date) => ({
        date,
        caloriesKcal: totalsByDate.get(date) ?? 0,
      }))

      return { totals, error: null }
    },
    [userId]
  )

  const value = useMemo<FoodEntriesContextValue>(
    () => ({ entries, loading, error, addEntry, removeEntry, fetchEntriesByDate, fetchDailyCalorieTotals }),
    [entries, loading, error, addEntry, removeEntry, fetchEntriesByDate, fetchDailyCalorieTotals]
  )

  return <FoodEntriesContext.Provider value={value}>{children}</FoodEntriesContext.Provider>
}

export function useFoodEntries() {
  const context = useContext(FoodEntriesContext)
  if (!context) {
    throw new Error('useFoodEntries must be used within a FoodEntriesProvider')
  }
  return context
}
