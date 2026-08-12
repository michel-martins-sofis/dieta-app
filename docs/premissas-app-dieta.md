# Premissas do Projeto — App de Acompanhamento de Dieta

> Documento de definição de projeto, construído por entrevista em 2026-08-11.
> Serve como referência para a fase de planejamento e implementação.

## 1. Visão geral

**O que é:** aplicação web responsiva para múltiplos usuários registrarem sua alimentação diária e acompanharem progresso em relação a metas nutricionais pessoais (perda de peso, ganho de massa ou manutenção).

**Plataforma:** web app único, acessível por navegador tanto em computadores quanto em celulares, com layout responsivo que se adapta a qualquer tamanho de tela (mobile-first, já que o registro de refeições provavelmente acontece mais pelo celular).

**Conectividade:** assume conexão com internet disponível. Não há requisito de funcionamento offline (não é um PWA).

**Multi-usuário:** cada usuário tem conta própria (login/senha), com dados isolados dos demais usuários e autenticação obrigatória para acessar o app.

## 2. Usuários e metas nutricionais

**Dados de perfil:** cada usuário informa idade, peso, altura, sexo biológico e nível de atividade física — usados para calcular a meta calórica automaticamente (fórmula padrão, ex: Mifflin-St Jeor + fator de atividade).

**Objetivo do usuário:** cada usuário escolhe seu objetivo entre:
- Perda de peso
- Ganho de massa muscular
- Manutenção/saúde geral

O objetivo ajusta a fórmula da meta calórica (déficit, superávit ou equilíbrio) e a distribuição de macros sugerida (ex: mais proteína no ganho de massa).

**Metas editáveis:** o app calcula uma meta diária sugerida de calorias + macros (proteína, carboidrato, gordura), mas o usuário pode sobrescrever manualmente qualquer valor (ex: seguindo orientação de nutricionista).

**Nível de detalhe nutricional rastreado:** calorias + macros (proteína, carboidrato, gordura). Micronutrientes (vitaminas, minerais, fibra, sódio) ficam fora de escopo.

**Peso corporal:** o usuário pode atualizar seu peso periodicamente; isso realimenta o cálculo da meta calórica ao longo do tempo.

## 3. Escopo — Fase 1 (MVP)

**Registro de alimentos:**
- Busca por alimentos numa base de dados nutricional focada em alimentos brasileiros (tabela TACO/TBCA)
- Entrada manual de valores nutricionais (quando o alimento não está na base, ou o usuário prefere digitar)
- Alimentos/refeições favoritas salvas, para reuso rápido de itens repetidos

**Acompanhamento:**
- Tela de resumo do dia atual: calorias e macros consumidos vs. meta diária
- Registro de peso corporal (entrada manual, sem gráfico de evolução ainda nesta fase)

**Conta:**
- Cadastro, login e perfil com os dados necessários para cálculo de meta (idade, peso, altura, sexo, nível de atividade, objetivo)

## 4. Escopo — Fase 2 (evolução futura)

- **Leitura de código de barras:** escanear embalagens de produtos industrializados via câmera do celular, integrando com uma base de dados de produtos (ex: Open Food Facts) além da base TACO.
- **Consumo de água:** registro diário simples de quantidade de água bebida.
- **Histórico e gráficos:** evolução do peso, das calorias/macros consumidos e da adesão à meta ao longo de semanas/meses.
- **Relatórios/exportação:** possibilidade de exportar dados/relatórios (ex: para levar a um nutricionista ou médico).

## 5. Explicitamente fora de escopo

- Registro de exercício/atividade física (ajuste de meta por gasto calórico de treino)
- Funcionamento offline (PWA)
- Rastreamento de micronutrientes (vitaminas, minerais, fibra, sódio)
- Múltiplos idiomas
- Integração com wearables/apps de terceiros

## 6. Requisitos não-funcionais

- **Responsividade:** interface única que se adapta fluidamente de telas pequenas (celular) a grandes (desktop/monitor), sem necessidade de app nativo separado.
- **Privacidade/isolamento de dados:** dados de cada usuário isolados dos demais; autenticação obrigatória.

## 7. Stack técnica

- **Backend/infraestrutura:** Supabase (autenticação multi-usuário, banco de dados PostgreSQL e API prontos)
- **Frontend:** React (SPA responsiva, consumindo o Supabase diretamente)
- **Dados nutricionais:**
  - Fase 1: tabela TACO/TBCA importada e carregada como dados semente no banco
  - Fase 2: Open Food Facts integrado via API (para leitura de código de barras)

## 8. Decisões em aberto para a fase de planejamento

- Modelagem exata das tabelas no Supabase (usuários, alimentos, registros de refeição, pesos)
- Fórmula exata de cálculo de meta calórica e distribuição de macros por objetivo
- Formato de importação da base TACO/TBCA para o banco
- Estrutura de navegação/telas no React
