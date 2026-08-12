import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

export interface WeightLog {
  id: number
  loggedDate: string
  weightKg: number
}

interface WeightLogRow {
  id: number
  logged_date: string
  weight_kg: number
}

interface WeightLogsContextValue {
  logWeight: (weightKg: number, date: string) => Promise<{ error: string | null }>
  fetchRecentLogs: (days: number) => Promise<{ logs: WeightLog[]; error: string | null }>
}

const WeightLogsContext = createContext<WeightLogsContextValue | undefined>(undefined)

function fromRow(row: WeightLogRow): WeightLog {
  return { id: row.id, loggedDate: row.logged_date, weightKg: row.weight_kg }
}

function daysAgoDateString(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function WeightLogsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const logWeight = useCallback(
    async (weightKg: number, date: string) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { error: upsertError } = await supabase
        .from('weight_logs')
        .upsert({ user_id: userId, logged_date: date, weight_kg: weightKg }, { onConflict: 'user_id,logged_date' })

      if (upsertError) {
        return { error: upsertError.message }
      }

      return { error: null }
    },
    [userId]
  )

  const fetchRecentLogs = useCallback(
    async (days: number) => {
      if (!userId) {
        return { logs: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('weight_logs')
        .select('id, logged_date, weight_kg')
        .eq('user_id', userId)
        .gte('logged_date', daysAgoDateString(days))
        .order('logged_date')

      if (fetchError) {
        return { logs: [], error: fetchError.message }
      }

      return { logs: (data as WeightLogRow[]).map(fromRow), error: null }
    },
    [userId]
  )

  const value = useMemo<WeightLogsContextValue>(
    () => ({ logWeight, fetchRecentLogs }),
    [logWeight, fetchRecentLogs]
  )

  return <WeightLogsContext.Provider value={value}>{children}</WeightLogsContext.Provider>
}

export function useWeightLogs() {
  const context = useContext(WeightLogsContext)
  if (!context) {
    throw new Error('useWeightLogs must be used within a WeightLogsProvider')
  }
  return context
}
