# Estado do Projeto — App de Dieta

> Este documento explica, em linguagem simples, como o app se comporta hoje, onde ver os dados registrados, o que já foi construído e o que ainda falta. Serve como um "raio-x" do projeto num dado momento — para saber o que está acontecendo agora no código, o `git log` e os arquivos em `app/src/` são a fonte da verdade.

## 1. Como o app se comporta (passo a passo)

1. **Cadastro/Login** (`/signup`, `/login`): cada pessoa cria sua própria conta (e-mail + senha). Os dados de cada conta ficam isolados — ninguém vê o registro de outra pessoa.
2. **Primeiro acesso — Perfil obrigatório** (`/profile`): se a conta ainda não tem idade/peso/altura/sexo/atividade/objetivo cadastrados, o app força a pessoa a preencher esse formulário antes de liberar o resto do app. Com base nesses dados, ele **calcula automaticamente** uma meta de calorias e macros (fórmula Mifflin-St Jeor + fator de atividade + ajuste pelo objetivo escolhido). A pessoa pode sobrescrever qualquer valor calculado manualmente.
3. **Painel** (`/dashboard`): tela inicial depois de logar. Mostra quanto já foi consumido hoje (calorias, proteína, carboidrato, gordura) comparado com a meta do perfil, com barra de progresso. De lá, dois atalhos: "Editar perfil" e "Ver diário".
4. **Diário alimentar** (`/diario`): lista das refeições registradas **hoje**, com o botão "Adicionar alimento" e opção de remover cada item. Tem setas "‹"/"›" e um campo de data para navegar para **dias anteriores** e ver o que foi registrado neles (o botão "Adicionar alimento" só aparece no dia de hoje, já que um registro é sempre gravado na data atual).
5. **Adicionar alimento** (`/add-food`): três formas de registrar uma refeição —
   - **Buscar**: procura por nome numa base de ~596 alimentos brasileiros (tabela TACO), escolhe a quantidade em gramas, e o app escala os nutrientes automaticamente.
   - **Manual**: quando o alimento não está na base, a pessoa digita nome e valores nutricionais na mão (com opção de salvar como favorito).
   - **Favoritos**: adiciona de novo, com um clique, algo já salvo como favorito antes.
   - Depois de adicionar, volta para o Diário, e os totais do Painel já refletem a mudança.
6. **Virada do dia**: à meia-noite, o Painel volta a mostrar os totais zerados do novo dia. Os registros do dia anterior continuam acessíveis no Diário, navegando para trás.
7. **Sair** (botão no Painel): encerra a sessão de login.

## 2. Como ver os registros

**Dentro do app:**
- Painel → totais consumidos hoje vs. meta.
- Diário → lista detalhada das refeições, com navegação (‹ / ›, ou escolhendo a data direto) para ver qualquer dia anterior.

O que ainda **não existe dentro do app** é uma visão **agregada** ao longo do tempo (gráfico de evolução do peso, de calorias médias por semana etc.) — isso é o item "Histórico e gráficos" da Fase 2 (seção 4). O Diário mostra um dia por vez, não uma linha do tempo.

Para conferir/exportar os dados brutos diretamente, ou olhar tudo de uma vez fora do app:

1. Acesse [supabase.com](https://supabase.com) e entre no projeto usado por este app.
2. Menu lateral → **Table Editor**.
3. Tabelas relevantes:
   - `profiles` — um registro por usuário (dados pessoais + meta).
   - `food_entries` — todo o histórico de refeições registradas (coluna `logged_date` mostra o dia de cada uma).
   - `favorite_foods` — os favoritos salvos por cada usuário.
   - `foods` — a base de alimentos TACO (somente leitura, igual para todo mundo).

## 3. O que foi implementado (Fase 1 / MVP do escopo original)

Comparando com `docs/premissas-app-dieta.md`, seção 3:

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
| Registro de peso corporal | ⚠️ Parcial — ver seção 4 |

## 4. O que ficou devendo

### Dentro do que a Fase 1 pedia, mas incompleto
- **Atualizar peso de forma rápida**: hoje, para atualizar o peso é preciso abrir "Editar perfil" e passar pelo formulário inteiro de novo (idade, altura, etc.). A premissa original (seção 2) sugeria algo mais direto, só para o peso.
- **Recuperação de senha**: não existe fluxo de "esqueci minha senha" — se a pessoa perder a senha, fica sem acesso à conta.
- **Confirmação de e-mail**: se o projeto Supabase exigir confirmação de e-mail no cadastro, o app já mostra o aviso, mas não há reenvio de e-mail de confirmação pela interface.

### Fase 2 do plano original (esperado ficar para depois — não é uma falha)
- Leitura de código de barras (câmera + Open Food Facts).
- Registro de consumo de água.
- Histórico e gráficos de peso/calorias/macros ao longo do tempo.
- Exportação de relatórios (ex.: para nutricionista).

### Fora de escopo por decisão (não está nos planos)
- Registro de exercício/atividade física.
- Funcionamento offline (PWA).
- Micronutrientes (vitaminas, minerais, fibra, sódio).
- Múltiplos idiomas.
- Integração com wearables.

## 5. Notas técnicas rápidas

- **Testes**: 67 testes automatizados (Vitest) cobrindo contexts, páginas e regras de cálculo, todos passando.
- **Build de produção**: `npm run build` (dentro de `app/`) gera os arquivos estáticos publicados na Vercel.
- **Variáveis de ambiente**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são "assadas" dentro do código no momento do build — trocar esses valores exige um novo deploy, não só reiniciar o servidor.
- **Segurança dos dados**: toda tabela de dados de usuário (`profiles`, `food_entries`, `favorite_foods`) tem Row Level Security no Supabase, ou seja, mesmo que alguém tente burlar o app, o próprio banco impede ver dados de outra conta.
