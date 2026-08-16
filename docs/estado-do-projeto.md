# Estado do Projeto — App de Dieta

> Este documento explica, em linguagem simples, como o app se comporta hoje, onde ver os dados registrados, o que já foi construído e o que ainda falta. Serve como um "raio-x" do projeto num dado momento — para saber o que está acontecendo agora no código, o `git log` e os arquivos em `app/src/` são a fonte da verdade.

## ⚠️ Ação necessária antes de usar o Histórico, o pacote v2 e Treinos

Várias telas dependem de tabelas/políticas novas no banco que **ainda não existem no Supabase** — só existem no código. Antes de testar, rode cada um destes arquivos, **nesta ordem**, no [supabase.com](https://supabase.com) → projeto do app → **SQL Editor** → colar → **Run**:

1. `docs/sql/weight_logs.sql` — tabela de peso (pendente desde a Fase 1/Histórico).
2. `docs/sql/food_entries_update_policy.sql` — libera editar uma entrada do diário já salva (sem isso, editar dá erro de permissão).
3. `docs/sql/meal_plans.sql` — tabela usada pelo planejamento de refeições.
4. `docs/sql/water_logs.sql` — tabela usada pelo registro de consumo de água.
5. `docs/sql/weight_logs_multi_entry.sql` — libera **mais de um registro de peso por dia** (ex: pré/pós-treino).
6. `docs/sql/food_entries_nullable_macros.sql` — permite registrar um alimento **sem calorias/macros conhecidos** (para histórico importado) e adiciona colunas de quantidade/unidade/observações.
7. `docs/sql/workouts.sql` — tabelas de treino (sessão, exercícios, séries).
8. `docs/sql/personal_records.sql` — tabela de recordes pessoais.
9. (opcional, uma vez só) `docs/sql/import-dados-michel.sql` — importa o histórico pessoal de peso/alimentação/treinos já exportado de conversas anteriores. Tem instruções de uso no topo do próprio arquivo (precisa trocar o `user_id` antes de rodar).

Sem o passo 1, registrar peso e ver o gráfico de peso dá erro. Sem o 2, editar uma entrada do diário falha. Sem o 3, planejar refeições futuras ou "repetir dia anterior" falha. Sem o 4, registrar água falha. Sem o 5, um segundo registro de peso no mesmo dia sobrescreve o primeiro em vez de ser somado ao histórico. Sem o 6, salvar um alimento sem calorias falha. Sem o 7/8, a tela de Treinos falha ao carregar.

## 1. Como o app se comporta (passo a passo)

1. **Cadastro/Login** (`/signup`, `/login`): cada pessoa cria sua própria conta (e-mail + senha). Os dados de cada conta ficam isolados — ninguém vê o registro de outra pessoa.
2. **Primeiro acesso — Perfil obrigatório** (`/profile`): se a conta ainda não tem idade/peso/altura/sexo/atividade/objetivo cadastrados, o app força a pessoa a preencher esse formulário antes de liberar o resto do app. Com base nesses dados, ele **calcula automaticamente** uma meta de calorias e macros (fórmula Mifflin-St Jeor + fator de atividade + ajuste pelo objetivo escolhido). Os campos ficam em duas abas — "Dados pessoais" e "Metas nutricionais" — e a pessoa pode sobrescrever qualquer valor calculado manualmente.
3. **Painel** (`/dashboard`): tela inicial depois de logar. Mostra quanto já foi consumido hoje (calorias, proteína, carboidrato, gordura, água) comparado com a meta do perfil, com barra de progresso. De lá, atalhos para "Ver diário" e "Ver histórico" (navegação principal — incluindo Treinos — fica na barra lateral/inferior).
4. **Diário alimentar** (`/diario`): lista das refeições registradas num dia. Tem setas "‹"/"›" e um campo de data para navegar tanto para **dias anteriores** quanto para **dias futuros**:
   - Em dias passados ou de hoje, dá pra **editar** (lápis) ou **remover** cada item já registrado.
   - Em dias futuros, o que aparece são **refeições planejadas** (não contam como consumidas) — só dá pra adicionar/remover, edição fica para uma próxima fase.
   - Botão **"Repetir dia anterior"** copia todos os itens do dia anterior para o dia selecionado (vira registro real se o destino for hoje, ou plano se for uma data futura).
5. **Adicionar/editar alimento** (`/add-food`): três formas de registrar uma refeição —
   - **Buscar**: procura por nome numa base de ~596 alimentos brasileiros (tabela TACO), escolhe a quantidade em gramas, e o app escala os nutrientes automaticamente.
   - **Manual**: quando o alimento não está na base, a pessoa digita nome e valores nutricionais na mão (com opção de salvar como favorito). Calorias/macros podem ficar **em branco** quando não forem conhecidos (ex.: histórico importado) — o item aparece no Diário como "sem dados nutricionais" e não entra nos totais do Painel até alguém editar e preencher os valores reais.
   - **Favoritos**: adiciona de novo, com um clique, algo já salvo como favorito antes.
   - Ao editar um item existente (a partir do lápis no Diário), a tela vira um formulário único de edição (sem as abas de busca/favoritos) e salva alterações no lugar do item, em vez de criar um novo.
   - Depois de adicionar/editar, volta para o Diário na mesma data, e os totais do Painel já refletem a mudança.
6. **Histórico** (`/historico`): um campo para **registrar o peso de hoje** rapidamente (também atualiza o peso salvo no perfil, sempre com o registro mais recente do dia) — com um seletor opcional de **momento** (jejum, pré-treino, pós-treino), já que agora dá pra registrar **mais de um peso no mesmo dia** — + um card de **água** (botões rápidos "+250ml"/"+500ml" ou quantidade personalizada, mostrando o total de hoje e uma tabela dos últimos 7 dias) + gráficos: **evolução do peso** (30 dias, um ponto por registro — não só por dia), **calorias consumidas vs. meta** (14 dias), e **macros (proteína/carboidrato/gordura) ao longo do tempo com % de adesão à meta** (14 dias, uma métrica por macro). Cada gráfico tem um "Ver dados em texto" para quem preferir uma tabela simples em vez do desenho. Um link "Exportar relatório" leva para a tela de exportação.
7. **Exportar relatório** (`/exportar`): escolhe um intervalo de datas e quais dados incluir (alimentos, peso, água) e gera um CSV único (formato longo, uma linha por registro) para abrir numa planilha ou levar a um nutricionista — tudo no navegador, sem depender de nenhum serviço externo.
8. **Treinos** (`/treinos`): registro básico de treinos — data, tipo, duração e observações — mais uma lista de **recordes pessoais** e o histórico de treinos já registrados (incluindo os importados, com exercícios e séries detalhados quando essa informação existir). Ainda não tem um formulário para lançar exercícios/séries individualmente pela interface — isso só chega via os dados já existentes ou uma futura importação.
9. **Tema claro/escuro**: alternador na barra lateral (desktop) / barra superior (mobile) e também na tela de login/cadastro. O app sempre abre no tema **claro** por padrão — não segue a preferência do sistema operacional — e lembra a última escolha no navegador.
10. **Virada do dia**: à meia-noite, o Painel volta a mostrar os totais zerados do novo dia. Os registros do dia anterior continuam acessíveis no Diário, navegando para trás.
11. **Sair**: botão na barra lateral/inferior de navegação.

## 2. Como ver os registros

**Dentro do app:**
- Painel → totais consumidos hoje vs. meta (calorias, macros, água).
- Diário → lista detalhada das refeições (ou planos, em datas futuras), com navegação (‹ / ›, ou escolhendo a data direto), edição e "repetir dia anterior".
- Histórico → peso, água, calorias, macros e adesão à meta, cada gráfico com uma tabela de texto alternativa.
- Exportar → CSV sob demanda para qualquer intervalo de datas.

Para conferir os dados brutos diretamente, ou olhar tudo de uma vez fora do app:

1. Acesse [supabase.com](https://supabase.com) e entre no projeto usado por este app.
2. Menu lateral → **Table Editor**.
3. Tabelas relevantes:
   - `profiles` — um registro por usuário (dados pessoais + meta).
   - `food_entries` — todo o histórico de refeições realmente consumidas (coluna `logged_date` mostra o dia de cada uma).
   - `meal_plans` — refeições planejadas para datas futuras, ainda não "confirmadas" como consumidas.
   - `favorite_foods` — os favoritos salvos por cada usuário.
   - `weight_logs` — histórico de peso (uma linha por registro — pode haver mais de um por dia, com um rótulo opcional de "momento").
   - `water_logs` — registros de consumo de água (uma linha por registro, não por dia — o total do dia é somado pelo app).
   - `foods` — a base de alimentos TACO (somente leitura, igual para todo mundo).
   - `workouts` / `workout_exercises` / `workout_sets` — sessões de treino e seus exercícios/séries.
   - `personal_records` — recordes pessoais por exercício.

## 3. O que foi implementado

### Fase 1 / MVP do escopo original (comparando com `docs/premissas-app-dieta.md`, seção 3)

| Item do escopo | Status |
|---|---|
| Cadastro, login, autenticação obrigatória | ✅ |
| Perfil com idade/peso/altura/sexo/atividade/objetivo | ✅ |
| Cálculo automático de meta calórica e macros | ✅ |
| Metas editáveis manualmente | ✅ |
| Busca de alimentos na base TACO/TBCA | ✅ (596 itens) |
| Entrada manual de alimento | ✅ |
| Alimentos/refeições favoritas | ✅ |
| Resumo do dia: consumido vs. meta | ✅ |
| Isolamento de dados por usuário (RLS no Supabase) | ✅ |
| Registro de peso corporal (rápido, com histórico) | ✅ |
| Histórico e gráficos (peso e calorias) | ✅ |

### Pacote v2 — completude de dados

| Item | Status |
|---|---|
| Editar entradas do diário | ✅ |
| Planejamento de refeições (datas futuras + repetir dia anterior) | ✅ |
| Gráficos de macros ao longo do tempo + % de adesão à meta | ✅ |
| Registro de consumo de água | ✅ |
| Exportar relatório (CSV) | ✅ |
| Redesign visual completo (marca "DietaFlow", app shell, paleta) | ✅ |

Ficaram fora deste pacote por decisão (não são falhas, só não entraram no escopo): receitas (combinar vários alimentos num item reutilizável) e favoritos vinculados à base de alimentos (hoje um favorito é só um retrato fixo, sem reescalar por gramas).

### Importação de histórico pessoal + Treinos (fora do escopo original, adicionado a pedido)

A pedido do usuário, para importar um histórico pessoal de peso/alimentação/treinos vindo de conversas anteriores (arquivo JSON), três mudanças de escopo foram feitas:

| Item | Status |
|---|---|
| Peso: múltiplos registros por dia (pré/pós-treino) | ✅ |
| Alimentos sem calorias/macros conhecidos (histórico importado) | ✅ |
| Registro de treinos/exercícios (antes fora de escopo) — tela básica + recordes pessoais | ✅ |

O registro de exercício físico deixou de estar "fora de escopo" — ver seção 4 para o que ainda falta nessa frente (ex.: lançar exercícios/séries pela interface, não só por importação).

## 4. O que ficou devendo

### Lacunas de conta (prioridade sugerida para a próxima fase)
- **Recuperação de senha**: não existe fluxo de "esqueci minha senha" — se a pessoa perder a senha, fica sem acesso à conta.
- **Confirmação de e-mail**: se o projeto Supabase exigir confirmação de e-mail no cadastro, o app já mostra o aviso, mas não há reenvio de e-mail de confirmação pela interface.

### Ainda no radar (fica para uma fase futura)
- Leitura de código de barras (câmera + Open Food Facts — serviço gratuito, sem chave).
- Receitas (combinar múltiplos alimentos num item reutilizável).
- Favoritos vinculados à base de alimentos (reescaláveis por grama).
- Exportação em PDF (hoje só CSV, por decisão — ver `docs/superpowers/plans/`).
- Treinos: formulário para lançar exercícios/séries pela interface (hoje só registra data/tipo/duração/observações; exercícios e séries só existem para treinos importados via SQL).
- `healthAndActivityContext` (passos/gasto calórico do Google Health) do histórico importado — não tem tabela ainda, não foi importado.

### Fora de escopo por decisão (não está nos planos)
- Funcionamento offline (PWA).
- Micronutrientes (vitaminas, minerais, fibra, sódio) em alimentos da base TACO.
- Múltiplos idiomas.
- Integração com wearables (além da importação manual já feita).

## 5. Notas técnicas rápidas

- **Testes**: suíte automatizada (Vitest) cobrindo contexts, páginas, componentes de gráfico e regras de cálculo, todos passando.
- **Build de produção**: `npm run build` (dentro de `app/`) gera os arquivos estáticos publicados na Vercel.
- **Variáveis de ambiente**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são "assadas" dentro do código no momento do build — trocar esses valores exige um novo deploy, não só reiniciar o servidor.
- **Segurança dos dados**: toda tabela de dados de usuário (`profiles`, `food_entries`, `meal_plans`, `favorite_foods`, `weight_logs`, `water_logs`, `workouts`, `workout_exercises`, `workout_sets`, `personal_records`) tem Row Level Security no Supabase, ou seja, mesmo que alguém tente burlar o app, o próprio banco impede ver dados de outra conta.
- **Migrações pendentes de rodar no Supabase**: ver lista e ordem no aviso no topo deste documento. As demais tabelas (`profiles`, `favorite_foods`, `foods`) já foram criadas anteriormente.
