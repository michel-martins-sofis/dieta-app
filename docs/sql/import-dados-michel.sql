-- Importação única do histórico pessoal (peso, alimentação, treinos, recordes)
-- exportado em conversas anteriores, cobrindo o período de 2026-05-14 a 2026-08-15.
--
-- ANTES DE RODAR:
-- 1. Rode antes (se ainda não rodou) todos estes arquivos, nesta ordem:
--    weight_logs.sql, food_entries_update_policy.sql, meal_plans.sql, water_logs.sql,
--    weight_logs_multi_entry.sql, food_entries_nullable_macros.sql, workouts.sql,
--    personal_records.sql
-- 2. Troque TODAS as ocorrências de 'ebc72850-6bd6-45dd-b000-6e3f738c6b35' neste arquivo pelo seu
--    user_id real (Supabase → Authentication → Users → coluna "UID", é um UUID como
--    "a1b2c3d4-...").
-- 3. Cole o arquivo inteiro no SQL Editor do Supabase e rode de uma vez — é uma
--    transação só; se algo falhar, nada é gravado (nenhum registro duplicado).
--
-- O QUE NÃO FOI IMPORTADO (sem tabela correspondente ainda, ver docs/estado-do-projeto.md):
-- - goals (metas históricas de peso/ciclo) — não existe tabela de metas por período.
-- - healthAndActivityContext (passos/gasto calórico do Google Health, 25/07–31/07).
-- - estimatedDailyKcal por dia (2026-08-11: ~1100 kcal) — é um total do dia, não por
--   item, então não vira uma linha de food_entries.
-- - A nota "valor corrigido de 160,45 para 106" (14/08, peso) — weight_logs não tem
--   coluna de observação; o valor certo (106 kg) foi importado normalmente.

do $$
begin
  if 'ebc72850-6bd6-45dd-b000-6e3f738c6b35' = 'ebc72850-6bd6-45dd-b000-6e3f738c6b35' and
     not exists (select 1 from auth.users where id::text = 'ebc72850-6bd6-45dd-b000-6e3f738c6b35') then
    raise exception 'Troque ebc72850-6bd6-45dd-b000-6e3f738c6b35 pelo seu user_id real antes de rodar este script.';
  end if;
end $$;

-- ===========================================================================
-- 1. PESO (weight_logs) — 28 medições, várias com pré/pós-treino no mesmo dia
-- ===========================================================================

insert into public.weight_logs (user_id, logged_date, weight_kg, moment, confidence) values
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-05-14', 118.00, 'tracking_start', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-14', 109.55, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-14', 108.95, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-15', 109.20, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-15', 108.75, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-16', 109.45, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-16', 108.75, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-21', 109.90, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-21', 109.25, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-22', 109.00, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-23', 108.25, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-24', 109.25, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-24', 108.75, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-28', 108.55, 'post_run', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-28', 107.90, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 108.10, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 108.20, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 107.95, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 108.40, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 108.15, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 107.95, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 107.35, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 106.20, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 106.35, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 105.85, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 106.90, 'pre_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 106.40, 'post_workout', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 106.00, 'pre_workout', 'confirmed');

-- ===========================================================================
-- 2. ÁGUA (water_logs) — só há um registro explícito no histórico (05/08)
-- ===========================================================================

insert into public.water_logs (user_id, logged_date, amount_ml) values
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 1800);

-- ===========================================================================
-- 3. ALIMENTAÇÃO (food_entries) — um registro por item de cada refeição.
-- calories_kcal fica nulo (não aparece nos totais do Painel até ser editado com um
-- valor real) exceto quando o próprio histórico já trazia uma estimativa explícita
-- (estimatedKcal ou nutritionReference) — nesses casos o valor da fonte foi usado.
-- amount = valor do JSON quando único; quando havia uma faixa (amountMin/amountMax),
-- foi usado o ponto médio e a faixa original ficou registrada em notes.
-- ===========================================================================

insert into public.food_entries
  (user_id, logged_date, meal_type, name, calories_kcal, protein_g, carb_g, fat_g, amount, unit, notes, confidence)
values
  -- 2026-05-20 (partial)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-05-20', 'lunch', 'arroz', null, null, null, null, 200, 'g', null, 'partial'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-05-20', 'lunch', 'feijão', null, null, null, null, 1, 'concha grande', null, 'partial'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-05-20', 'lunch', 'coxinha da asa assada', null, null, null, null, 3, 'unidade', null, 'partial'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-05-20', 'lunch', 'ovo frito', null, null, null, null, 2, 'unidade', null, 'partial'),

  -- 2026-08-03 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'breakfast', 'ovo', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'breakfast', 'manteiga', null, null, null, null, null, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'breakfast', 'tomate', null, null, null, null, null, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'breakfast', 'café sem açúcar', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'lunch', 'arroz', null, null, null, null, 110, 'g', 'faixa original: 100-120g', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'lunch', 'feijão', null, null, null, null, 90, 'g', 'faixa original: 80-100g', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'lunch', 'frango', null, null, null, null, 85, 'g', 'faixa original: 70-100g', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'snack', 'café sem açúcar', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'dinner', 'refeição igual ao almoço', null, null, null, null, 1, 'porção', null, 'estimated'),

  -- 2026-08-04 (confirmed)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'breakfast', 'ovo', null, null, null, null, 2, 'unidade', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'breakfast', 'tomate', null, null, null, null, null, 'unidade', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'breakfast', 'café', null, null, null, null, 1, 'porção', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'breakfast', 'cuscuz', null, null, null, null, 70, 'g', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'lunch', 'feijão', null, null, null, null, 75, 'g', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'lunch', 'arroz', null, null, null, null, 100, 'g', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'lunch', 'frango assado', null, null, null, null, 65, 'g', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'snack', 'sorvete com caldas', null, null, null, null, 105, 'g', '2 bolas; caldas de cookie, Sonho de Valsa e chocolate', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'dinner', 'arroz', null, null, null, null, 200, 'g', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'dinner', 'ovo', null, null, null, null, 2, 'unidade', null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-04', 'dinner', 'manteiga', null, null, null, null, 5, 'g', null, 'confirmed'),

  -- 2026-08-05 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'breakfast', 'ovo', null, null, null, null, 3, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'breakfast', 'pão', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'breakfast', 'café sem açúcar', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'breakfast', 'manteiga', null, null, null, null, 5, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'lunch', 'marmita', null, null, null, null, 760, 'g', 'peso bruto aproximado incluindo embalagem; cuscuz, arroz, feijão, 3 rodelas de batata e mão de vaca com osso/cartilagem', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'dinner', 'porco magro', null, null, null, null, 200, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'dinner', 'pizza fina', null, null, null, null, 2, 'pedaço', null, 'estimated'),

  -- 2026-08-07 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'breakfast', 'pão', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'breakfast', 'ovo', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'breakfast', 'manteiga', null, null, null, null, 5, 'g', 'até 5g (máximo)', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'breakfast', 'café com pouco açúcar', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'lunch', 'macarrão', null, null, null, null, 150, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'lunch', 'gado cozido', null, null, null, null, null, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'lunch', 'macaxeira', null, null, null, null, null, 'g', null, 'estimated'),

  -- 2026-08-09 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'breakfast', 'ovo frito', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'breakfast', 'margarina', null, null, null, null, 10, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'breakfast', 'pão', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'breakfast', 'café', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'lunch', 'feijão', null, null, null, null, 120, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'lunch', 'feijoada', null, null, null, null, 80, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'lunch', 'linguiça', null, null, null, null, 30, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'lunch', 'carne de porco assada', 100, null, null, null, null, null, 'estimativa de calorias veio do próprio histórico', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'lunch', 'coxa de frango Sadia', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'snack', 'banana', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'snack', 'morango', null, null, null, null, 3, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-09', 'snack', 'leite condensado', null, null, null, null, 20, 'g', null, 'estimated'),

  -- 2026-08-10 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'breakfast', 'ovo', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'breakfast', 'pão', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'breakfast', 'café', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'breakfast', 'açúcar', null, null, null, null, 20, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'breakfast', 'manteiga', null, null, null, null, 10, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'lunch', 'omelete', null, null, null, null, 3, 'ovos', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'lunch', 'verduras', null, null, null, null, null, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'lunch', 'arroz', null, null, null, null, 150, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'snack', 'morango', null, null, null, null, 3, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'snack', 'banana', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'snack', 'leite condensado', null, null, null, null, 20, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-10', 'dinner', 'banana', null, null, null, null, 1, 'unidade', null, 'estimated'),

  -- 2026-08-11 (estimated; total do dia ~1100 kcal não importado por item, ver aviso acima)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'breakfast', 'pão na chapa sem recheio', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'breakfast', 'ovo', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'breakfast', 'café', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'lunch', 'baião cremoso', null, null, null, null, 75, 'g', 'faixa original: 70-80g', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'lunch', 'peixe assado ou frito - parte do rabo', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'lunch', 'batata frita', null, null, null, null, 7.5, 'unidade', 'faixa original: 7-8 unidades; muito oleosa, consumo possivelmente incompleto', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'dinner', 'peixe - parte da cabeça', null, null, null, null, 1, 'porção', 'usuário suspeita que era assado', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'dinner', 'baião', null, null, null, null, null, 'pequena porção', null, 'estimated'),

  -- 2026-08-12 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'breakfast', 'ovo', null, null, null, null, 3, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'breakfast', 'manteiga', null, null, null, null, 5, 'g', 'até 5g (máximo)', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'breakfast', 'tomate', null, null, null, null, null, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'lunch', 'baião', null, null, null, null, 120, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'lunch', 'peito de frango assado', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'lunch', 'calabresa frita sem óleo', null, null, null, null, 80, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'snack', 'café', null, null, null, null, 1, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'snack', 'Leite Ninho Integral Forti+', null, null, null, null, 2, 'colher', null, 'estimated'),

  -- 2026-08-13 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'breakfast', 'cuscuz', null, null, null, null, null, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'breakfast', 'ovo', null, null, null, null, 3, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'lunch', 'arroz', null, null, null, null, 150, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'lunch', 'feijão', null, null, null, null, 150, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'lunch', 'salada', null, null, null, null, null, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'lunch', 'frango cozido', null, null, null, null, 90, 'g', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'snack', 'banana', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'dinner', 'lasanha', 420, null, null, null, 350, 'g', 'calorias calculadas a partir da referência do histórico (120 kcal/100g)', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-13', 'dinner', 'Galak', null, null, null, null, 3, 'tablete', null, 'estimated'),

  -- 2026-08-14 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'breakfast', 'pão', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'breakfast', 'ovo', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'lunch', 'arroz', null, null, null, null, 275, 'g', 'faixa original: 250-300g', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'lunch', 'salada', null, null, null, null, null, 'porção', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'lunch', 'bife cozido', null, null, null, null, 90, 'g', 'faixa original: 80-100g', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'snack', 'pão', null, null, null, null, 1, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'snack', 'ovo', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'dinner', 'pizza portuguesa', null, null, null, null, null, 'fatia', 'pizza meia portuguesa e meia frango com catupiry; quantidade de fatias não preservada', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'dinner', 'pizza de frango com catupiry', null, null, null, null, null, 'fatia', 'pizza meia portuguesa e meia frango com catupiry; quantidade de fatias não preservada', 'estimated'),

  -- 2026-08-15 (estimated)
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-15', 'breakfast', 'cuscuz', null, null, null, null, 100, 'g', 'mínimo de 100g (valor exato não informado)', 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-15', 'breakfast', 'ovo', null, null, null, null, 2, 'unidade', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-15', 'breakfast', 'queijo coalho', null, null, null, null, 1, 'fatia', null, 'estimated'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-15', 'breakfast', 'margarina Qualy', null, null, null, null, 15, 'g', null, 'estimated');

-- ===========================================================================
-- 4. RECORDES PESSOAIS (personal_records)
-- ===========================================================================

insert into public.personal_records (user_id, exercise, load_kg, reps, record_date, confidence) values
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', 'supino', 100, 1, null, 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', 'agachamento', 180, 1, '2026-06-03', 'confirmed'),
  ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', 'levantamento terra', 220, 2, '2026-07-02', 'confirmed');

-- ===========================================================================
-- 5. TREINOS (workouts, workout_exercises, workout_sets)
-- Cada bloco WITH abaixo é autossuficiente: cria o treino, os exercícios e as
-- séries encadeados pelo id gerado, sem precisar de variáveis.
-- ===========================================================================

-- 2026-06-03 — agachamento 180kg x1 (PR)
with w as (
  insert into public.workouts (user_id, workout_date, type, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-06-03', 'strength', 'confirmed')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'agachamento', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, is_pr, sort_order)
select id, 1, 180, true, 0 from e1;

-- 2026-06-12 — agachamento 170kg x12
with w as (
  insert into public.workouts (user_id, workout_date, type, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-06-12', 'strength', 'confirmed')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'agachamento', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select id, 12, 170, 0 from e1;

-- 2026-06-27 — levantamento terra 210kg x1, 220kg x1 (230kg considerado possível, não executado)
with w as (
  insert into public.workouts (user_id, workout_date, type, notes, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-06-27', 'strength', '230 kg considerado possível; não executado', 'confirmed')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'levantamento terra', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select * from (
  select id, 1, 210, 0 from e1
  union all
  select id, 1, 220, 1 from e1
) sets;

-- 2026-07-02 — levantamento terra 220kg x2 (PR de reps)
with w as (
  insert into public.workouts (user_id, workout_date, type, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-02', 'strength', 'confirmed')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'levantamento terra', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select id, 2, 220, 0 from e1;

-- 2026-07-20 — levantamento terra 210kg x1
with w as (
  insert into public.workouts (user_id, workout_date, type, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-20', 'strength', 'confirmed')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'levantamento terra', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select id, 1, 210, 0 from e1;

-- 2026-07-22 — pernas (agachamento, leg press unilateral, cadeira extensora, mesa flexora)
with w as (
  insert into public.workouts (user_id, workout_date, type, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-22', 'legs', 'partial')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'agachamento', 0 from w returning id
), e2 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'leg press unilateral', 1 from w returning id
), e3 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'cadeira extensora', 2 from w returning id
), e4 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'mesa flexora', 3 from w returning id
), s1 as (
  insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
  select * from (
    select id, 6, 50, 0 from e1
    union all select id, 6, 90, 1 from e1
    union all select id, 8, 130, 2 from e1
    union all select id, 8, 130, 3 from e1
  ) sets
  returning id
), s2 as (
  insert into public.workout_sets (exercise_id, load_kg, sort_order)
  select * from (
    select id, 120, 0 from e2
    union all select id, 180, 1 from e2
    union all select id, 180, 2 from e2
  ) sets
  returning id
), s3 as (
  insert into public.workout_sets (exercise_id, load_kg, sort_order)
  select * from (
    select id, 30, 0 from e3
    union all select id, 30, 1 from e3
    union all select id, 30, 2 from e3
  ) sets
  returning id
)
insert into public.workout_sets (exercise_id, load_kg, sort_order)
select * from (
  select id, 40, 0 from e4
  union all select id, 40, 1 from e4
  union all select id, 40, 2 from e4
) sets;

-- 2026-07-29 — levantamento terra 170kg x4 (x3 séries); corrida cancelada por dor
with w as (
  insert into public.workouts (user_id, workout_date, type, notes, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-29', 'strength', 'corrida cancelada por dor', 'confirmed')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'levantamento terra', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select * from (
  select id, 4, 170, 0 from e1
  union all select id, 4, 170, 1 from e1
  union all select id, 4, 170, 2 from e1
) sets;

-- 2026-07-31 — terra + desenvolvimento militar + tríceps (lombar cansou; terra pesado)
with w as (
  insert into public.workouts (user_id, workout_date, type, notes, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-07-31', 'upper_and_deadlift', 'terra 210 kg pesado; lombar cansou', 'confirmed')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'levantamento terra', 0 from w returning id
), e2 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'desenvolvimento militar', 1 from w returning id
), e3 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'tríceps triângulo', 2 from w returning id
), e4 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'tríceps francês unilateral na polia', 3 from w returning id
), s1 as (
  insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
  select * from (
    select id, 1, 210, 0 from e1
    union all select id, 6, 170, 1 from e1
    union all select id, 6, 170, 2 from e1
  ) sets
  returning id
), s2 as (
  insert into public.workout_sets (exercise_id, reps_min, reps_max, load_kg, set_count, sort_order)
  select id, 6, 8, 40, 4, 0 from e2
  returning id
), s3 as (
  insert into public.workout_sets (exercise_id, reps_min, reps_max, load_kg, set_count, sort_order)
  select id, 6, 8, 70, 3, 0 from e3
  returning id
)
insert into public.workout_sets (exercise_id, reps_min, reps_max, load_kg, set_count, sort_order)
select id, 6, 8, 20, 4, 0 from e4;

-- 2026-08-03 — funcional (puxada substituiu barra; sem salto/corrida/barra)
with w as (
  insert into public.workouts (user_id, workout_date, type, duration_minutes, notes, confidence)
  values (
    'ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-03', 'functional', 55,
    'não realizou salto, corrida ou barra; barra substituída por puxada; descanso entre 60-120s',
    'partial'
  )
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'puxada', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select id, 6, 70, 0 from e1;

-- 2026-08-05 — peito/tríceps/ombros
with w as (
  insert into public.workouts (user_id, workout_date, type, confidence)
  values ('ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-05', 'chest_triceps_shoulders', 'partial')
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'supino na polia', 0 from w returning id
), e2 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'crossover', 1 from w returning id
), e3 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'supino vertical pegada neutra', 2 from w returning id
), e4 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'tríceps drop set', 3 from w returning id
), e5 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'tríceps francês ou elevação lateral', 4 from w returning id
), s1 as (
  insert into public.workout_sets (exercise_id, load_kg, set_count, sort_order)
  select id, 60, 4, 0 from e1
  returning id
), s2 as (
  insert into public.workout_sets (exercise_id, set_count, sort_order)
  select id, 4, 0 from e2
  returning id
), s3 as (
  insert into public.workout_sets (exercise_id, load_kg, set_count, sort_order)
  select id, 75, 3, 0 from e3
  returning id
), s4 as (
  insert into public.workout_sets (exercise_id, set_count, sort_order)
  select id, 3, 0 from e4
  returning id
)
insert into public.workout_sets (exercise_id, load_kg, set_count, sort_order)
select id, 15, 3, 0 from e5;

-- 2026-08-07 — levantamento terra 210kg x3 (testou braces/cinto; lombar não cansou)
with w as (
  insert into public.workouts (user_id, workout_date, type, notes, confidence)
  values (
    'ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-07', 'strength',
    'testou diferentes braces; usou cinto alto na altura das costelas; lombar não cansou',
    'confirmed'
  )
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'levantamento terra', 0 from w returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select id, 3, 210, 0 from e1;

-- 2026-08-11 — costas (registrado por imagem; exercícios/cargas não recuperados)
insert into public.workouts (user_id, workout_date, type, notes, confidence)
values (
  'ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-11', 'back',
  'Treino de costas registrado por imagem; exercícios e cargas não recuperados em texto',
  'partial'
);

-- 2026-08-12 — agachamento (registro corrigido: desconsiderar 160x8; plano indicava 170kg)
with w as (
  insert into public.workouts (user_id, workout_date, type, notes, confidence)
  values (
    'ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-12', 'squat_strength',
    'registro corrigido: desconsiderar 160x8; plano indicava progressão para 170 kg',
    'partial'
  )
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'agachamento', 0 from w returning id
)
insert into public.workout_sets (exercise_id, load_kg, sort_order)
select id, 130, 0 from e1;

-- 2026-08-14 — terra + ombros + bíceps (sem costas; detalhes do bíceps não recuperados)
with w as (
  insert into public.workouts (user_id, workout_date, type, notes, confidence)
  values (
    'ebc72850-6bd6-45dd-b000-6e3f738c6b35', '2026-08-14', 'deadlift_shoulders_biceps',
    'barra do terra pesa 8 kg; usuário decidiu fazer ombros e 2 exercícios de bíceps, sem costas; detalhes do bíceps não recuperados',
    'partial'
  )
  returning id
), e1 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'levantamento terra', 0 from w returning id
), e2 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'elevação de ombro cruzada na polia', 1 from w returning id
), e3 as (
  insert into public.workout_exercises (workout_id, name, sort_order)
  select id, 'desenvolvimento militar', 2 from w returning id
), s1 as (
  insert into public.workout_sets (exercise_id, reps, load_kg, notes, sort_order)
  select * from (
    select id, null::int, 210, 'sossegado', 0 from e1
    union all select id, 3, 170, null, 1 from e1
    union all select id, 3, 170, null, 2 from e1
  ) sets
  returning id
), s2 as (
  insert into public.workout_sets (exercise_id, reps_min, reps_max, load_kg, sort_order)
  select id, 6, 8, 15, 0 from e2
  returning id
)
insert into public.workout_sets (exercise_id, reps, load_kg, sort_order)
select id, 8, 40, 0 from e3;
