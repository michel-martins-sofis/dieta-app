-- Tabela de registro de peso corporal ao longo do tempo, isolada por usuário via RLS.
-- Um registro por usuário por dia (chave única em user_id + logged_date): registrar
-- o peso de novo no mesmo dia atualiza o valor em vez de duplicar a linha.

create table public.weight_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

alter table public.weight_logs enable row level security;

create policy "Users can view own weight logs"
  on public.weight_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own weight logs"
  on public.weight_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weight logs"
  on public.weight_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own weight logs"
  on public.weight_logs for delete
  using (auth.uid() = user_id);
