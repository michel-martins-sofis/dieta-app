# Alimentos e Refeições Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usuário consegue registrar o que comeu ao longo do dia — buscando na base de alimentos TACO, digitando valores manualmente, ou reaproveitando um favorito — organizado por refeição (café da manhã/almoço/jantar/lanche). O Painel passa a mostrar quanto já foi consumido hoje comparado à meta diária (calorias e macros), com a lista de itens registrados e opção de remover.

**Architecture:** Mesma SPA React. Três tabelas novas no Supabase: `foods` (base TACO, dado global de referência, somente leitura para usuários autenticados), `food_entries` (registro diário por usuário, isolado por RLS) e `favorite_foods` (favoritos por usuário, isolado por RLS). Dois contextos novos (`FoodEntriesContext`, `FavoritesContext`) seguindo exatamente o padrão já validado de `AuthContext`/`ProfileContext` — incluindo a lição do Plano 2: gate no `loading` do `AuthContext` antes de decidir qualquer coisa, chaves de efeito por `user?.id`, erros de fetch nunca tratados silenciosamente como "vazio". Uma tela nova (`AddFoodPage`) reúne busca/entrada manual/favoritos. O Painel é estendido para mostrar consumido-vs-meta e a lista do dia.

**Tech Stack:** Mesmo do resto do projeto — React 19, TypeScript, Vite, react-router-dom, @supabase/supabase-js, Vitest + React Testing Library.

## Global Constraints

- Nível de detalhe nutricional: apenas calorias + macros (proteína, carboidrato, gordura) — sem micronutrientes (spec seção 2).
- Base de alimentos: tabela TACO (spec seção 3) — importada como dado semente, global, somente leitura para usuários autenticados (não é dado de usuário, não precisa de RLS por usuário, mas a tabela em si exige autenticação para ser lida).
- Entrada manual sempre disponível como alternativa à busca (spec seção 3).
- Favoritos para reuso rápido de itens repetidos (spec seção 3).
- Resumo do dia atual: calorias e macros consumidos vs. meta diária (spec seção 3) — sem histórico/gráficos ainda (isso é Fase 2, fora de escopo).
- Dados isolados por usuário via RLS obrigatória em toda tabela de usuário nova (`food_entries`, `favorite_foods`) — spec seção 6.
- Toda tabela/contexto novo deve seguir o padrão de robustez já estabelecido: gate em `authLoading`, chave de efeito em `userId` (não no objeto `user`), erro de fetch exposto (nunca convertido silenciosamente em "vazio"), `async/await` com `try/catch/finally` para chamadas Postgrest (nunca `.then/.catch/.finally` encadeado — Postgrest builders são `PromiseLike`, não `Promise`, isso já quebrou o build uma vez neste projeto).
- Estilo visual: usar as classes já existentes em `app/src/index.css` (`.page`, `.card`, `.card--wide`, `.button`, `.button-primary`, `.button-secondary`, `.alert`, `.notice`, `.footnote`, `.loading`, `.goal-grid`/`.goal-stat`, `.top-bar`) e estender esse arquivo com as classes novas necessárias (`.result-list`, `.result-item`, `.inline-form`, `.checkbox-label`, `.entry-list`, `.entry-item`, `.entry-meta`) em vez de inventar um sistema visual paralelo.
- App continua uso local nesta fase (sem deploy).

---

### Task 1 [MANUAL]: Criar as tabelas `foods`, `food_entries` e `favorite_foods` no Supabase

**Files:** nenhum arquivo de código — apenas SQL rodado no painel do Supabase.

**Interfaces:**
- Produces: tabela `public.foods` (semente TACO), `public.food_entries`, `public.favorite_foods` — usadas por toda a Task 3 em diante.

- [ ] **Passo 1 [MANUAL]: Rodar o SQL de `food_entries` e `favorite_foods` no Supabase**

  No painel do Supabase → **SQL Editor**, cole e rode:

  ```sql
  create table public.food_entries (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    logged_date date not null default current_date,
    meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
    name text not null,
    calories_kcal numeric not null,
    protein_g numeric not null default 0,
    carb_g numeric not null default 0,
    fat_g numeric not null default 0,
    created_at timestamptz not null default now()
  );

  alter table public.food_entries enable row level security;

  create policy "Users can view own food entries"
    on public.food_entries for select
    using (auth.uid() = user_id);

  create policy "Users can insert own food entries"
    on public.food_entries for insert
    with check (auth.uid() = user_id);

  create policy "Users can delete own food entries"
    on public.food_entries for delete
    using (auth.uid() = user_id);

  create table public.favorite_foods (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    calories_kcal numeric not null,
    protein_g numeric not null default 0,
    carb_g numeric not null default 0,
    fat_g numeric not null default 0,
    created_at timestamptz not null default now()
  );

  alter table public.favorite_foods enable row level security;

  create policy "Users can view own favorites"
    on public.favorite_foods for select
    using (auth.uid() = user_id);

  create policy "Users can insert own favorites"
    on public.favorite_foods for insert
    with check (auth.uid() = user_id);

  create policy "Users can delete own favorites"
    on public.favorite_foods for delete
    using (auth.uid() = user_id);
  ```

- [ ] **Passo 2 [MANUAL]: Rodar o SQL de importação da tabela `foods` (base TACO)**

  O arquivo `docs/sql/seed-foods-taco.sql` (gerado a partir da tabela TACO oficial, 596 alimentos) contém o `create table public.foods`, a política de RLS de leitura e o `insert` com todos os alimentos. Abra esse arquivo num editor de texto (não pelo terminal), selecione tudo, copie, cole no **SQL Editor** do Supabase e rode.

---

### Task 2: Módulos de apoio (`foodPortion.ts`, `foodsApi.ts`)

**Files:**
- Create: `app/src/lib/foodPortion.ts`
- Test: `app/src/lib/foodPortion.test.ts`
- Create: `app/src/lib/foodsApi.ts`
- Test: `app/src/lib/foodsApi.test.ts`

**Interfaces:**
- Produces: `scaleByGrams(per100g, grams)` — usado pela Task 5.
- Produces: `searchFoods(query)` retornando `FoodSearchResult[]` — usado pela Task 5.

- [ ] **Step 1: Escrever os testes de `foodPortion.ts` (devem falhar)**

Create: `app/src/lib/foodPortion.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { scaleByGrams } from './foodPortion'

describe('scaleByGrams', () => {
  it('scales per-100g nutrition to the given grams', () => {
    const result = scaleByGrams({ caloriesKcal: 200, proteinG: 10, carbG: 20, fatG: 5 }, 150)
    expect(result).toEqual({ caloriesKcal: 300, proteinG: 15, carbG: 30, fatG: 7.5 })
  })

  it('scales down for a small portion', () => {
    const result = scaleByGrams({ caloriesKcal: 123.5, proteinG: 2.6, carbG: 25.8, fatG: 1.0 }, 50)
    expect(result.caloriesKcal).toBe(62)
    expect(result.proteinG).toBe(1.3)
  })

  it('returns zero for zero grams', () => {
    const result = scaleByGrams({ caloriesKcal: 200, proteinG: 10, carbG: 20, fatG: 5 }, 0)
    expect(result).toEqual({ caloriesKcal: 0, proteinG: 0, carbG: 0, fatG: 0 })
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './foodPortion'`.

- [ ] **Step 3: Implementar `app/src/lib/foodPortion.ts`**

```ts
export interface PortionNutrition {
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

export function scaleByGrams(per100g: PortionNutrition, grams: number): PortionNutrition {
  const factor = grams / 100
  return {
    caloriesKcal: Math.round(per100g.caloriesKcal * factor),
    proteinG: Math.round(per100g.proteinG * factor * 10) / 10,
    carbG: Math.round(per100g.carbG * factor * 10) / 10,
    fatG: Math.round(per100g.fatG * factor * 10) / 10,
  }
}
```

- [ ] **Step 4: Rodar os testes de `foodPortion` e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `3 passed` neste arquivo.

- [ ] **Step 5: Escrever os testes de `foodsApi.ts` (devem falhar)**

Create: `app/src/lib/foodsApi.test.ts`
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchFoods } from './foodsApi'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockIlike = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildChain() {
  const chain = {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return chain
    },
    ilike: (...args: unknown[]) => {
      mockIlike(...args)
      return chain
    },
    order: (...args: unknown[]) => {
      mockOrder(...args)
      return chain
    },
    limit: (...args: unknown[]) => mockLimit(...args),
  }
  return chain
}

describe('searchFoods', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockLimit.mockReset()
  })

  it('returns an empty array without querying for a blank query', async () => {
    const results = await searchFoods('   ')
    expect(results).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('searches foods by name and maps rows to camelCase', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Arroz, integral, cozido',
          category: 'Cereais',
          calories_kcal: 124,
          protein_g: 2.6,
          carb_g: 25.8,
          fat_g: 1,
        },
      ],
      error: null,
    })

    const results = await searchFoods('arroz')

    expect(mockIlike).toHaveBeenCalledWith('name', '%arroz%')
    expect(results).toEqual([
      {
        id: 1,
        name: 'Arroz, integral, cozido',
        category: 'Cereais',
        caloriesKcal: 124,
        proteinG: 2.6,
        carbG: 25.8,
        fatG: 1,
      },
    ])
  })

  it('throws when the query fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'db error' } })
    await expect(searchFoods('arroz')).rejects.toThrow('db error')
  })
})
```

- [ ] **Step 6: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './foodsApi'`.

- [ ] **Step 7: Implementar `app/src/lib/foodsApi.ts`**

```ts
import { supabase } from './supabaseClient'

export interface FoodSearchResult {
  id: number
  name: string
  category: string | null
  caloriesKcal: number | null
  proteinG: number | null
  carbG: number | null
  fatG: number | null
}

interface FoodRow {
  id: number
  name: string
  category: string | null
  calories_kcal: number | null
  protein_g: number | null
  carb_g: number | null
  fat_g: number | null
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const { data, error } = await supabase
    .from('foods')
    .select('id, name, category, calories_kcal, protein_g, carb_g, fat_g')
    .ilike('name', `%${trimmed}%`)
    .order('name')
    .limit(20)

  if (error) {
    throw new Error(error.message)
  }

  return (data as FoodRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
  }))
}
```

- [ ] **Step 8: Rodar toda a suíte e confirmar que passa**

Run: `npm test` (dentro de `app/`)
Expected: todos os testes passam (6 novos testes neste arquivo/etapa).

- [ ] **Step 9: Commit**

```bash
git add app/src/lib/foodPortion.ts app/src/lib/foodPortion.test.ts app/src/lib/foodsApi.ts app/src/lib/foodsApi.test.ts
git commit -m "feat: add food portion scaling and food search helpers"
```

---

### Task 3: Contexto de refeições do dia (`FoodEntriesContext`)

**Files:**
- Create: `app/src/contexts/FoodEntriesContext.tsx`
- Test: `app/src/contexts/FoodEntriesContext.test.tsx`

**Interfaces:**
- Consumes: `supabase`; `useAuth()` (usa `user`, `loading`).
- Produces: `FoodEntriesProvider` e `useFoodEntries()` retornando `{ entries: FoodEntry[], loading: boolean, error: string | null, addEntry(input: FoodEntryInput): Promise<{error: string|null}>, removeEntry(id: number): Promise<{error: string|null}> }`. Tipo `MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'`. Usado pelas Tasks 5 e 6.

- [ ] **Step 1: Escrever os testes (devem falhar, o arquivo ainda não existe)**

Create: `app/src/contexts/FoodEntriesContext.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodEntriesProvider, useFoodEntries } from './FoodEntriesContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockSingle = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildSelectChain() {
  const chain = {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return chain
    },
    eq: (...args: unknown[]) => {
      mockEq(...args)
      return chain
    },
    order: (...args: unknown[]) => mockOrder(...args),
    insert: (...args: unknown[]) => {
      mockInsert(...args)
      return {
        select: (...selArgs: unknown[]) => {
          mockInsertSelect(...selArgs)
          return { single: () => mockSingle() }
        },
      }
    },
    delete: () => {
      mockDelete()
      return { eq: (...eqArgs: unknown[]) => mockDeleteEq(...eqArgs) }
    },
  }
  return chain
}

const ENTRY_ROW = {
  id: 1,
  meal_type: 'breakfast',
  name: 'Café com leite',
  calories_kcal: 120,
  protein_g: 6,
  carb_g: 12,
  fat_g: 4,
}

function TestConsumer() {
  const { entries, loading, addEntry, removeEntry } = useFoodEntries()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{entries.length}</span>
      <button
        onClick={() =>
          addEntry({
            mealType: 'lunch',
            name: 'Arroz e feijão',
            caloriesKcal: 400,
            proteinG: 15,
            carbG: 60,
            fatG: 5,
          })
        }
      >
        adicionar
      </button>
      {entries.map((entry) => (
        <button key={entry.id} onClick={() => removeEntry(entry.id)}>
          remover-{entry.id}
        </button>
      ))}
    </div>
  )
}

describe('FoodEntriesContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildSelectChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' }, loading: false })
    mockOrder.mockReset().mockResolvedValue({ data: [ENTRY_ROW], error: null })
    mockSingle.mockReset().mockResolvedValue({
      data: { id: 2, meal_type: 'lunch', name: 'Arroz e feijão', calories_kcal: 400, protein_g: 15, carb_g: 60, fat_g: 5 },
      error: null,
    })
    mockDeleteEq.mockReset().mockResolvedValue({ error: null })
  })

  it('loads today\'s entries for the current user', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('stays loading while auth is still resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('adds a new entry and appends it to state', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('adicionar'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', meal_type: 'lunch', calories_kcal: 400 })
    )
  })

  it('removes an entry from state', async () => {
    render(
      <FoodEntriesProvider>
        <TestConsumer />
      </FoodEntriesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('remover-1'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 1)
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './FoodEntriesContext'`.

- [ ] **Step 3: Implementar `app/src/contexts/FoodEntriesContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

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

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
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

  const value = useMemo<FoodEntriesContextValue>(
    () => ({ entries, loading, error, addEntry, removeEntry }),
    [entries, loading, error, addEntry, removeEntry]
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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `4 passed` neste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/contexts/FoodEntriesContext.tsx app/src/contexts/FoodEntriesContext.test.tsx
git commit -m "feat: add FoodEntriesContext for today's meal log"
```

---

### Task 4: Contexto de favoritos (`FavoritesContext`)

**Files:**
- Create: `app/src/contexts/FavoritesContext.tsx`
- Test: `app/src/contexts/FavoritesContext.test.tsx`

**Interfaces:**
- Consumes: `supabase`; `useAuth()`.
- Produces: `FavoritesProvider` e `useFavorites()` retornando `{ favorites: Favorite[], loading: boolean, error: string | null, addFavorite(input): Promise<{error}>, removeFavorite(id): Promise<{error}> }`. Usado pela Task 5.

- [ ] **Step 1: Escrever os testes (devem falhar)**

Create: `app/src/contexts/FavoritesContext.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FavoritesProvider, useFavorites } from './FavoritesContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockSingle = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function buildChain() {
  const chain = {
    select: (...args: unknown[]) => {
      mockSelect(...args)
      return chain
    },
    eq: (...args: unknown[]) => {
      mockEq(...args)
      return chain
    },
    order: (...args: unknown[]) => mockOrder(...args),
    insert: (...args: unknown[]) => {
      mockInsert(...args)
      return {
        select: (...selArgs: unknown[]) => {
          mockInsertSelect(...selArgs)
          return { single: () => mockSingle() }
        },
      }
    },
    delete: () => {
      mockDelete()
      return { eq: (...eqArgs: unknown[]) => mockDeleteEq(...eqArgs) }
    },
  }
  return chain
}

const FAVORITE_ROW = {
  id: 1,
  name: 'Vitamina de banana',
  calories_kcal: 250,
  protein_g: 8,
  carb_g: 40,
  fat_g: 5,
}

function TestConsumer() {
  const { favorites, loading, addFavorite, removeFavorite } = useFavorites()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{favorites.length}</span>
      <button
        onClick={() =>
          addFavorite({ name: 'Omelete', caloriesKcal: 300, proteinG: 20, carbG: 2, fatG: 22 })
        }
      >
        adicionar
      </button>
      {favorites.map((favorite) => (
        <button key={favorite.id} onClick={() => removeFavorite(favorite.id)}>
          remover-{favorite.id}
        </button>
      ))}
    </div>
  )
}

describe('FavoritesContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' }, loading: false })
    mockOrder.mockReset().mockResolvedValue({ data: [FAVORITE_ROW], error: null })
    mockSingle.mockReset().mockResolvedValue({
      data: { id: 2, name: 'Omelete', calories_kcal: 300, protein_g: 20, carb_g: 2, fat_g: 22 },
      error: null,
    })
    mockDeleteEq.mockReset().mockResolvedValue({ error: null })
  })

  it('loads favorites for the current user', async () => {
    render(
      <FavoritesProvider>
        <TestConsumer />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('adds a favorite and appends it to state', async () => {
    render(
      <FavoritesProvider>
        <TestConsumer />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('adicionar'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', name: 'Omelete' }))
  })

  it('removes a favorite from state', async () => {
    render(
      <FavoritesProvider>
        <TestConsumer />
      </FavoritesProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('remover-1'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 1)
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './FavoritesContext'`.

- [ ] **Step 3: Implementar `app/src/contexts/FavoritesContext.tsx`**

```tsx
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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `3 passed` neste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/contexts/FavoritesContext.tsx app/src/contexts/FavoritesContext.test.tsx
git commit -m "feat: add FavoritesContext for saved quick-add items"
```

---

### Task 5: Tela de adicionar alimento (`AddFoodPage`)

**Files:**
- Create: `app/src/pages/AddFoodPage.tsx`
- Test: `app/src/pages/AddFoodPage.test.tsx`
- Modify: `app/src/index.css` (adicionar `.result-list`, `.result-item`, `.inline-form`, `.checkbox-label`)

**Interfaces:**
- Consumes: `useFoodEntries()` (Task 3) — usa `addEntry`. Consumes `useFavorites()` (Task 4) — usa `favorites`, `addFavorite`. Consumes `searchFoods` (Task 2), `scaleByGrams` (Task 2).
- Produces: componente `AddFoodPage`, usado pela Task 6 na rota `/add-food`.

- [ ] **Step 1: Escrever os testes (devem falhar)**

Create: `app/src/pages/AddFoodPage.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AddFoodPage } from './AddFoodPage'

const mockAddEntry = vi.fn()
const mockAddFavorite = vi.fn()
const mockUseFoodEntries = vi.fn()
const mockUseFavorites = vi.fn()
const mockSearchFoods = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/FoodEntriesContext', () => ({
  useFoodEntries: () => mockUseFoodEntries(),
}))

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => mockUseFavorites(),
}))

vi.mock('../lib/foodsApi', () => ({
  searchFoods: (...args: unknown[]) => mockSearchFoods(...args),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('AddFoodPage', () => {
  beforeEach(() => {
    mockAddEntry.mockReset()
    mockAddFavorite.mockReset()
    mockSearchFoods.mockReset()
    mockNavigate.mockReset()
    mockUseFoodEntries.mockReset().mockReturnValue({ addEntry: mockAddEntry })
    mockUseFavorites.mockReset().mockReturnValue({ favorites: [], addFavorite: mockAddFavorite })
  })

  it('searches for a food, scales it by grams, and adds it to the selected meal', async () => {
    mockSearchFoods.mockResolvedValue([
      { id: 1, name: 'Arroz, integral, cozido', category: 'Cereais', caloriesKcal: 124, proteinG: 2.6, carbG: 25.8, fatG: 1 },
    ])
    mockAddEntry.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <AddFoodPage />
      </MemoryRouter>
    )

    await userEvent.type(screen.getByLabelText('Nome do alimento'), 'arroz')
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }))
    await userEvent.click(await screen.findByText('Arroz, integral, cozido'))
    await userEvent.clear(screen.getByLabelText('Quantidade (g)'))
    await userEvent.type(screen.getByLabelText('Quantidade (g)'), '200')
    await userEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))

    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        mealType: 'breakfast',
        caloriesKcal: 248,
        proteinG: 5.2,
      })
    )
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('adds a manual entry and optionally saves it as a favorite', async () => {
    mockAddEntry.mockResolvedValue({ error: null })
    mockAddFavorite.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <AddFoodPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Manual' }))
    await userEvent.type(screen.getByLabelText('Nome'), 'Omelete')
    await userEvent.type(screen.getByLabelText('Calorias (kcal)'), '300')
    await userEvent.type(screen.getByLabelText('Proteína (g)'), '20')
    await userEvent.click(screen.getByLabelText(/salvar como favorito/i))
    await userEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))

    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Omelete', caloriesKcal: 300, proteinG: 20 })
    )
    expect(mockAddFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Omelete', caloriesKcal: 300, proteinG: 20 })
    )
  })

  it('adds an entry directly from a saved favorite', async () => {
    mockUseFavorites.mockReturnValue({
      favorites: [{ id: 1, name: 'Vitamina de banana', caloriesKcal: 250, proteinG: 8, carbG: 40, fatG: 5 }],
      addFavorite: mockAddFavorite,
    })
    mockAddEntry.mockResolvedValue({ error: null })

    render(
      <MemoryRouter>
        <AddFoodPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Favoritos' }))
    await userEvent.click(screen.getByText(/Vitamina de banana/))

    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Vitamina de banana', caloriesKcal: 250 })
    )
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })
})
```

Nota: a tela usa um menu de abas (**Buscar / Manual / Favoritos**) — só uma seção fica visível por vez (mais simples que mostrar as três empilhadas), por isso os testes de "Manual" e "Favoritos" clicam na aba correspondente antes de interagir com os campos daquela seção.

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './AddFoodPage'`.

- [ ] **Step 3: Implementar `app/src/pages/AddFoodPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoodEntries, type MealType } from '../contexts/FoodEntriesContext'
import { useFavorites, type Favorite } from '../contexts/FavoritesContext'
import { searchFoods, type FoodSearchResult } from '../lib/foodsApi'
import { scaleByGrams } from '../lib/foodPortion'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

type Mode = 'search' | 'manual' | 'favorites'

const MODE_LABELS: Record<Mode, string> = {
  search: 'Buscar',
  manual: 'Manual',
  favorites: 'Favoritos',
}

export function AddFoodPage() {
  const { addEntry } = useFoodEntries()
  const { favorites, addFavorite } = useFavorites()
  const navigate = useNavigate()

  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [mode, setMode] = useState<Mode>('search')
  const [error, setError] = useState<string | null>(null)

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
    const { error: addError } = await addEntry({
      mealType,
      name: `${selectedFood.name} (${parsedGrams}g)`,
      ...scaled,
    })
    if (addError) {
      setError(addError)
      return
    }
    navigate('/dashboard')
  }

  async function handleManualSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const entry = {
      mealType,
      name: manualName,
      caloriesKcal: Number(manualCalories),
      proteinG: Number(manualProtein) || 0,
      carbG: Number(manualCarb) || 0,
      fatG: Number(manualFat) || 0,
    }
    const { error: addError } = await addEntry(entry)
    if (addError) {
      setError(addError)
      return
    }
    if (saveAsFavorite) {
      await addFavorite(entry)
    }
    navigate('/dashboard')
  }

  async function handleAddFavorite(favorite: Favorite) {
    setError(null)
    const { error: addError } = await addEntry({
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
    navigate('/dashboard')
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Adicionar alimento</h1>

        <label htmlFor="add-food-meal">Refeição</label>
        <select id="add-food-meal" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
          {Object.entries(MEAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <div className="tab-bar" role="tablist">
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={mode === value ? 'tab tab-active' : 'tab'}
              onClick={() => setMode(value as Mode)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}

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
                required
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
                Adicionar
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
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Adicionar em `app/src/index.css`** (ao final do arquivo):

```css
.tab-bar {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0 0.25rem;
  border-bottom: 1px solid var(--color-border);
}

.tab {
  font: inherit;
  font-weight: 600;
  padding: 0.5rem 0.1rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.tab-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.result-list {
  list-style: none;
  margin: 0.75rem 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.result-item {
  width: 100%;
  text-align: left;
  font: inherit;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.result-item:hover {
  border-color: var(--color-primary);
}

.inline-form {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.85rem;
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--color-text);
}

.checkbox-label input {
  margin: 0;
  width: auto;
}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `3 passed` neste arquivo.

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/AddFoodPage.tsx app/src/pages/AddFoodPage.test.tsx app/src/index.css
git commit -m "feat: add AddFoodPage with search, manual entry and favorites"
```

---

### Task 6: Painel mostra consumido-vs-meta e ligação final

**Files:**
- Modify: `app/src/pages/DashboardPage.tsx`
- Modify: `app/src/pages/DashboardPage.test.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/index.css` (adicionar `.entry-list`, `.entry-item`, `.entry-meta`)

**Interfaces:**
- Consumes: `FoodEntriesProvider`/`useFoodEntries()` (Task 3), `FavoritesProvider` (Task 4), `AddFoodPage` (Task 5).
- Produces: app com `/add-food` roteado; Painel mostrando totais do dia vs. meta e lista de itens registrados.

- [ ] **Step 1: Atualizar `app/src/pages/DashboardPage.test.tsx`** — substituir todo o conteúdo por:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

const mockSignOut = vi.fn()
const mockRemoveEntry = vi.fn()
const mockUseAuth = vi.fn()
const mockUseProfile = vi.fn()
const mockUseFoodEntries = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

vi.mock('../contexts/FoodEntriesContext', () => ({
  useFoodEntries: () => mockUseFoodEntries(),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    mockSignOut.mockReset()
    mockRemoveEntry.mockReset()
    mockUseAuth.mockReset().mockReturnValue({ user: { email: 'a@b.com' }, signOut: mockSignOut })
    mockUseProfile.mockReset().mockReturnValue({
      profile: { dailyCaloriesTarget: 2500, dailyProteinG: 130, dailyCarbG: 300, dailyFatG: 70 },
    })
    mockUseFoodEntries.mockReset().mockReturnValue({ entries: [], removeEntry: mockRemoveEntry })
  })

  it('shows the daily target', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/2500 kcal/)).toBeInTheDocument()
  })

  it('does not show a target section when there is no profile', () => {
    mockUseProfile.mockReturnValue({ profile: null })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.queryByText(/consumido vs/i)).not.toBeInTheDocument()
  })

  it('shows today\'s food entries with consumed totals', () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [
        { id: 1, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 },
        { id: 2, mealType: 'lunch', name: 'Arroz e feijão', caloriesKcal: 400, proteinG: 15, carbG: 60, fatG: 5 },
      ],
      removeEntry: mockRemoveEntry,
    })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Café com leite')).toBeInTheDocument()
    expect(screen.getByText('Arroz e feijão')).toBeInTheDocument()
    expect(screen.getByText(/520.*2500 kcal/)).toBeInTheDocument()
  })

  it('shows a message when there are no entries yet', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/nenhum alimento registrado/i)).toBeInTheDocument()
  })

  it('removes an entry when Remover is clicked', async () => {
    mockUseFoodEntries.mockReturnValue({
      entries: [{ id: 1, mealType: 'breakfast', name: 'Café com leite', caloriesKcal: 120, proteinG: 6, carbG: 12, fatG: 4 }],
      removeEntry: mockRemoveEntry,
    })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: /remover/i }))
    expect(mockRemoveEntry).toHaveBeenCalledWith(1)
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — o `DashboardPage` atual não usa `useFoodEntries` nem mostra totais consumidos.

- [ ] **Step 3: Atualizar `app/src/pages/DashboardPage.tsx`** — substituir todo o conteúdo por:

```tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { useFoodEntries, type MealType } from '../contexts/FoodEntriesContext'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
}

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const { entries, removeEntry } = useFoodEntries()

  const totals = entries.reduce(
    (acc, entry) => ({
      caloriesKcal: acc.caloriesKcal + entry.caloriesKcal,
      proteinG: acc.proteinG + entry.proteinG,
      carbG: acc.carbG + entry.carbG,
      fatG: acc.fatG + entry.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbG: 0, fatG: 0 }
  )

  return (
    <div className="page">
      <div className="card card--wide">
        <div className="top-bar">
          <h1>Painel</h1>
          <button className="button button-secondary" onClick={() => signOut()}>
            Sair
          </button>
        </div>
        <p>Logado como: {user?.email}</p>

        {profile && (
          <div>
            <h2>Hoje: consumido vs. meta</h2>
            <div className="goal-grid">
              <div className="goal-stat">
                <strong>
                  {totals.caloriesKcal} / {profile.dailyCaloriesTarget} kcal
                </strong>
                <span>Calorias</span>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.proteinG} / {profile.dailyProteinG} g
                </strong>
                <span>Proteína</span>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.carbG} / {profile.dailyCarbG} g
                </strong>
                <span>Carboidrato</span>
              </div>
              <div className="goal-stat">
                <strong>
                  {totals.fatG} / {profile.dailyFatG} g
                </strong>
                <span>Gordura</span>
              </div>
            </div>
          </div>
        )}

        <div className="top-bar">
          <h2>Refeições de hoje</h2>
          <Link to="/add-food" className="button button-primary">
            Adicionar alimento
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="footnote">Nenhum alimento registrado ainda hoje.</p>
        ) : (
          <ul className="entry-list">
            {entries.map((entry) => (
              <li key={entry.id} className="entry-item">
                <div>
                  <strong>{entry.name}</strong>
                  <span className="entry-meta">
                    {MEAL_LABELS[entry.mealType]} · {entry.caloriesKcal} kcal
                  </span>
                </div>
                <button type="button" className="button button-secondary" onClick={() => removeEntry(entry.id)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="footnote">
          <Link to="/profile">Editar perfil</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar os testes de `DashboardPage` e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `5 passed` neste arquivo.

- [ ] **Step 5: Atualizar `app/src/App.tsx`** — substituir todo o conteúdo por:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { FoodEntriesProvider } from './contexts/FoodEntriesContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { RequireProfile } from './components/RequireProfile'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { AddFoodPage } from './pages/AddFoodPage'

export function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <FoodEntriesProvider>
          <FavoritesProvider>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/signup"
                  element={
                    <PublicOnlyRoute>
                      <SignupPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/add-food"
                  element={
                    <ProtectedRoute>
                      <AddFoodPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <RequireProfile>
                        <DashboardPage />
                      </RequireProfile>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </FavoritesProvider>
        </FoodEntriesProvider>
      </ProfileProvider>
    </AuthProvider>
  )
}
```

- [ ] **Step 6: Adicionar em `app/src/index.css`** (ao final do arquivo):

```css
.entry-list {
  list-style: none;
  margin: 0.75rem 0 1.25rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.entry-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
}

.entry-item strong {
  display: block;
}

.entry-meta {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
```

- [ ] **Step 7: Rodar toda a suíte de testes**

Run: `npm test` (dentro de `app/`)
Expected: todos os testes passam (soma de todos os planos anteriores + este).

- [ ] **Step 8: Commit**

```bash
git add app/src/App.tsx app/src/pages/DashboardPage.tsx app/src/pages/DashboardPage.test.tsx app/src/index.css
git commit -m "feat: show consumed-vs-target totals and today's entries on the dashboard"
```

- [ ] **Step 9 [MANUAL]: Teste de ponta a ponta no navegador**

  1. Rode `npm run dev` (dentro de `app/`) e abra a URL mostrada.
  2. No Painel, clique em **"Adicionar alimento"**.
  3. Escolha a refeição, digite um nome de alimento brasileiro (ex: "arroz", "banana", "feijão") em **"Buscar na base de alimentos"**, clique em Buscar, escolha um resultado, informe a quantidade em gramas e clique em Adicionar.
  4. Você deve voltar ao Painel e ver o item na lista de "Refeições de hoje", com os totais de calorias/macros atualizados.
  5. Volte a **"Adicionar alimento"**, use a **Entrada manual** para adicionar algo digitado à mão, marcando "Salvar como favorito".
  6. Volte de novo a **"Adicionar alimento"** e confirme que esse item aparece na seção **Favoritos** — clique nele e confirme que foi adicionado direto, sem precisar preencher nada.
  7. No Painel, clique em **"Remover"** em algum item e confirme que ele sai da lista e os totais são recalculados.
  8. Me avise como foi.

---

## Fora de escopo deste plano (fica para planos futuros)

- Registro de peso corporal (Plano seguinte).
- Leitura de código de barras, Open Food Facts, consumo de água, histórico/gráficos, relatórios (Fase 2 — spec seção 4).
