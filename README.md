# App de Dieta

Aplicação web para acompanhamento de dieta. Frontend em React (Vite + TypeScript), backend em Supabase.

## Rodando localmente

1. `cd app && npm install`
2. Copie `app/.env.local.example` para `app/.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com as credenciais do projeto Supabase (Project Settings → API).
3. `npm run dev` (dentro de `app/`)
4. Abra a URL mostrada no terminal (geralmente http://localhost:5173).

## Testes

`npm test` (dentro de `app/`)

## Documentação

- `docs/premissas-app-dieta.md` — visão geral e escopo do projeto.
- `docs/superpowers/plans/` — planos de implementação, um por etapa.
