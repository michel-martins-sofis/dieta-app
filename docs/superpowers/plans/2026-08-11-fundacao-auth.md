# Fundação e Autenticação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ter um app React rodando localmente, conectado a um projeto Supabase real, onde um usuário consegue criar conta, fazer login, ver uma tela protegida (dashboard placeholder) e sair — a fundação sobre a qual todas as outras funcionalidades (perfil, alimentos, refeições, peso) serão construídas.

**Architecture:** SPA em React (Vite + TypeScript) dentro de `app/`, consumindo o Supabase diretamente do navegador via `@supabase/supabase-js` (sem backend próprio). Autenticação por e-mail/senha usando o Supabase Auth. Roteamento client-side com `react-router-dom`, com um `ProtectedRoute` que redireciona para `/login` quando não há sessão.

**Tech Stack:** React 18, TypeScript, Vite, react-router-dom v6, @supabase/supabase-js v2, Vitest + React Testing Library para testes.

## Global Constraints

- Backend/infraestrutura: Supabase (autenticação, Postgres, API) — spec seção 7.
- Frontend: React (SPA responsiva, consumindo o Supabase diretamente) — spec seção 7.
- Autenticação obrigatória para acessar o app; dados isolados por usuário — spec seções 1 e 6.
- Não há requisito de funcionamento offline / PWA — spec seção 1.
- O app é apenas para uso local nesta fase (sem deploy/hospedagem ainda) — decisão desta fase de planejamento, deploy fica para um plano futuro.

---

## Passos manuais — visão geral

Esta pessoa usuária (você) não é desenvolvedora. Nas Tasks 1 e 7 abaixo, existem passos que só você pode fazer (criar conta em um serviço externo, testar o app no navegador). Todo passo manual está marcado como **[MANUAL]** e vem com instruções exatas, clique a clique. Nenhum outro passo do plano exige ação sua — o restante é código, executado pela pessoa/agente que implementar o plano.

---

### Task 1: Criar o projeto Supabase (backend)

**Files:** nenhum arquivo de código — apenas configuração externa no site do Supabase.

**Interfaces:**
- Produces: uma "Project URL" e uma chave "anon public", usadas pela Task 3 (`app/.env.local`) para conectar o app ao Supabase.

- [ ] **Passo 1 [MANUAL]: Criar conta no Supabase**

  1. Acesse https://supabase.com no navegador.
  2. Clique em "Start your project" (ou "Sign in") e crie uma conta (pode usar login com GitHub/Google ou e-mail).

- [ ] **Passo 2 [MANUAL]: Criar o projeto**

  1. Dentro do painel do Supabase, clique em "New Project".
  2. Escolha um nome, ex: `dieta-app`.
  3. Defina uma senha para o banco de dados. Guarde essa senha em um local seguro (gerenciador de senhas) — ela não será compartilhada com ninguém, nem comigo, e provavelmente não precisará ser digitada de novo tão cedo.
  4. Escolha uma região próxima ao Brasil (ex: "South America (São Paulo)", se disponível).
  5. Clique em "Create new project" e aguarde 1-2 minutos enquanto o Supabase prepara o banco.

- [ ] **Passo 3 [MANUAL]: Copiar as credenciais da API**

  1. No painel do projeto, vá em "Project Settings" (ícone de engrenagem) → "API".
  2. Copie o valor de "Project URL".
  3. Copie o valor de "anon public" (em "Project API keys"). Essa chave é segura para uso público no navegador (é protegida por regras de acesso no banco) — pode colar ela em um arquivo de configuração sem problema.
  4. **Nunca compartilhe**, aqui ou em qualquer lugar, a "service_role" key nem a senha do banco — essas sim são secretas.
  5. Guarde a Project URL e a chave anon public à mão; vamos usá-las na Task 3.

- [ ] **Passo 4 [MANUAL]: Desativar confirmação de e-mail (só durante o desenvolvimento)**

  1. No painel, vá em "Authentication" → "Providers" → "Email".
  2. Desmarque a opção "Confirm email".
  3. Salve.

  *Por quê:* por padrão o Supabase exige clicar num link de confirmação por e-mail antes do primeiro login. Desativamos isso agora só para testar o app localmente sem fricção. Antes de ter usuários reais, isso deve ser reativado (fica anotado como pendência de uma fase futura, não deste plano).

---

### Task 2: Criar o app React (Vite + TypeScript) e o repositório git

**Files:**
- Create: `app/` (projeto Vite completo, gerado pela ferramenta)
- Create: `.gitignore` (na raiz do repo)

**Interfaces:**
- Produces: um projeto React rodando em `app/` com `npm run dev`, versionado em git.

- [ ] **Step 1: Inicializar o repositório git**

Run: `git init` (na raiz `D:\projetos\claude`)
Expected: `Initialized empty Git repository in D:/projetos/claude/.git/`

- [ ] **Step 2: Criar o `.gitignore` na raiz**

```gitignore
node_modules/
dist/
.env.local
*.local
```

- [ ] **Step 3: Gerar o projeto Vite + React + TypeScript**

Run: `npm create vite@latest app -- --template react-ts`
Expected: cria a pasta `app/` com o template padrão do Vite para React + TS.

- [ ] **Step 4: Instalar as dependências do template**

Run: `cd app && npm install`
Expected: instala sem erros, cria `app/node_modules`.

- [ ] **Step 5: Confirmar que o app roda**

Run: `npm run dev` (dentro de `app/`), abrir a URL mostrada no terminal (geralmente `http://localhost:5173`)
Expected: página padrão do Vite ("Vite + React") carrega no navegador. Depois, parar o servidor (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add .gitignore app
git commit -m "chore: scaffold React + TypeScript app with Vite"
```

---

### Task 3: Conectar o app ao Supabase e configurar testes

**Files:**
- Create: `app/.env.local`
- Create: `app/.env.local.example`
- Create: `app/src/lib/supabaseClient.ts`
- Create: `app/src/setupTests.ts`
- Modify: `app/vite.config.ts`
- Modify: `app/package.json` (script `test`)

**Interfaces:**
- Produces: `supabase` (cliente exportado de `app/src/lib/supabaseClient.ts`), usado por toda a Task 4 em diante.
- Produces: comando `npm test` executando Vitest.

- [ ] **Step 1: Instalar dependências de runtime e de teste**

Run (dentro de `app/`):
```bash
npm install @supabase/supabase-js react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```
Expected: instala sem erros.

- [ ] **Step 2: Criar `app/.env.local.example` (modelo, vai para o git)**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Criar `app/.env.local` (valores reais, NÃO vai para o git — já está no `.gitignore`)**

```
VITE_SUPABASE_URL=cole_aqui_a_project_url_da_task_1
VITE_SUPABASE_ANON_KEY=cole_aqui_a_anon_public_key_da_task_1
```

*(Preencher com os valores copiados na Task 1, Passo 3.)*

- [ ] **Step 4: Criar `app/src/lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check app/.env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 5: Configurar Vitest em `app/vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
```

- [ ] **Step 6: Criar `app/src/setupTests.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Adicionar script de teste em `app/package.json`**

No bloco `"scripts"`, adicionar:
```json
"test": "vitest run"
```

- [ ] **Step 8: Escrever um teste trivial para validar o setup**

Create: `app/src/sanity.test.ts`
```ts
import { describe, it, expect } from 'vitest'

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 9: Rodar os testes**

Run: `npm test` (dentro de `app/`)
Expected: `1 passed`.

- [ ] **Step 10: Apagar o teste trivial (não é mais necessário)**

Delete: `app/src/sanity.test.ts`

- [ ] **Step 11: Commit**

```bash
git add app/package.json app/package-lock.json app/vite.config.ts app/.env.local.example app/src/lib/supabaseClient.ts app/src/setupTests.ts
git commit -m "chore: connect app to Supabase and configure Vitest"
```

---

### Task 4: Contexto de autenticação (`AuthContext`)

**Files:**
- Create: `app/src/contexts/AuthContext.tsx`
- Test: `app/src/contexts/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `supabase` de `app/src/lib/supabaseClient.ts` (Task 3).
- Produces: `AuthProvider` (componente) e `useAuth()` (hook) retornando `{ user: User | null, session: Session | null, loading: boolean, signUp(email, password): Promise<{error: string | null}>, signIn(email, password): Promise<{error: string | null}>, signOut(): Promise<void> }`. Usado pelas Tasks 5, 6 e 7.

- [ ] **Step 1: Escrever os testes de `AuthContext` (devem falhar, o arquivo ainda não existe)**

Create: `app/src/contexts/AuthContext.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      signUp: (args: unknown) => mockSignUp(args),
      signInWithPassword: (args: unknown) => mockSignInWithPassword(args),
      signOut: () => mockSignOut(),
    },
  },
}))

function TestConsumer() {
  const { user, loading, signIn } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => signIn('a@b.com', 'password123')}>login</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockGetSession.mockReset().mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    mockSignInWithPassword.mockReset().mockResolvedValue({ error: null })
  })

  it('starts loading, then resolves to no user when there is no session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('calls supabase signInWithPassword with the given credentials', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
    await userEvent.click(screen.getByText('login'))
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' })
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './AuthContext'` (o arquivo ainda não existe).

- [ ] **Step 3: Implementar `app/src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ? error.message : null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/src/contexts/AuthContext.tsx app/src/contexts/AuthContext.test.tsx
git commit -m "feat: add AuthContext for signup/login/logout"
```

---

### Task 5: Tela de cadastro (`SignupPage`)

**Files:**
- Create: `app/src/pages/SignupPage.tsx`
- Test: `app/src/pages/SignupPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` de `app/src/contexts/AuthContext.tsx` (Task 4) — usa `signUp(email, password)`.
- Produces: componente `SignupPage`, usado pelo roteamento na Task 7 na rota `/signup`.

- [ ] **Step 1: Escrever os testes de `SignupPage` (devem falhar)**

Create: `app/src/pages/SignupPage.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignupPage } from './SignupPage'

const mockSignUp = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('SignupPage', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
    mockNavigate.mockReset()
  })

  it('submits email and password and navigates to /dashboard on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error message when signup fails', async () => {
    mockSignUp.mockResolvedValue({ error: 'Email already registered' })
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './SignupPage'`.

- [ ] **Step 3: Implementar `app/src/pages/SignupPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: signUpError } = await signUp(email, password)
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div>
      <h1>Criar conta</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="signup-email">E-mail</label>
        <input
          id="signup-email"
          aria-label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="signup-password">Senha</label>
        <input
          id="signup-password"
          aria-label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
      <p>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/SignupPage.tsx app/src/pages/SignupPage.test.tsx
git commit -m "feat: add signup page"
```

---

### Task 6: Tela de login (`LoginPage`)

**Files:**
- Create: `app/src/pages/LoginPage.tsx`
- Test: `app/src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` de `app/src/contexts/AuthContext.tsx` (Task 4) — usa `signIn(email, password)`.
- Produces: componente `LoginPage`, usado pelo roteamento na Task 7 na rota `/login`.

- [ ] **Step 1: Escrever os testes de `LoginPage` (devem falhar)**

Create: `app/src/pages/LoginPage.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const mockSignIn = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    mockNavigate.mockReset()
  })

  it('submits email and password and navigates to /dashboard on success', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error message when login fails', async () => {
    mockSignIn.mockResolvedValue({ error: 'Invalid login credentials' })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './LoginPage'`.

- [ ] **Step 3: Implementar `app/src/pages/LoginPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) {
      setError(signInError)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div>
      <h1>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          aria-label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="login-password">Senha</label>
        <input
          id="login-password"
          aria-label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p>
        Não tem conta? <Link to="/signup">Criar conta</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/LoginPage.tsx app/src/pages/LoginPage.test.tsx
git commit -m "feat: add login page"
```

---

### Task 7: Rota protegida, dashboard placeholder e ligação final

**Files:**
- Create: `app/src/components/ProtectedRoute.tsx`
- Test: `app/src/components/ProtectedRoute.test.tsx`
- Create: `app/src/pages/DashboardPage.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/main.tsx`

**Interfaces:**
- Consumes: `useAuth()` de `app/src/contexts/AuthContext.tsx` (Task 4) — usa `user` e `loading`.
- Consumes: `AuthProvider` (Task 4), `SignupPage` (Task 5), `LoginPage` (Task 6).
- Produces: app totalmente roteado — `/signup`, `/login`, `/dashboard` (protegida), qualquer outra rota redireciona para `/dashboard`.

- [ ] **Step 1: Escrever os testes de `ProtectedRoute` (devem falhar)**

Create: `app/src/components/ProtectedRoute.test.tsx`
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>conteudo protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows a loading message while auth state is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    renderWithRoute()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('redirects to /login when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    renderWithRoute()
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })

  it('renders children when there is a user', () => {
    mockUseAuth.mockReturnValue({ user: { email: 'a@b.com' }, loading: false })
    renderWithRoute()
    expect(screen.getByText('conteudo protegido')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test` (dentro de `app/`)
Expected: FAIL — `Cannot find module './ProtectedRoute'`.

- [ ] **Step 3: Implementar `app/src/components/ProtectedRoute.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p>Carregando...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test` (dentro de `app/`)
Expected: `3 passed`.

- [ ] **Step 5: Implementar `app/src/pages/DashboardPage.tsx`**

```tsx
import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { user, signOut } = useAuth()

  return (
    <div>
      <h1>Painel</h1>
      <p>Logado como: {user?.email}</p>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  )
}
```

- [ ] **Step 6: Ligar tudo em `app/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SignupPage } from './pages/SignupPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

- [ ] **Step 7: Simplificar `app/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 8: Apagar arquivos do boilerplate que não são mais usados**

Delete: `app/src/App.css` (se existir e não for referenciado), `app/src/assets/react.svg` (opcional, apenas limpeza)

- [ ] **Step 9: Rodar todos os testes do projeto**

Run: `npm test` (dentro de `app/`)
Expected: todos os testes passam (Tasks 4 a 7 somadas).

- [ ] **Step 10: Commit**

```bash
git add app/src
git commit -m "feat: wire up routing, protected dashboard and app shell"
```

- [ ] **Step 11 [MANUAL]: Teste de ponta a ponta no navegador**

  1. Dentro de `app/`, rode `npm run dev` e abra a URL mostrada (ex: `http://localhost:5173`).
  2. Você deve ser redirecionado para `/login`.
  3. Clique em "Criar conta", preencha um e-mail (pode ser um e-mail seu real ou um de teste, ex: `voce+teste1@gmail.com`) e uma senha com 6+ caracteres. Clique em "Criar conta".
  4. Você deve cair no "Painel" mostrando o e-mail que você digitou.
  5. Clique em "Sair". Você deve voltar para `/login`.
  6. Faça login de novo com o mesmo e-mail/senha na tela "Entrar". Deve voltar ao Painel.
  7. Me avise como foi — se algo não se comportou como descrito, me diga em qual passo e o que apareceu na tela (ou erro no console do navegador, se souber abrir com F12).

---

## Fora de escopo deste plano (fica para planos futuros)

- Formulário de perfil (idade, peso, altura, sexo, atividade, objetivo) e cálculo da meta calórica/macros.
- Tabela `profiles` e demais tabelas do Supabase (alimentos, refeições, pesos).
- Busca de alimentos (base TACO/TBCA), entrada manual e favoritos.
- Tela de resumo diário e registro de peso corporal.
- Deploy/hospedagem do app (por enquanto roda só localmente).
- Estilo visual/CSS além do HTML padrão dos formulários (a aparência final e o refinamento responsivo entram em um plano futuro, depois que as telas principais existirem).
