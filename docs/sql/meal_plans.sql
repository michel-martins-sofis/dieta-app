-- Planejamento de refeições: itens planejados para uma data (hoje ou futura),
-- separados de food_entries (que representa só o que foi de fato consumido). Um
-- item planejado vira um food_entries real quando o usuário "confirma" o plano.

create table public.meal_plans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  planned_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  calories_kcal numeric not null,
  protein_g numeric not null default 0,
  carb_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;

create policy "Users can view own meal plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal plans"
  on public.meal_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own meal plans"
  on public.meal_plans for delete
  using (auth.uid() = user_id);
