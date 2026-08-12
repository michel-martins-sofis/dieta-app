# Perfil e Metas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo usuário autenticado preenche um perfil (idade, peso, altura, sexo, nível de atividade, objetivo); o app calcula automaticamente uma meta diária sugerida de calorias e macros (protéina/carboidrato/gordura), que o usuário pode sobrescrever manualmente. O Painel passa a mostrar essa meta. Sem perfil, o usuário é redirecionado para completá-lo antes de ver o Painel.

**Architecture:** Mesma SPA React já existente. Nova tabela `profiles` no Supabase (1:1 com `auth.users`, RLS por usuário). Um módulo puro (`nutritionGoals.ts`, sem dependências externas) calcula a meta sugerida — testável isoladamente. Um `ProfileContext` (mesmo padrão do `AuthContext`) busca/salva o perfil do usuário atual. Um `RequireProfile` (mesmo padrão do `ProtectedRoute`/`PublicOnlyRoute`) redireciona para `/profile` quando não há perfil ainda — puramente declarativo, sem `navigate()` imperativo, seguindo a lição do Plano 1.

**Tech Stack:** Mesmo do Plano 1 — React 19, TypeScript, Vite, react-router-dom, @supabase/supabase-js, Vitest + React Testing Library.

## Global Constraints

- Fórmula de meta calórica: Mifflin-St Jeor (BMR) × fator de atividade (TDEE), com ajuste por objetivo. Estas são as fórmulas **travadas** por este plano (eram uma decisão em aberto da especificação):
  - BMR homem = 10×peso(kg) + 6.25×altura(cm) − 5×idade + 5
  - BMR mulher = 10×peso(kg) + 6.25×altura(cm) − 5×idade − 161
  - Fator de atividade: sedentário 1.2, leve 1.375, moderado 1.55, ativo 1.725, muito ativo 1.9
  - Ajuste calórico por objetivo: perda de peso −500 kcal/dia (piso de segurança 1200 kcal), ganho de massa +300 kcal/dia, manutenção sem ajuste
  - Proteína: 2.0 g/kg (perda de peso), 1.8 g/kg (ganho de massa), 1.6 g/kg (manutenção)
  - Gordura: 25% das calorias totais ÷ 9
  - Carboidrato: calorias restantes ÷ 4
- Metas são sempre editáveis manualmente pelo usuário (spec seção 2) — o cálculo automático preenche os campos, mas nunca bloqueia edição.
- Nível de detalhe nutricional: apenas calorias + macros (spec seção 2) — sem micronutrientes.
- Dados isolados por usuário via RLS obrigatória em toda tabela nova (spec seção 6).
- App continua uso local nesta fase (sem deploy).

---

### Task 1 [MANUAL]: Criar a tabela `profiles` no Supabase

**Files:** nenhum arquivo de código — apenas SQL rodado no painel do Supabase.

**Interfaces:**
- Produces: tabela `public.profiles` com as colunas usadas por toda a Task 3 em diante.

- [ ] **Passo 1 [MANUAL]: Rodar o SQL no Supabase**

  1. No painel do Supabase, vá em **SQL Editor** (barra lateral).
  2. Cole e rode o SQL abaixo:

  ```sql
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    age integer not null,
    weight_kg numeric not null,
    height_cm numeric not null,
    sex text not null check (sex in ('male', 'female')),
    activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
    goal text not null check (goal in ('lose_weight', 'gain_muscle', 'maintain')),
    daily_calories_target integer not null,
    daily_protein_g integer not null,
    daily_carb_g integer not null,
    daily_fat_g integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  alter table public.profiles enable row level security;

  create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

  create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

  create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);
  ```

  3. Confirme que rodou sem erro (mensagem de sucesso no painel).

---

### Task 2: Módulo de cálculo (`nutritionGoals.ts`)

**Files:**
- Create: `app/src/lib/nutritionGoals.ts`
- Test: `app/src/lib/nutritionGoals.test.ts`

**Interfaces:**
- Produces: `calculateBmr`, `calculateNutritionGoals`, e os tipos `Sex`, `ActivityLevel`, `Goal`, `NutritionInput`, `NutritionGoals` — usados pelas Tasks 3 e 5.

- [ ] **Step 1: Escrever os testes (devem falhar, o arquivo ainda não existe)**

Create: `app/src/lib/nutritionGoals.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { calculateBmr, calculateNutritionGoals } from './nutritionGoals'

describe('calculateBmr', () => {
  it('calculates BMR for a male using Mifflin-St Jeor', () => {
    const bmr = calculateBmr({ age: 30, weightKg: 80, heightCm: 180, sex: 'male' })
    expect(bmr).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 30 + 5, 5)
  })

  it('calculates BMR for a female using Mifflin-St Jeor', () => {
    const bmr = calculateBmr({ age: 30, weightKg: 65, heightCm: 165, sex: 'female' })
    expect(bmr).toBeCloseTo(10 * 65 + 6.25 * 165 - 5 * 30 - 161, 5)
  })
})

describe('calculateNutritionGoals', () => {
  it('applies a calorie deficit and higher protein for weight loss', () => {
    const goals = calculateNutritionGoals({
      age: 30,
      weightKg: 80,
      heightCm: 180,
      sex: 'male',
      activityLevel: 'sedentary',
      goal: 'lose_weight',
    })
    const bmr = 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    const tdee = bmr * 1.2
    expect(goals.calories).toBe(Math.round(tdee - 500))
    expect(goals.proteinG).toBe(Math.round(2.0 * 80))
  })

  it('applies a calorie surplus and moderate protein for muscle gain', () => {
    const goals = calculateNutritionGoals({
      age: 25,
      weightKg: 70,
      heightCm: 175,
      sex: 'male',
      activityLevel: 'moderate',
      goal: 'gain_muscle',
    })
    const bmr = 10 * 70 + 6.25 * 175 - 5 * 25 + 5
    const tdee = bmr * 1.55
    expect(goals.calories).toBe(Math.round(tdee + 300))
    expect(goals.proteinG).toBe(Math.round(1.8 * 70))
  })

  it('keeps calories at TDEE with no adjustment for maintenance', () => {
    const goals = calculateNutritionGoals({
      age: 40,
      weightKg: 60,
      heightCm: 160,
      sex: 'female',
      activityLevel: 'light',
      goal: 'maintain',
    })
    const bmr = 10 * 60 + 6.25 * 160 - 5 * 40 - 161
    const tdee = bmr * 1.375
    expect(goals.calories).toBe(Math.round(tdee))
    expect(goals.proteinG).toBe(Math.round(1.6 * 60))
  })

  it('never returns fewer than 1200 calories even with an aggressive deficit', () => {
    const goals = calculateNutritionGoals({
      age: 60,
      weightKg: 45,
      heightCm: 150,
      sex: 'female',
      activityLevel: 'sedentary',
      goal: 'lose_weight',
    })
    expect(goals.calories).toBeGreaterThanOrEqual(1200)
  })

  it('splits remaining calories into carbs after protein and fat are allocated', () => {
    const goals = calculateNutritionGoals({
      age: 30,
      weightKg: 80,
      heightCm: 180,
      sex: 'male',
      activityLevel: 'sedentary',
      goal: 'maintain',
    })
    const proteinCalories = goals.proteinG * 4
    const fatCalories = goals.fatG * 9
    const carbCalories = goals.carbG * 4
    expect(proteinCalories + fatCalories + carbCalories).toBeCloseTo(goals.calories, -1)
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './nutritionGoals'`.

- [ ] **Step 3: Implementar `app/src/lib/nutritionGoals.ts`**

```ts
export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose_weight' | 'gain_muscle' | 'maintain'

export interface NutritionInput {
  age: number
  weightKg: number
  heightCm: number
  sex: Sex
  activityLevel: ActivityLevel
  goal: Goal
}

export interface NutritionGoals {
  calories: number
  proteinG: number
  carbG: number
  fatG: number
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  lose_weight: -500,
  gain_muscle: 300,
  maintain: 0,
}

const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  lose_weight: 2.0,
  gain_muscle: 1.8,
  maintain: 1.6,
}

const FAT_CALORIE_FRACTION = 0.25
const MIN_CALORIES = 1200

export function calculateBmr(input: Pick<NutritionInput, 'age' | 'weightKg' | 'heightCm' | 'sex'>): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age
  return input.sex === 'male' ? base + 5 : base - 161
}

export function calculateNutritionGoals(input: NutritionInput): NutritionGoals {
  const bmr = calculateBmr(input)
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]
  const adjustedCalories = tdee + GOAL_CALORIE_ADJUSTMENT[input.goal]
  const calories = Math.max(MIN_CALORIES, Math.round(adjustedCalories))

  const proteinG = Math.round(GOAL_PROTEIN_PER_KG[input.goal] * input.weightKg)
  const fatCalories = calories * FAT_CALORIE_FRACTION
  const fatG = Math.round(fatCalories / 9)
  const proteinCalories = proteinG * 4
  const remainingCalories = Math.max(0, calories - proteinCalories - fatCalories)
  const carbG = Math.round(remainingCalories / 4)

  return { calories, proteinG, carbG, fatG }
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `8 passed` (6 testes deste arquivo + os 2 preexistentes de `AuthContext` que já passavam antes — na verdade rode a suíte completa e confirme que o total sobe em 6 em relação ao anterior).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/nutritionGoals.ts app/src/lib/nutritionGoals.test.ts
git commit -m "feat: add nutrition goal calculation (Mifflin-St Jeor)"
```

---

### Task 3: Contexto de perfil (`ProfileContext`)

**Files:**
- Create: `app/src/contexts/ProfileContext.tsx`
- Test: `app/src/contexts/ProfileContext.test.tsx`

**Interfaces:**
- Consumes: `supabase` de `app/src/lib/supabaseClient.ts`; `useAuth()` de `app/src/contexts/AuthContext.tsx` (usa `user`).
- Produces: `ProfileProvider` e `useProfile()` retornando `{ profile: Profile | null, loading: boolean, saveProfile(input: ProfileInput): Promise<{error: string|null}> }`. `Profile`/`ProfileInput` usados pelas Tasks 4, 5 e 6.

- [ ] **Step 1: Escrever os testes (devem falhar, o arquivo ainda não existe)**

Create: `app/src/contexts/ProfileContext.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileProvider, useProfile } from './ProfileContext'

const mockUseAuth = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()
const mockSingle = vi.fn()

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
    upsert: (...args: unknown[]) => {
      mockUpsert(...args)
      return chain
    },
    maybeSingle: () => mockMaybeSingle(),
    single: () => mockSingle(),
  }
  return chain
}

const PROFILE_ROW = {
  id: 'user-1',
  age: 30,
  weight_kg: 80,
  height_cm: 180,
  sex: 'male',
  activity_level: 'moderate',
  goal: 'maintain',
  daily_calories_target: 2500,
  daily_protein_g: 130,
  daily_carb_g: 300,
  daily_fat_g: 70,
}

function TestConsumer() {
  const { profile, loading, saveProfile } = useProfile()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="calories">{profile ? profile.dailyCaloriesTarget : 'none'}</span>
      <button
        onClick={() =>
          saveProfile({
            age: 31,
            weightKg: 81,
            heightCm: 180,
            sex: 'male',
            activityLevel: 'moderate',
            goal: 'maintain',
            dailyCaloriesTarget: 2600,
            dailyProteinG: 130,
            dailyCarbG: 310,
            dailyFatG: 72,
          })
        }
      >
        salvar
      </button>
    </div>
  )
}

describe('ProfileContext', () => {
  beforeEach(() => {
    mockFrom.mockReset().mockImplementation(() => buildChain())
    mockUseAuth.mockReset().mockReturnValue({ user: { id: 'user-1' } })
    mockMaybeSingle.mockReset().mockResolvedValue({ data: PROFILE_ROW, error: null })
    mockSingle.mockReset().mockResolvedValue({ data: { ...PROFILE_ROW, daily_calories_target: 2600 }, error: null })
  })

  it('loads the existing profile for the current user', async () => {
    render(
      <ProfileProvider>
        <TestConsumer />
      </ProfileProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('calories').textContent).toBe('2500')
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('has no profile and stops loading when there is no user', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    render(
      <ProfileProvider>
        <TestConsumer />
      </ProfileProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('calories').textContent).toBe('none')
  })

  it('saves the profile via upsert and updates state', async () => {
    render(
      <ProfileProvider>
        <TestConsumer />
      </ProfileProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('salvar'))
    await waitFor(() => expect(screen.getByTestId('calories').textContent).toBe('2600'))
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', daily_calories_target: 2600 })
    )
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './ProfileContext'`.

- [ ] **Step 3: Implementar `app/src/contexts/ProfileContext.tsx`**

```tsx
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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `3 passed` neste arquivo (suíte completa deve subir em 3 no total).

- [ ] **Step 5: Commit**

```bash
git add app/src/contexts/ProfileContext.tsx app/src/contexts/ProfileContext.test.tsx
git commit -m "feat: add ProfileContext for fetching and saving user profile"
```

---

### Task 4: Rota que exige perfil (`RequireProfile`)

**Files:**
- Create: `app/src/components/RequireProfile.tsx`
- Test: `app/src/components/RequireProfile.test.tsx`

**Interfaces:**
- Consumes: `useProfile()` de `app/src/contexts/ProfileContext.tsx` (Task 3) — usa `profile` e `loading`.
- Produces: componente `RequireProfile`, usado pela Task 6 para proteger `/dashboard`.

- [ ] **Step 1: Escrever os testes (devem falhar)**

Create: `app/src/components/RequireProfile.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireProfile } from './RequireProfile'

const mockUseProfile = vi.fn()

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/profile" element={<p>completar perfil</p>} />
        <Route
          path="/dashboard"
          element={
            <RequireProfile>
              <p>painel</p>
            </RequireProfile>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireProfile', () => {
  beforeEach(() => {
    mockUseProfile.mockReset()
  })

  it('shows a loading message while the profile is resolving', () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: true })
    renderWithRoute()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('redirects to /profile when there is no profile yet', () => {
    mockUseProfile.mockReturnValue({ profile: null, loading: false })
    renderWithRoute()
    expect(screen.getByText('completar perfil')).toBeInTheDocument()
  })

  it('renders children when a profile exists', () => {
    mockUseProfile.mockReturnValue({ profile: { dailyCaloriesTarget: 2000 }, loading: false })
    renderWithRoute()
    expect(screen.getByText('painel')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './RequireProfile'`.

- [ ] **Step 3: Implementar `app/src/components/RequireProfile.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'

export function RequireProfile({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile()

  if (loading) {
    return <p>Carregando...</p>
  }

  if (!profile) {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `3 passed` neste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/RequireProfile.tsx app/src/components/RequireProfile.test.tsx
git commit -m "feat: add RequireProfile route guard"
```

---

### Task 5: Tela de perfil (`ProfilePage`)

**Files:**
- Create: `app/src/pages/ProfilePage.tsx`
- Test: `app/src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: `useProfile()` de `app/src/contexts/ProfileContext.tsx` (Task 3) — usa `profile` e `saveProfile`. Consumes `calculateNutritionGoals` de `app/src/lib/nutritionGoals.ts` (Task 2).
- Produces: componente `ProfilePage`, usado pela Task 6 na rota `/profile`.

- [ ] **Step 1: Escrever os testes (devem falhar)**

Create: `app/src/pages/ProfilePage.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from './ProfilePage'

const mockSaveProfile = vi.fn()
const mockUseProfile = vi.fn()

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

describe('ProfilePage', () => {
  beforeEach(() => {
    mockSaveProfile.mockReset()
    mockUseProfile.mockReset().mockReturnValue({ profile: null, saveProfile: mockSaveProfile })
  })

  it('calculates suggested targets from the entered profile data', async () => {
    render(<ProfilePage />)
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.selectOptions(screen.getByLabelText('Sexo biológico'), 'male')
    await userEvent.selectOptions(screen.getByLabelText('Nível de atividade física'), 'sedentary')
    await userEvent.selectOptions(screen.getByLabelText('Objetivo'), 'maintain')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))

    const bmr = 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    const expectedCalories = Math.round(bmr * 1.2)
    expect(screen.getByLabelText('Calorias (kcal/dia)')).toHaveValue(expectedCalories)
    expect(screen.getByLabelText('Proteína (g/dia)')).toHaveValue(Math.round(1.6 * 80))
  })

  it('saves the profile with the entered and calculated values', async () => {
    mockSaveProfile.mockResolvedValue({ error: null })
    render(<ProfilePage />)
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))

    expect(mockSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ age: 30, weightKg: 80, heightCm: 180 })
    )
  })

  it('shows an error message when saving fails', async () => {
    mockSaveProfile.mockResolvedValue({ error: 'Falha ao salvar' })
    render(<ProfilePage />)
    await userEvent.type(screen.getByLabelText('Idade'), '30')
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '80')
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '180')
    await userEvent.click(screen.getByRole('button', { name: /calcular meta sugerida/i }))
    await userEvent.click(screen.getByRole('button', { name: /salvar perfil/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar')
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './ProfilePage'`.

- [ ] **Step 3: Implementar `app/src/pages/ProfilePage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { calculateNutritionGoals, type ActivityLevel, type Goal, type Sex } from '../lib/nutritionGoals'

export function ProfilePage() {
  const { profile, saveProfile } = useProfile()
  const [age, setAge] = useState(profile ? String(profile.age) : '')
  const [weightKg, setWeightKg] = useState(profile ? String(profile.weightKg) : '')
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : '')
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'female')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel ?? 'sedentary')
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain')
  const [calories, setCalories] = useState(profile ? String(profile.dailyCaloriesTarget) : '')
  const [proteinG, setProteinG] = useState(profile ? String(profile.dailyProteinG) : '')
  const [carbG, setCarbG] = useState(profile ? String(profile.dailyCarbG) : '')
  const [fatG, setFatG] = useState(profile ? String(profile.dailyFatG) : '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleCalculate() {
    const parsedAge = Number(age)
    const parsedWeight = Number(weightKg)
    const parsedHeight = Number(heightCm)
    if (!parsedAge || !parsedWeight || !parsedHeight) {
      setError('Preencha idade, peso e altura antes de calcular.')
      return
    }
    setError(null)
    const goals = calculateNutritionGoals({
      age: parsedAge,
      weightKg: parsedWeight,
      heightCm: parsedHeight,
      sex,
      activityLevel,
      goal,
    })
    setCalories(String(goals.calories))
    setProteinG(String(goals.proteinG))
    setCarbG(String(goals.carbG))
    setFatG(String(goals.fatG))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: saveError } = await saveProfile({
      age: Number(age),
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      sex,
      activityLevel,
      goal,
      dailyCaloriesTarget: Number(calories),
      dailyProteinG: Number(proteinG),
      dailyCarbG: Number(carbG),
      dailyFatG: Number(fatG),
    })
    setSubmitting(false)
    if (saveError) {
      setError(saveError)
    }
  }

  return (
    <div>
      <h1>Seu perfil</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="profile-age">Idade</label>
        <input id="profile-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} required min={1} />

        <label htmlFor="profile-weight">Peso (kg)</label>
        <input id="profile-weight" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} required min={1} step="0.1" />

        <label htmlFor="profile-height">Altura (cm)</label>
        <input id="profile-height" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} required min={1} />

        <label htmlFor="profile-sex">Sexo biológico</label>
        <select id="profile-sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
          <option value="female">Feminino</option>
          <option value="male">Masculino</option>
        </select>

        <label htmlFor="profile-activity">Nível de atividade física</label>
        <select id="profile-activity" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}>
          <option value="sedentary">Sedentário</option>
          <option value="light">Leve (1-3x/semana)</option>
          <option value="moderate">Moderado (3-5x/semana)</option>
          <option value="active">Ativo (6-7x/semana)</option>
          <option value="very_active">Muito ativo</option>
        </select>

        <label htmlFor="profile-goal">Objetivo</label>
        <select id="profile-goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
          <option value="lose_weight">Perda de peso</option>
          <option value="gain_muscle">Ganho de massa muscular</option>
          <option value="maintain">Manutenção/saúde geral</option>
        </select>

        <button type="button" onClick={handleCalculate}>
          Calcular meta sugerida
        </button>

        <label htmlFor="profile-calories">Calorias (kcal/dia)</label>
        <input id="profile-calories" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required min={1} />

        <label htmlFor="profile-protein">Proteína (g/dia)</label>
        <input id="profile-protein" type="number" value={proteinG} onChange={(e) => setProteinG(e.target.value)} required min={0} />

        <label htmlFor="profile-carb">Carboidrato (g/dia)</label>
        <input id="profile-carb" type="number" value={carbG} onChange={(e) => setCarbG(e.target.value)} required min={0} />

        <label htmlFor="profile-fat">Gordura (g/dia)</label>
        <input id="profile-fat" type="number" value={fatG} onChange={(e) => setFatG(e.target.value)} required min={0} />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `3 passed` neste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/ProfilePage.tsx app/src/pages/ProfilePage.test.tsx
git commit -m "feat: add profile page with suggested goal calculation"
```

---

### Task 6: Ligação final — rotas e Painel mostrando a meta

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/pages/DashboardPage.tsx`
- Test: `app/src/pages/DashboardPage.test.tsx` (novo — `DashboardPage` não tinha teste próprio antes)

**Interfaces:**
- Consumes: `ProfileProvider` (Task 3), `RequireProfile` (Task 4), `ProfilePage` (Task 5), `useProfile()` (Task 3).
- Produces: app com `/profile` roteado e `/dashboard` exigindo perfil completo antes de renderizar.

- [ ] **Step 1: Escrever os testes de `DashboardPage` (devem falhar, o arquivo de teste ainda não existe)**

Create: `app/src/pages/DashboardPage.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()
const mockUseProfile = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../contexts/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    mockSignOut.mockReset()
    mockUseAuth.mockReset().mockReturnValue({ user: { email: 'a@b.com' }, signOut: mockSignOut })
  })

  it('shows the daily target when a profile exists', () => {
    mockUseProfile.mockReturnValue({
      profile: { dailyCaloriesTarget: 2500, dailyProteinG: 130, dailyCarbG: 300, dailyFatG: 70 },
    })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/2500 kcal/)).toBeInTheDocument()
    expect(screen.getByText(/130 g/)).toBeInTheDocument()
  })

  it('does not show a target section when there is no profile', () => {
    mockUseProfile.mockReturnValue({ profile: null })
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )
    expect(screen.queryByText(/Sua meta diária/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — o `DashboardPage` atual não usa `useProfile`, então `mockUseProfile` nunca é chamado da forma esperada e a asserção de texto falha (não encontra "2500 kcal").

- [ ] **Step 3: Atualizar `app/src/pages/DashboardPage.tsx`**

Substituir todo o conteúdo por:
```tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()

  return (
    <div>
      <h1>Painel</h1>
      <p>Logado como: {user?.email}</p>
      {profile && (
        <div>
          <h2>Sua meta diária</h2>
          <p>Calorias: {profile.dailyCaloriesTarget} kcal</p>
          <p>Proteína: {profile.dailyProteinG} g</p>
          <p>Carboidrato: {profile.dailyCarbG} g</p>
          <p>Gordura: {profile.dailyFatG} g</p>
        </div>
      )}
      <p>
        <Link to="/profile">Editar perfil</Link>
      </p>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  )
}
```

- [ ] **Step 4: Rodar os testes de `DashboardPage` e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `2 passed` neste arquivo.

- [ ] **Step 5: Atualizar `app/src/App.tsx`**

Substituir todo o conteúdo por:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicOnlyRoute } from './components/PublicOnlyRoute'
import { RequireProfile } from './components/RequireProfile'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'

export function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
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
      </ProfileProvider>
    </AuthProvider>
  )
}
```

Nota: `/profile` fica dentro de `ProtectedRoute` mas **fora** de `RequireProfile` — de propósito, senão ninguém conseguiria completar o perfil pela primeira vez (ficaria redirecionado em círculo).

- [ ] **Step 6: Rodar toda a suíte de testes**

Run: `npm test` (dentro de `app/`)
Expected: todos os testes passam (soma de todas as Tasks deste plano + Plano 1).

- [ ] **Step 7: Commit**

```bash
git add app/src/App.tsx app/src/pages/DashboardPage.tsx app/src/pages/DashboardPage.test.tsx
git commit -m "feat: wire up profile routing and show daily target on dashboard"
```

- [ ] **Step 8 [MANUAL]: Teste de ponta a ponta no navegador**

  1. Rode `npm run dev` (dentro de `app/`) e abra a URL mostrada.
  2. Entre com a conta que você já criou no Plano 1. Você deve ser redirecionado para `/profile` (perfil ainda não existe).
  3. Preencha idade, peso, altura, sexo, nível de atividade e objetivo. Clique em **"Calcular meta sugerida"** — os campos de calorias/proteína/carboidrato/gordura devem se preencher.
  4. (Opcional) Edite manualmente algum desses valores calculados.
  5. Clique em **"Salvar perfil"**. Você deve ser levado ao Painel, mostrando a meta diária que você salvou.
  6. Clique em **"Editar perfil"**, mude o peso, recalcule e salve de novo — confirme que o Painel reflete os novos valores.
  7. Me avise como foi.

---

## Fora de escopo deste plano (fica para planos futuros)

- Busca de alimentos, entrada manual e favoritos (Plano 3).
- Registro de refeições e "consumido hoje" no Painel (Plano 4).
- Registro de peso corporal e realimentação da meta ao longo do tempo (Plano 5).
- Estilo visual/CSS (mesma decisão de escopo do Plano 1).
