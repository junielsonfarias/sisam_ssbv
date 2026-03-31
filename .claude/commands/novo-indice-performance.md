Analise e crie indices de performance para PostgreSQL.

Entrada: $ARGUMENTS (tabela ou "analisar-todas")

## Estrategia de indices

### 1. Indices basicos (criar sempre)
```sql
-- Foreign keys (PG nao cria automaticamente)
CREATE INDEX IF NOT EXISTS idx_alunos_escola_id ON alunos(escola_id);
CREATE INDEX IF NOT EXISTS idx_alunos_turma_id ON alunos(turma_id);

-- Campos de filtro frequente
CREATE INDEX IF NOT EXISTS idx_alunos_ativo ON alunos(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_alunos_ano_letivo ON alunos(ano_letivo);

-- Busca textual (pg_trgm para ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_alunos_nome_trgm ON alunos USING gin(nome gin_trgm_ops);
```

### 2. Indices compostos (queries frequentes)
```sql
-- Query: alunos por escola + ano + ativo
CREATE INDEX IF NOT EXISTS idx_alunos_escola_ano_ativo
  ON alunos(escola_id, ano_letivo) WHERE ativo = true;

-- Query: turmas por escola + ano
CREATE INDEX IF NOT EXISTS idx_turmas_escola_ano
  ON turmas(escola_id, ano_letivo) WHERE ativo = true;
```

### 3. Indices parciais (excluir inativos)
```sql
-- Apenas registros ativos (menor, mais rapido)
CREATE INDEX IF NOT EXISTS idx_alunos_serie_ativo
  ON alunos(serie) WHERE ativo = true;
```

### 4. Coluna desnormalizada (eliminar REGEXP_REPLACE)
```sql
-- Adicionar coluna pre-calculada
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS serie_numero INTEGER;

-- Trigger para manter atualizado
CREATE OR REPLACE FUNCTION atualizar_serie_numero()
RETURNS TRIGGER AS $$
BEGIN
  NEW.serie_numero = NULLIF(REGEXP_REPLACE(COALESCE(NEW.serie, ''), '[^0-9]', '', 'g'), '')::INTEGER;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_serie_numero
  BEFORE INSERT OR UPDATE OF serie ON alunos
  FOR EACH ROW EXECUTE FUNCTION atualizar_serie_numero();

-- Popular existentes
UPDATE alunos SET serie_numero = NULLIF(REGEXP_REPLACE(COALESCE(serie, ''), '[^0-9]', '', 'g'), '')::INTEGER;

-- Indice na coluna desnormalizada
CREATE INDEX IF NOT EXISTS idx_alunos_serie_numero ON alunos(serie_numero);
```

### 5. Analisar queries lentas
```sql
-- Habilitar pg_stat_statements (se disponivel)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 queries mais lentas
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Verificar uso de indices
SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### 6. ANALYZE apos criar indices
```sql
ANALYZE alunos;
ANALYZE turmas;
ANALYZE escolas;
-- Atualiza estatisticas do query planner
```

## Regras
- Criar indice para TODA foreign key
- Criar indice parcial com WHERE ativo = true quando >20% sao inativos
- Usar pg_trgm para buscas ILIKE
- Desnormalizar campos calculados se usados em >5 queries
- ANALYZE apos criar indices
- Testar com EXPLAIN ANALYZE antes e depois
