# App de Dieta

Aplicação web para acompanhamento de dieta. Frontend em React (Vite + TypeScript), backend em Supabase.

## Rodando localmente

1. `cd app && npm install`
2. Copie `app/.env.local.example` para `app/.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com as credenciais do projeto Supabase (Project Settings → API).
3. `npm run dev` (dentro de `app/`)
4. Abra a URL mostrada no terminal (geralmente http://localhost:5173).

## Testes

`npm test` (dentro de `app/`)

## Deploy (Vercel)

O projeto está publicado na Vercel a partir deste repositório. Configuração do projeto na Vercel:

- **Root Directory:** `app` (o `package.json` do frontend fica dentro dessa pasta, não na raiz do repositório).
- **Framework Preset:** Vite (detectado automaticamente).
- **Environment Variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, com os mesmos valores usados em `app/.env.local` (Project Settings → API no Supabase).
- `app/vercel.json` redireciona qualquer rota para `index.html`, necessário porque o app usa roteamento no navegador (React Router) em vez de páginas separadas.

Cada `git push` para a branch principal gera um novo deploy automaticamente.

## Documentação

- `docs/premissas-app-dieta.md` — visão geral e escopo do projeto.
- `docs/superpowers/plans/` — planos de implementação, um por etapa.
