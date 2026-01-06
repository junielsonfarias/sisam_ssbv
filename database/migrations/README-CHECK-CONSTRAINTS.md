# Migracao: CHECK Constraints para Validacao de Dados

## Descricao
Esta migracao adiciona CHECK constraints ao banco de dados para garantir a integridade dos dados em varias tabelas do sistema SISAM.

## Constraints Adicionadas

### 1. Notas (0 a 10)

| Tabela | Campo | Constraint |
|--------|-------|------------|
| resultados_provas | nota | chk_resultados_provas_nota_range |
| resultados_consolidados | nota_lp | chk_resultados_consolidados_nota_lp |
| resultados_consolidados | nota_ch | chk_resultados_consolidados_nota_ch |
| resultados_consolidados | nota_mat | chk_resultados_consolidados_nota_mat |
| resultados_consolidados | nota_cn | chk_resultados_consolidados_nota_cn |
| resultados_consolidados | media_aluno | chk_resultados_consolidados_media |

**Regra:** `valor IS NULL OR (valor >= 0 AND valor <= 10)`

### 2. Presenca ('P' ou 'F')

| Tabela | Campo | Constraint |
|--------|-------|------------|
| resultados_provas | presenca | chk_resultados_provas_presenca |
| resultados_consolidados | presenca | chk_resultados_consolidados_presenca |

**Regra:** `presenca IS NULL OR presenca IN ('P', 'F')`
- P = Presente
- F = Faltou

### 3. Total de Acertos (>= 0)

| Tabela | Campo | Constraint |
|--------|-------|------------|
| resultados_consolidados | total_acertos_lp | chk_resultados_consolidados_acertos_lp |
| resultados_consolidados | total_acertos_ch | chk_resultados_consolidados_acertos_ch |
| resultados_consolidados | total_acertos_mat | chk_resultados_consolidados_acertos_mat |
| resultados_consolidados | total_acertos_cn | chk_resultados_consolidados_acertos_cn |

**Regra:** `valor IS NULL OR valor >= 0`

### 4. Resposta do Aluno ('A', 'B', 'C', 'D', 'E')

| Tabela | Campo | Constraint |
|--------|-------|------------|
| resultados_provas | resposta_aluno | chk_resultados_provas_resposta |

**Regra:** `resposta_aluno IS NULL OR resposta_aluno IN ('A', 'B', 'C', 'D', 'E')`

### 5. Ano Letivo (formato YYYY)

| Tabela | Campo | Constraint |
|--------|-------|------------|
| resultados_provas | ano_letivo | chk_resultados_provas_ano_letivo |
| resultados_consolidados | ano_letivo | chk_resultados_consolidados_ano_letivo |
| turmas | ano_letivo | chk_turmas_ano_letivo |
| alunos | ano_letivo | chk_alunos_ano_letivo |

**Regra:** `ano_letivo ~ '^\\d{4}$'` (4 digitos numericos)

### 6. Gabarito ('A', 'B', 'C', 'D', 'E')

| Tabela | Campo | Constraint |
|--------|-------|------------|
| questoes | gabarito | chk_questoes_gabarito |

**Regra:** `gabarito IS NULL OR gabarito IN ('A', 'B', 'C', 'D', 'E')`

## Como Executar

### Opcao 1: Usando o script Node.js (recomendado)
```bash
node scripts/executar-migracao-check-constraints.js
```

### Opcao 2: Executando o SQL diretamente
```bash
psql -U postgres -d sisam -f database/migrations/add-check-constraints.sql
```

### Opcao 3: Via Supabase SQL Editor
1. Acesse o SQL Editor no Supabase
2. Copie e cole o conteudo do arquivo `add-check-constraints.sql`
3. Execute o script

## O que a migracao faz automaticamente

1. **Corrige dados invalidos existentes:**
   - Notas fora do range 0-10 sao ajustadas para 0 ou 10
   - Presencas sao convertidas para maiusculo e valores invalidos viram 'P'
   - Respostas sao normalizadas para maiusculo
   - Valores negativos de acertos sao zerados

2. **Adiciona as constraints CHECK:**
   - Verifica se a constraint ja existe antes de adicionar (idempotente)
   - Usa bloco DO $$ para tratamento de erros

3. **Executa em transacao:**
   - Se houver erro, todas as alteracoes sao revertidas

## Verificacao

Apos executar a migracao, verifique as constraints:

```sql
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
AND tc.table_schema = 'public'
AND tc.constraint_name LIKE 'chk_%'
ORDER BY tc.table_name, tc.constraint_name;
```

## Reversao (se necessario)

Para remover todas as constraints:

```sql
-- Remover constraints de notas
ALTER TABLE resultados_provas DROP CONSTRAINT IF EXISTS chk_resultados_provas_nota_range;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_nota_lp;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_nota_ch;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_nota_mat;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_nota_cn;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_media;

-- Remover constraints de presenca
ALTER TABLE resultados_provas DROP CONSTRAINT IF EXISTS chk_resultados_provas_presenca;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_presenca;

-- Remover constraints de acertos
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_acertos_lp;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_acertos_ch;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_acertos_mat;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_acertos_cn;

-- Remover constraints de resposta e gabarito
ALTER TABLE resultados_provas DROP CONSTRAINT IF EXISTS chk_resultados_provas_resposta;
ALTER TABLE questoes DROP CONSTRAINT IF EXISTS chk_questoes_gabarito;

-- Remover constraints de ano letivo
ALTER TABLE resultados_provas DROP CONSTRAINT IF EXISTS chk_resultados_provas_ano_letivo;
ALTER TABLE resultados_consolidados DROP CONSTRAINT IF EXISTS chk_resultados_consolidados_ano_letivo;
ALTER TABLE turmas DROP CONSTRAINT IF EXISTS chk_turmas_ano_letivo;
ALTER TABLE alunos DROP CONSTRAINT IF EXISTS chk_alunos_ano_letivo;
```

## Beneficios

1. **Integridade de dados:** Impede insercao de dados invalidos
2. **Consistencia:** Garante padrao uniforme em todo o banco
3. **Performance:** Constraints sao verificadas no nivel do banco, mais eficiente que validacao em codigo
4. **Manutencao:** Facilita identificacao de problemas de dados

## Notas Importantes

- A migracao e **idempotente**: pode ser executada multiplas vezes sem erro
- Dados existentes invalidos sao **corrigidos automaticamente** antes de adicionar constraints
- Execute em ambiente de **desenvolvimento primeiro** para validar
- Faca **backup** antes de executar em producao
