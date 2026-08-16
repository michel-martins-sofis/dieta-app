import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, PenLine, Star } from 'lucide-react'
import {
  useFoodEntries,
  MEAL_LABELS,
  todayDateString,
  type FoodEntry,
  type FoodEntryInput,
  type MealType,
} from '../contexts/FoodEntriesContext'
import { useMealPlans } from '../contexts/MealPlansContext'
import { useFavorites, type Favorite } from '../contexts/FavoritesContext'
import { searchFoods, type FoodSearchResult } from '../lib/foodsApi'
import { scaleByGrams } from '../lib/foodPortion'

type Mode = 'search' | 'manual' | 'favorites'

const MODE_ICONS: Record<Mode, typeof Search> = {
  search: Search,
  manual: PenLine,
  favorites: Star,
}

const MODE_LABELS: Record<Mode, string> = {
  search: 'Buscar',
  manual: 'Manual',
  favorites: 'Favoritos',
}

export function AddFoodPage() {
  const { addEntry, updateEntry, fetchEntriesByDate } = useFoodEntries()
  const { addPlannedMeal } = useMealPlans()
  const { favorites, addFavorite } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const editId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null
  const isEditing = editId !== null
  const targetDate = searchParams.get('date') ?? todayDateString()
  const isFuturePlan = !isEditing && targetDate > todayDateString()

  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [mode, setMode] = useState<Mode>(isEditing ? 'manual' : 'search')
  const [error, setError] = useState<string | null>(null)
  const [loadingEntry, setLoadingEntry] = useState(isEditing)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [grams, setGrams] = useState('100')

  const [manualName, setManualName] = useState('')
  const [manualCalories, setManualCalories] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarb, setManualCarb] = useState('')
  const [manualFat, setManualFat] = useState('')
  const [saveAsFavorite, setSaveAsFavorite] = useState(false)

  useEffect(() => {
    if (!isEditing || editId === null) return

    function fillFrom(entry: FoodEntry) {
      setMealType(entry.mealType)
      setManualName(entry.name)
      setManualCalories(entry.caloriesKcal === null ? '' : String(entry.caloriesKcal))
      setManualProtein(entry.proteinG === null ? '' : String(entry.proteinG))
      setManualCarb(entry.carbG === null ? '' : String(entry.carbG))
      setManualFat(entry.fatG === null ? '' : String(entry.fatG))
      setLoadingEntry(false)
    }

    const stateEntry = (location.state as { entry?: FoodEntry } | null)?.entry
    if (stateEntry && stateEntry.id === editId) {
      fillFrom(stateEntry)
      return
    }

    let ignore = false
    setLoadingEntry(true)
    fetchEntriesByDate(targetDate).then(({ entries, error: fetchError }) => {
      if (ignore) return
      if (fetchError) {
        setError(fetchError)
        setLoadingEntry(false)
        return
      }
      const found = entries.find((entry) => entry.id === editId)
      if (found) {
        fillFrom(found)
      } else {
        setError('Registro não encontrado.')
        setLoadingEntry(false)
      }
    })
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editId, targetDate])

  async function submitEntry(input: FoodEntryInput) {
    if (isEditing && editId !== null) {
      return updateEntry(editId, input)
    }
    if (isFuturePlan) {
      return addPlannedMeal(input, targetDate)
    }
    return addEntry(input, targetDate)
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSearching(true)
    try {
      const found = await searchFoods(query)
      setResults(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao buscar alimentos.')
    } finally {
      setSearching(false)
    }
  }

  async function handleAddSearched(event: FormEvent) {
    event.preventDefault()
    if (!selectedFood) return
    setError(null)
    const parsedGrams = Number(grams)
    if (!parsedGrams || parsedGrams <= 0) {
      setError('Informe uma quantidade em gramas válida.')
      return
    }
    const scaled = scaleByGrams(
      {
        caloriesKcal: selectedFood.caloriesKcal ?? 0,
        proteinG: selectedFood.proteinG ?? 0,
        carbG: selectedFood.carbG ?? 0,
        fatG: selectedFood.fatG ?? 0,
      },
      parsedGrams
    )
    const { error: addError } = await submitEntry({
      mealType,
      name: `${selectedFood.name} (${parsedGrams}g)`,
      ...scaled,
    })
    if (addError) {
      setError(addError)
      return
    }
    navigate(`/diario?date=${targetDate}`)
  }

  async function handleManualSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const entry = {
      mealType,
      name: manualName,
      caloriesKcal: manualCalories === '' ? null : Number(manualCalories),
      proteinG: manualProtein === '' ? null : Number(manualProtein),
      carbG: manualCarb === '' ? null : Number(manualCarb),
      fatG: manualFat === '' ? null : Number(manualFat),
    }
    const { error: addError } = await submitEntry(entry)
    if (addError) {
      setError(addError)
      return
    }
    if (saveAsFavorite) {
      await addFavorite({
        name: entry.name,
        caloriesKcal: entry.caloriesKcal ?? 0,
        proteinG: entry.proteinG ?? 0,
        carbG: entry.carbG ?? 0,
        fatG: entry.fatG ?? 0,
      })
    }
    navigate(`/diario?date=${targetDate}`)
  }

  async function handleAddFavorite(favorite: Favorite) {
    setError(null)
    const { error: addError } = await submitEntry({
      mealType,
      name: favorite.name,
      caloriesKcal: favorite.caloriesKcal,
      proteinG: favorite.proteinG,
      carbG: favorite.carbG,
      fatG: favorite.fatG,
    })
    if (addError) {
      setError(addError)
      return
    }
    navigate(`/diario?date=${targetDate}`)
  }

  return (
    <div className="page-container">
      <Link to="/diario" className="back-link">
        ← Voltar
      </Link>

      <div className="section-card">
        <h1>{isEditing ? 'Editar alimento' : 'Adicionar alimento'}</h1>

        {isFuturePlan && <p className="footnote">Planejando refeição para {targetDate}.</p>}

        <div className="form-field">
          <label htmlFor="add-food-meal">Refeição</label>
          <select id="add-food-meal" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {Object.entries(MEAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {!isEditing && (
          <div className="tab-bar" role="tablist">
            {Object.entries(MODE_LABELS).map(([value, label]) => {
              const Icon = MODE_ICONS[value as Mode]
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  className={mode === value ? 'tab tab-active' : 'tab'}
                  onClick={() => setMode(value as Mode)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}

        {isEditing && loadingEntry ? (
          <p className="footnote">Carregando...</p>
        ) : (
          <>
        {mode === 'search' && (
          <section>
            <form onSubmit={handleSearch}>
              <label htmlFor="food-search-query">Nome do alimento</label>
              <input id="food-search-query" type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button type="submit" className="button button-secondary" disabled={searching}>
                {searching ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {results.length > 0 && (
              <ul className="result-list">
                {results.map((food) => (
                  <li key={food.id}>
                    <button type="button" className="result-item" onClick={() => setSelectedFood(food)}>
                      {food.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedFood && (
              <form onSubmit={handleAddSearched} className="inline-form">
                <p>{selectedFood.name}</p>
                <label htmlFor="food-grams">Quantidade (g)</label>
                <input
                  id="food-grams"
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  min={1}
                  required
                />
                <button type="submit" className="button button-primary">
                  Adicionar
                </button>
              </form>
            )}
          </section>
        )}

        {mode === 'manual' && (
          <section>
            <form onSubmit={handleManualSubmit}>
              <label htmlFor="manual-name">Nome</label>
              <input id="manual-name" type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} required />

              <label htmlFor="manual-calories">Calorias (kcal)</label>
              <input
                id="manual-calories"
                type="number"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                min={0}
              />

              <label htmlFor="manual-protein">Proteína (g)</label>
              <input id="manual-protein" type="number" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} min={0} />

              <label htmlFor="manual-carb">Carboidrato (g)</label>
              <input id="manual-carb" type="number" value={manualCarb} onChange={(e) => setManualCarb(e.target.value)} min={0} />

              <label htmlFor="manual-fat">Gordura (g)</label>
              <input id="manual-fat" type="number" value={manualFat} onChange={(e) => setManualFat(e.target.value)} min={0} />

              <label className="checkbox-label">
                <input type="checkbox" checked={saveAsFavorite} onChange={(e) => setSaveAsFavorite(e.target.checked)} />
                Salvar como favorito
              </label>

              <button type="submit" className="button button-primary">
                {isEditing ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </form>
          </section>
        )}

        {mode === 'favorites' && (
          <section>
            {favorites.length === 0 ? (
              <p className="footnote">Nenhum favorito salvo ainda.</p>
            ) : (
              <ul className="result-list">
                {favorites.map((favorite) => (
                  <li key={favorite.id}>
                    <button type="button" className="result-item" onClick={() => handleAddFavorite(favorite)}>
                      {favorite.name} — {favorite.caloriesKcal} kcal
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
          </>
        )}
      </div>
    </div>
  )
}
