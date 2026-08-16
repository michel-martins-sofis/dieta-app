-- Recordes pessoais (ex: maior carga levantada num exercício), independentes do
-- histórico de treinos linha a linha.

create table public.personal_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise text not null,
  load_kg numeric not null,
  reps integer,
  record_date date,
  confidence text,
  created_at timestamptz not null default now()
);

alter table public.personal_records enable row level security;

create policy "Users can view own personal records"
  on public.personal_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own personal records"
  on public.personal_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update own personal records"
  on public.personal_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own personal records"
  on public.personal_records for delete
  using (auth.uid() = user_id);
