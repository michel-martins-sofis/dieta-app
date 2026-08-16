-- Registro de consumo de água por dia, isolado por usuário via RLS. Diferente de
-- weight_logs, cada registro é um evento (um copo bebido), não um valor único por
-- dia — várias linhas por usuário/dia são esperadas, e o total do dia é somado em
-- código (fetchDailyWaterTotals), não no banco.

create table public.water_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_date date not null,
  amount_ml integer not null,
  created_at timestamptz not null default now()
);

alter table public.water_logs enable row level security;

create policy "Users can view own water logs"
  on public.water_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own water logs"
  on public.water_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own water logs"
  on public.water_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own water logs"
  on public.water_logs for delete
  using (auth.uid() = user_id);
