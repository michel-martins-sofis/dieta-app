import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import type { ActivityLevel, Goal, Sex } from '../lib/nutritionGoals'

export interface Profile {
  id: string
  age: number
  weightKg: number
  heightCm: number
  sex: Sex
  activityLevel: ActivityLevel
  goal: Goal
  dailyCaloriesTarget: number
  dailyProteinG: number
  dailyCarbG: number
  dailyFatG: number
}

export interface ProfileInput {
  age: number
  weightKg: number
  heightCm: number
  sex: Sex
  activityLevel: ActivityLevel
  goal: Goal
  dailyCaloriesTarget: number
  dailyProteinG: number
  dailyCarbG: number
  dailyFatG: number
}

interface ProfileRow {
  id: string
  age: number
  weight_kg: number
  height_cm: number
  sex: Sex
  activity_level: ActivityLevel
  goal: Goal
  daily_calories_target: number
  daily_protein_g: number
  daily_carb_g: number
  daily_fat_g: number
}

interface ProfileContextValue {
  profile: Profile | null
  loading: boolean
  error: string | null
  saveProfile: (input: ProfileInput) => Promise<{ error: string | null }>
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    age: row.age,
    weightKg: row.weight_kg,
    heightCm: row.height_cm,
    sex: row.sex,
    activityLevel: row.activity_level,
    goal: row.goal,
    dailyCaloriesTarget: row.daily_calories_target,
    dailyProteinG: row.daily_protein_g,
    dailyCarbG: row.daily_carb_g,
    dailyFatG: row.daily_fat_g,
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!userId) {
      setProfile(null)
      setError(null)
      setLoading(false)
      return
    }

    let ignore = false
    setLoading(true)

    const fetchProfile = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (ignore) return
        if (fetchError) {
          setError(fetchError.message)
          setProfile(null)
          return
        }
        setError(null)
        setProfile(data ? fromRow(data as ProfileRow) : null)
      } catch (err) {
        if (ignore) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar perfil.')
        setProfile(null)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      ignore = true
    }
  }, [authLoading, userId])

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { data, error: saveError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          age: input.age,
          weight_kg: input.weightKg,
          height_cm: input.heightCm,
          sex: input.sex,
          activity_level: input.activityLevel,
          goal: input.goal,
          daily_calories_target: input.dailyCaloriesTarget,
          daily_protein_g: input.dailyProteinG,
          daily_carb_g: input.dailyCarbG,
          daily_fat_g: input.dailyFatG,
        })
        .select()
        .single()

      if (saveError) {
        return { error: saveError.message }
      }

      setProfile(fromRow(data as ProfileRow))
      setError(null)
      return { error: null }
    },
    [userId]
  )

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, loading, error, saveProfile }),
    [profile, loading, error, saveProfile]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
