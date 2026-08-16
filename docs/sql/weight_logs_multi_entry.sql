-- weight_logs originalmente permitia só um registro por usuário/dia (upsert). Para
-- suportar múltiplas pesagens no mesmo dia (ex: pré-treino/pós-treino), removemos essa
-- restrição e passamos a inserir cada pesagem como uma linha nova, com um rótulo opcional
-- de "momento" e o nível de confiança da informação (útil para dados importados).
--
-- Seguro rodar mesmo que weight_logs já tenha dados: só remove a constraint de
-- unicidade e adiciona colunas novas, nada é apagado.

alter table public.weight_logs
  drop constraint if exists weight_logs_user_id_logged_date_key;

alter table public.weight_logs
  add column if not exists moment text,
  add column if not exists confidence text;
