import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

export interface WorkoutSet {
  id: number
  reps: number | null
  repsMin: number | null
  repsMax: number | null
  loadKg: number | null
  setCount: number | null
  isPr: boolean
  notes: string | null
}

export interface WorkoutExercise {
  id: number
  name: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: number
  workoutDate: string
  type: string
  durationMinutes: number | null
  notes: string | null
  confidence: string | null
  exercises: WorkoutExercise[]
}

export interface WorkoutInput {
  workoutDate: string
  type: string
  durationMinutes?: number | null
  notes?: string | null
}

export interface PersonalRecord {
  id: number
  exercise: string
  loadKg: number
  reps: number | null
  recordDate: string | null
  confidence: string | null
}

interface WorkoutSetRow {
  id: number
  reps: number | null
  reps_min: number | null
  reps_max: number | null
  load_kg: number | null
  set_count: number | null
  is_pr: boolean
  notes: string | null
  sort_order: number
}

interface WorkoutExerciseRow {
  id: number
  name: string
  sort_order: number
  workout_sets: WorkoutSetRow[]
}

interface WorkoutRow {
  id: number
  workout_date: string
  type: string
  duration_minutes: number | null
  notes: string | null
  confidence: string | null
  workout_exercises: WorkoutExerciseRow[]
}

interface PersonalRecordRow {
  id: number
  exercise: string
  load_kg: number
  reps: number | null
  record_date: string | null
  confidence: string | null
}

interface WorkoutsContextValue {
  fetchWorkouts: () => Promise<{ workouts: Workout[]; error: string | null }>
  addWorkout: (input: WorkoutInput) => Promise<{ error: string | null }>
  fetchPersonalRecords: () => Promise<{ records: PersonalRecord[]; error: string | null }>
}

const WorkoutsContext = createContext<WorkoutsContextValue | undefined>(undefined)

function fromSetRow(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    reps: row.reps,
    repsMin: row.reps_min,
    repsMax: row.reps_max,
    loadKg: row.load_kg,
    setCount: row.set_count,
    isPr: row.is_pr,
    notes: row.notes,
  }
}

function fromExerciseRow(row: WorkoutExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    name: row.name,
    sets: [...(row.workout_sets ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(fromSetRow),
  }
}

function fromWorkoutRow(row: WorkoutRow): Workout {
  return {
    id: row.id,
    workoutDate: row.workout_date,
    type: row.type,
    durationMinutes: row.duration_minutes,
    notes: row.notes,
    confidence: row.confidence,
    exercises: [...(row.workout_exercises ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(fromExerciseRow),
  }
}

function fromRecordRow(row: PersonalRecordRow): PersonalRecord {
  return {
    id: row.id,
    exercise: row.exercise,
    loadKg: row.load_kg,
    reps: row.reps,
    recordDate: row.record_date,
    confidence: row.confidence,
  }
}

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const fetchWorkouts = useCallback(async () => {
    if (!userId) {
      return { workouts: [], error: 'Não autenticado.' }
    }

    const { data, error: fetchError } = await supabase
      .from('workouts')
      .select(
        'id, workout_date, type, duration_minutes, notes, confidence, workout_exercises(id, name, sort_order, workout_sets(id, reps, reps_min, reps_max, load_kg, set_count, is_pr, notes, sort_order))'
      )
      .eq('user_id', userId)
      .order('workout_date', { ascending: false })

    if (fetchError) {
      return { workouts: [], error: fetchError.message }
    }

    return { workouts: (data as unknown as WorkoutRow[]).map(fromWorkoutRow), error: null }
  }, [userId])

  const addWorkout = useCallback(
    async (input: WorkoutInput) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { error: insertError } = await supabase.from('workouts').insert({
        user_id: userId,
        workout_date: input.workoutDate,
        type: input.type,
        duration_minutes: input.durationMinutes ?? null,
        notes: input.notes ?? null,
      })

      if (insertError) {
        return { error: insertError.message }
      }

      return { error: null }
    },
    [userId]
  )

  const fetchPersonalRecords = useCallback(async () => {
    if (!userId) {
      return { records: [], error: 'Não autenticado.' }
    }

    const { data, error: fetchError } = await supabase
      .from('personal_records')
      .select('id, exercise, load_kg, reps, record_date, confidence')
      .eq('user_id', userId)
      .order('load_kg', { ascending: false })

    if (fetchError) {
      return { records: [], error: fetchError.message }
    }

    return { records: (data as PersonalRecordRow[]).map(fromRecordRow), error: null }
  }, [userId])

  const value = useMemo<WorkoutsContextValue>(
    () => ({ fetchWorkouts, addWorkout, fetchPersonalRecords }),
    [fetchWorkouts, addWorkout, fetchPersonalRecords]
  )

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>
}

export function useWorkouts() {
  const context = useContext(WorkoutsContext)
  if (!context) {
    throw new Error('useWorkouts must be used within a WorkoutsProvider')
  }
  return context
}
