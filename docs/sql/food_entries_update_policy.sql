-- food_entries já existe no Supabase, mas só tem políticas de select/insert/delete
-- (criadas junto com a tabela). Editar uma entrada existente exige a política de
-- update, no mesmo padrão das demais.

create policy "Users can update own food entries"
  on public.food_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
