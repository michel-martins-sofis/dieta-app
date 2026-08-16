import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

export interface WaterLog {
  id: number
  loggedDate: string
  amountMl: number
}

export interface DailyWaterTotal {
  date: string
  amountMl: number
}

interface WaterLogRow {
  id: number
  logged_date: string
  amount_ml: number
}

interface WaterLogsContextValue {
  addWater: (amountMl: number, date: string) => Promise<{ error: string | null }>
  fetchDailyWaterTotals: (days: number) => Promise<{ totals: DailyWaterTotal[]; error: string | null }>
  fetchLogsInRange: (startDate: string, endDate: string) => Promise<{ logs: WaterLog[]; error: string | null }>
}

const WaterLogsContext = createContext<WaterLogsContextValue | undefined>(undefined)

function fromRow(row: WaterLogRow): WaterLog {
  return { id: row.id, loggedDate: row.logged_date, amountMl: row.amount_ml }
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

export function WaterLogsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const addWater = useCallback(
    async (amountMl: number, date: string) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { error: insertError } = await supabase
        .from('water_logs')
        .insert({ user_id: userId, logged_date: date, amount_ml: amountMl })

      if (insertError) {
        return { error: insertError.message }
      }

      return { error: null }
    },
    [userId]
  )

  const fetchDailyWaterTotals = useCallback(
    async (days: number) => {
      if (!userId) {
        return { totals: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('water_logs')
        .select('logged_date, amount_ml')
        .eq('user_id', userId)
        .gte('logged_date', daysAgoDateString(days - 1))

      if (fetchError) {
        return { totals: [], error: fetchError.message }
      }

      const totalsByDate = new Map<string, number>()
      for (const row of data as { logged_date: string; amount_ml: number }[]) {
        totalsByDate.set(row.logged_date, (totalsByDate.get(row.logged_date) ?? 0) + row.amount_ml)
      }

      const totals = buildDateRange(days).map((date) => ({
        date,
        amountMl: totalsByDate.get(date) ?? 0,
      }))

      return { totals, error: null }
    },
    [userId]
  )

  const fetchLogsInRange = useCallback(
    async (startDate: string, endDate: string) => {
      if (!userId) {
        return { logs: [], error: 'Não autenticado.' }
      }

      const { data, error: fetchError } = await supabase
        .from('water_logs')
        .select('id, logged_date, amount_ml')
        .eq('user_id', userId)
        .gte('logged_date', startDate)
        .lte('logged_date', endDate)

      if (fetchError) {
        return { logs: [], error: fetchError.message }
      }

      return { logs: (data as WaterLogRow[]).map(fromRow), error: null }
    },
    [userId]
  )

  const value = useMemo<WaterLogsContextValue>(
    () => ({ addWater, fetchDailyWaterTotals, fetchLogsInRange }),
    [addWater, fetchDailyWaterTotals, fetchLogsInRange]
  )

  return <WaterLogsContext.Provider value={value}>{children}</WaterLogsContext.Provider>
}

export function useWaterLogs() {
  const context = useContext(WaterLogsContext)
  if (!context) {
    throw new Error('useWaterLogs must be used within a WaterLogsProvider')
  }
  return context
}
