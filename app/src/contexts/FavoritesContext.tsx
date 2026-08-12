import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

export interface Favorite {
  id: number
  name: string
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

export interface FavoriteInput {
  name: string
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

interface FavoriteRow {
  id: number
  name: string
  calories_kcal: number
  protein_g: number
  carb_g: number
  fat_g: number
}

interface FavoritesContextValue {
  favorites: Favorite[]
  loading: boolean
  error: string | null
  addFavorite: (input: FavoriteInput) => Promise<{ error: string | null }>
  removeFavorite: (id: number) => Promise<{ error: string | null }>
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined)

function fromRow(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    name: row.name,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!userId) {
      setFavorites([])
      setError(null)
      setLoading(false)
      return
    }

    let ignore = false
    setLoading(true)

    const fetchFavorites = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('favorite_foods')
          .select('id, name, calories_kcal, protein_g, carb_g, fat_g')
          .eq('user_id', userId)
          .order('name')
        if (ignore) return
        if (fetchError) {
          setError(fetchError.message)
          setFavorites([])
          return
        }
        setError(null)
        setFavorites((data as FavoriteRow[]).map(fromRow))
      } catch (err) {
        if (ignore) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar favoritos.')
        setFavorites([])
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchFavorites()

    return () => {
      ignore = true
    }
  }, [authLoading, userId])

  const addFavorite = useCallback(
    async (input: FavoriteInput) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { data, error: insertError } = await supabase
        .from('favorite_foods')
        .insert({
          user_id: userId,
          name: input.name,
          calories_kcal: input.caloriesKcal,
          protein_g: input.proteinG,
          carb_g: input.carbG,
          fat_g: input.fatG,
        })
        .select('id, name, calories_kcal, protein_g, carb_g, fat_g')
        .single()

      if (insertError) {
        return { error: insertError.message }
      }

      setFavorites((current) => [...current, fromRow(data as FavoriteRow)])
      return { error: null }
    },
    [userId]
  )

  const removeFavorite = useCallback(
    async (id: number) => {
      if (!userId) {
        return { error: 'Não autenticado.' }
      }

      const { error: deleteError } = await supabase.from('favorite_foods').delete().eq('id', id)

      if (deleteError) {
        return { error: deleteError.message }
      }

      setFavorites((current) => current.filter((favorite) => favorite.id !== id))
      return { error: null }
    },
    [userId]
  )

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, loading, error, addFavorite, removeFavorite }),
    [favorites, loading, error, addFavorite, removeFavorite]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
