-- Registro de treinos: uma sessão (workouts) tem vários exercícios
-- (workout_exercises), cada exercício tem uma ou mais séries (workout_sets).
-- workout_exercises/workout_sets não guardam user_id diretamente — a posse é
-- verificada via join até workouts.user_id nas políticas de RLS abaixo.

create table public.workouts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_date date not null,
  type text not null,
  duration_minutes integer,
  notes text,
  confidence text,
  created_at timestamptz not null default now()
);

create table public.workout_exercises (
  id bigint generated always as identity primary key,
  workout_id bigint not null references public.workouts (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table public.workout_sets (
  id bigint generated always as identity primary key,
  exercise_id bigint not null references public.workout_exercises (id) on delete cascade,
  reps integer,
  reps_min integer,
  reps_max integer,
  load_kg numeric,
  set_count integer,
  is_pr boolean not null default false,
  notes text,
  sort_order integer not null default 0
);

alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

create policy "Users can view own workouts"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert own workouts"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on public.workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on public.workouts for delete
  using (auth.uid() = user_id);

create policy "Users can view own workout exercises"
  on public.workout_exercises for select
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "Users can insert own workout exercises"
  on public.workout_exercises for insert
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "Users can update own workout exercises"
  on public.workout_exercises for update
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "Users can delete own workout exercises"
  on public.workout_exercises for delete
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

create policy "Users can view own workout sets"
  on public.workout_sets for select
  using (
    exists (
      select 1 from public.workout_exercises e
      join public.workouts w on w.id = e.workout_id
      where e.id = exercise_id and w.user_id = auth.uid()
    )
  );

create policy "Users can insert own workout sets"
  on public.workout_sets for insert
  with check (
    exists (
      select 1 from public.workout_exercises e
      join public.workouts w on w.id = e.workout_id
      where e.id = exercise_id and w.user_id = auth.uid()
    )
  );

create policy "Users can update own workout sets"
  on public.workout_sets for update
  using (
    exists (
      select 1 from public.workout_exercises e
      join public.workouts w on w.id = e.workout_id
      where e.id = exercise_id and w.user_id = auth.uid()
    )
  );

create policy "Users can delete own workout sets"
  on public.workout_sets for delete
  using (
    exists (
      select 1 from public.workout_exercises e
      join public.workouts w on w.id = e.workout_id
      where e.id = exercise_id and w.user_id = auth.uid()
    )
  );
