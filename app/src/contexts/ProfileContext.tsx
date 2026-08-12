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
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    let ignore = false
    setLoading(true)

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }: { data: ProfileRow | null }) => {
        if (ignore) return
        setProfile(data ? fromRow(data) : null)
      })
      .catch(() => {
        if (ignore) return
        setProfile(null)
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [user])

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (!user) {
        return { error: 'Não autenticado.' }
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
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

      if (error) {
        return { error: error.message }
      }

      setProfile(fromRow(data as ProfileRow))
      return { error: null }
    },
    [user]
  )

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, loading, saveProfile }),
    [profile, loading, saveProfile]
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
