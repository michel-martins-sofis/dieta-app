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
  caloriesKcal: number | null
  proteinG: number | null
  carbG: number | null
  fatG: number | null
  amount: number | null
  unit: string | null
  notes: string | null
  confidence: string | null
}

export interface FoodEntryInput {
  mealType: MealType
  name: string
  caloriesKcal: number | null
  proteinG: number | null
  carbG: number | null
  fatG: number | null
  amount?: number | null
  unit?: string | null
  notes?: string | null
  confidence?: string | null
}

export interface DailyCalorieTotal {
  date: string
  caloriesKcal: number
}

export interface DailyMacroTotal {
  date: string
  proteinG: number
  carbG: number
  fatG: number
}

export interface FoodEntryWithDate extends FoodEntry {
  loggedDate: string
}

interface FoodEntryRow {
  id: number
  meal_type: MealType
  name: string
  calories_kcal: number | null
  protein_g: number | null
  carb_g: number | null
  fat_g: number | null
  amount: number | null
  unit: string | null
  notes: string | null
  confidence: string | null
}

const ENTRY_COLUMNS =
  'id, meal_type, name, calories_kcal, protein_g, carb_g, fat_g, amount, unit, notes, confidence'

interface FoodEntriesContextValue {
  entries: FoodEntry[]
  loading: boolean
  error: string | null
  addEntry: (input: FoodEntryInput, date?: string) => Promise<{ error: string | null }>
  updateEntry: (id: number, input: FoodEntryInput) => Promise<{ error: string | null }>
  removeEntry: (id: number) => Promise<{ error: string | null }>
  fetchEntriesByDate: (date: string) => Promise<{ entries: FoodEntry[]; error: string | null }>
  fetchDailyCalorieTotals: (days: number) => Promise<{ totals: DailyCalorieTotal[]; error: string | null }>
  fetchDailyMacroTotals: (days: number) => Promise<{ totals: DailyMacroTotal[]; error: string | null }>
  fetchEntriesInRange: (
    startDate: string,
    endDate: string
  ) => Promise<{ entries: FoodEntryWithDate[]; error: string | null }>
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
    amount: row.amount ?? null,
    unit: row.unit ?? null,
    notes: row.notes ?? null,
    confidence: row.confidence ?? null,
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
          .select(ENTRY_COLUMNS)
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
    async (input: FoodEntryInput, date: string = todayDateString()) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { data, error: insertError } = await supabase
        .from('food_entries')
        .insert({
          user_id: userId,
          logged_date: date,
          meal_type: input.mealType,
          name: input.name,
          calories_kcal: input.caloriesKcal,
          protein_g: input.proteinG,
          carb_g: input.carbG,
          fat_g: input.fatG,
          amount: input.amount ?? null,
          unit: input.unit ?? null,
          notes: input.notes ?? null,
          confidence: input.confidence ?? null,
        })
        .select(ENTRY_COLUMNS)
        .single()

      if (insertError) {
        return { error: insertError.message }
      }

      if (date === todayDateString()) {
        setEntries((current) => [...current, fromRow(data as FoodEntryRow)])
      }
      return { error: null }
    },
    [userId]
  )

  const updateEntry = useCallback(
    async (id: number, input: FoodEntryInput) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { data, error: updateError } = await supabase
        .from('food_entries')
        .update({
          meal_type: input.mealType,
          name: input.name,
          calories_kcal: input.caloriesKcal,
          protein_g: input.proteinG,
          carb_g: input.carbG,
          fat_g: input.fatG,
          amount: input.amount ?? null,
          unit: input.unit ?? null,
          notes: input.notes ?? null,
          confidence: input.confidence ?? null,
        })
        .eq('id', id)
        .select(ENTRY_COLUMNS)
        .single()

      if (updateError) {
        return { error: updateError.message }
      }

      setEntries((current) => current.map((entry) => (entry.id === id ? fromRow(data as FoodEntryRow) : entry)))
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
        .select(ENTRY_COLUMNS)
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
      for (const row of data as { logged_date: string; calories_kcal: number | null }[]) {
        totalsByDate.set(row.logged_date, (totalsByDate.get(row.logged_date) ?? 0) + (row.calories_kcal ?? 0))
      }

      const totals = buildDateRange(days).map((date) => ({
        date,
        caloriesKcal: totalsByDate.get(date) ?? 0,
      }))

      return { totals, error: null }
    },
    [userId]
  )

  const fetchDailyMacroTotals = useCallback(
    async (days: number) => {
      if (!userId) {
        return { totals: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('food_entries')
        .select('logged_date, protein_g, carb_g, fat_g')
        .eq('user_id', userId)
        .gte('logged_date', daysAgoDateString(days - 1))

      if (fetchError) {
        return { totals: [], error: fetchError.message }
      }

      const totalsByDate = new Map<string, { proteinG: number; carbG: number; fatG: number }>()
      for (const row of data as {
        logged_date: string
        protein_g: number | null
        carb_g: number | null
        fat_g: number | null
      }[]) {
        const current = totalsByDate.get(row.logged_date) ?? { proteinG: 0, carbG: 0, fatG: 0 }
        totalsByDate.set(row.logged_date, {
          proteinG: current.proteinG + (row.protein_g ?? 0),
          carbG: current.carbG + (row.carb_g ?? 0),
          fatG: current.fatG + (row.fat_g ?? 0),
        })
      }

      const totals = buildDateRange(days).map((date) => ({
        date,
        ...(totalsByDate.get(date) ?? { proteinG: 0, carbG: 0, fatG: 0 }),
      }))

      return { totals, error: null }
    },
    [userId]
  )

  const fetchEntriesInRange = useCallback(
    async (startDate: string, endDate: string) => {
      if (!userId) {
        return { entries: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('food_entries')
        .select(
          'id, logged_date, meal_type, name, calories_kcal, protein_g, carb_g, fat_g, amount, unit, notes, confidence'
        )
        .eq('user_id', userId)
        .gte('logged_date', startDate)
        .lte('logged_date', endDate)

      if (fetchError) {
        return { entries: [], error: fetchError.message }
      }

      const rows = data as (FoodEntryRow & { logged_date: string })[]
      const entriesWithDate = rows.map((row) => ({ ...fromRow(row), loggedDate: row.logged_date }))

      return { entries: entriesWithDate, error: null }
    },
    [userId]
  )

  const value = useMemo<FoodEntriesContextValue>(
    () => ({
      entries,
      loading,
      error,
      addEntry,
      updateEntry,
      removeEntry,
      fetchEntriesByDate,
      fetchDailyCalorieTotals,
      fetchDailyMacroTotals,
      fetchEntriesInRange,
    }),
    [
      entries,
      loading,
      error,
      addEntry,
      updateEntry,
      removeEntry,
      fetchEntriesByDate,
      fetchDailyCalorieTotals,
      fetchDailyMacroTotals,
      fetchEntriesInRange,
    ]
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
