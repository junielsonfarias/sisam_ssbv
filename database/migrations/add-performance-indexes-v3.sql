-- ============================================================================
-- MIGRAÇÃO: Performance para escalar de 3.000 → 8.000+ alunos
-- Data: 2026-03-30
-- ============================================================================
-- Execução: node scripts/aplicar-schema-supabase.js (ou manualmente no Supabase SQL Editor)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. COLUNA DESNORMALIZADA: serie_numero
--    Elimina REGEXP_REPLACE em 50+ queries (maior gargalo de performance)
-- ============================================================================

-- Alunos
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS serie_numero VARCHAR(10);
UPDATE alunos SET serie_numero = REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')
WHERE serie IS NOT NULL AND (serie_numero IS NULL OR serie_numero = '');

CREATE INDEX IF NOT EXISTS idx_alunos_serie_numero_col
ON alunos(serie_numero) WHERE serie_numero IS NOT NULL;

-- Resultados Consolidados
ALTER TABLE resultados_consolidados ADD COLUMN IF NOT EXISTS serie_numero VARCHAR(10);
UPDATE resultados_consolidados SET serie_numero = REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')
WHERE serie IS NOT NULL AND (serie_numero IS NULL OR serie_numero = '');

CREATE INDEX IF NOT EXISTS idx_rc_serie_numero_col
ON resultados_consolidados(serie_numero) WHERE serie_numero IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rc_serie_numero_ano
ON resultados_consolidados(serie_numero, ano_letivo);

-- Turmas
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS serie_numero VARCHAR(10);
UPDATE turmas SET serie_numero = REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')
WHERE serie IS NOT NULL AND (serie_numero IS NULL OR serie_numero = '');

CREATE INDEX IF NOT EXISTS idx_turmas_serie_numero_col
ON turmas(serie_numero) WHERE serie_numero IS NOT NULL;

-- ============================================================================
-- 2. TRIGGER: manter serie_numero sincronizado automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_sync_serie_numero()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.serie IS NOT NULL THEN
    NEW.serie_numero := REGEXP_REPLACE(NEW.serie::text, '[^0-9]', '', 'g');
  ELSE
    NEW.serie_numero := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para alunos
DROP TRIGGER IF EXISTS trg_alunos_serie_numero ON alunos;
CREATE TRIGGER trg_alunos_serie_numero
  BEFORE INSERT OR UPDATE OF serie ON alunos
  FOR EACH ROW EXECUTE FUNCTION fn_sync_serie_numero();

-- Trigger para resultados_consolidados
DROP TRIGGER IF EXISTS trg_rc_serie_numero ON resultados_consolidados;
CREATE TRIGGER trg_rc_serie_numero
  BEFORE INSERT OR UPDATE OF serie ON resultados_consolidados
  FOR EACH ROW EXECUTE FUNCTION fn_sync_serie_numero();

-- Trigger para turmas
DROP TRIGGER IF EXISTS trg_turmas_serie_numero ON turmas;
CREATE TRIGGER trg_turmas_serie_numero
  BEFORE INSERT OR UPDATE OF serie ON turmas
  FOR EACH ROW EXECUTE FUNCTION fn_sync_serie_numero();

-- ============================================================================
-- 3. ÍNDICES FALTANTES
-- ============================================================================

-- Alunos: série direta (sem regex)
CREATE INDEX IF NOT EXISTS idx_alunos_serie
ON alunos(serie) WHERE serie IS NOT NULL;

-- Resultados Consolidados: série + ano (combo mais frequente em dashboards)
CREATE INDEX IF NOT EXISTS idx_rc_serie_ano
ON resultados_consolidados(serie, ano_letivo);

-- Notas Escolares: aluno + turma (lançamento de notas por turma)
CREATE INDEX IF NOT EXISTS idx_notas_esc_aluno_turma
ON notas_escolares(aluno_id, turma_id);

-- Frequência Diária: aluno + data DESC (boletim do aluno)
CREATE INDEX IF NOT EXISTS idx_freq_diaria_aluno_data
ON frequencia_diaria(aluno_id, data DESC);

-- Turmas: código + ano (importações buscam turma por código)
CREATE INDEX IF NOT EXISTS idx_turmas_codigo_ano
ON turmas(codigo, ano_letivo);

-- Usuários: escola_id e polo_id (filtros de acesso em todas as APIs)
CREATE INDEX IF NOT EXISTS idx_usuarios_escola_id
ON usuarios(escola_id) WHERE escola_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_polo_id
ON usuarios(polo_id) WHERE polo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_ativo_tipo
ON usuarios(ativo, tipo_usuario) WHERE ativo = true;

-- Escolas: código (busca por código INEP)
CREATE INDEX IF NOT EXISTS idx_escolas_codigo
ON escolas(codigo_inep) WHERE codigo_inep IS NOT NULL;

-- Avaliações: ano + ativo (listagens filtradas)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_ano_ativo
ON avaliacoes(ano_letivo, ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_tipo
ON avaliacoes(tipo);

-- ============================================================================
-- 4. EXTENSÃO pg_trgm (busca ILIKE eficiente)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigramas para busca por nome (se não existirem)
CREATE INDEX IF NOT EXISTS idx_alunos_nome_trgm
ON alunos USING gin (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_escolas_nome_trgm
ON escolas USING gin (nome gin_trgm_ops);

-- ============================================================================
-- 5. NORMALIZAR turma_id em notas_escolares (eliminar COALESCE no JOIN)
-- ============================================================================

UPDATE notas_escolares n
SET turma_id = a.turma_id
FROM alunos a
WHERE n.aluno_id = a.id
  AND n.turma_id IS NULL
  AND a.turma_id IS NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO (executar após migração)
-- ============================================================================
-- SELECT count(*) FROM alunos WHERE serie_numero IS NULL AND serie IS NOT NULL;
-- SELECT count(*) FROM resultados_consolidados WHERE serie_numero IS NULL AND serie IS NOT NULL;
-- SELECT count(*) FROM turmas WHERE serie_numero IS NULL AND serie IS NOT NULL;
-- SELECT count(*) FROM notas_escolares WHERE turma_id IS NULL;
