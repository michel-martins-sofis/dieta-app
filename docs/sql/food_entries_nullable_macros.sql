-- Permite registrar um alimento sem calorias/macros conhecidos (ex: histórico
-- importado sem valores nutricionais) e preserva a quantidade/unidade/observações
-- originais em vez de forçar tudo em campos numéricos. Um registro com
-- calories_kcal nulo não entra nos totais do Painel/Diário até alguém editar e
-- preencher os valores reais.
--
-- Seguro rodar mesmo que food_entries já tenha dados: linhas existentes mantêm
-- seus valores (nenhuma delas é nula hoje), só a obrigatoriedade muda.

alter table public.food_entries
  alter column calories_kcal drop not null,
  alter column protein_g drop not null,
  alter column carb_g drop not null,
  alter column fat_g drop not null;

alter table public.food_entries
  add column if not exists amount numeric,
  add column if not exists unit text,
  add column if not exists notes text,
  add column if not exists confidence text;
