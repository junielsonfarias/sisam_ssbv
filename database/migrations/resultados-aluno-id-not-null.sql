-- ============================================================================
-- resultados-aluno-id-not-null.sql
-- Data: 2026-06-19
-- Auditoria: Cluster E (import de resultados) — item "resultados_provas.aluno_id NULL"
--
-- Problema:
--   resultados_provas / resultados_consolidados / resultados_producao tem
--   indice/constraint UNIQUE que inclui aluno_id (ex.: idx_resultados_provas_unique
--   sobre (aluno_id, questao_codigo, avaliacao_id)). Como aluno_id era NULLABLE e
--   NULLs sao distintos em indices UNIQUE, qualquer linha com aluno_id IS NULL
--   escapa do ON CONFLICT e DUPLICA a cada reimport, alem de virar orfa (ilegivel
--   por aluno). A protecao ja existe na aplicacao (os dois importadores filtram/
--   rejeitam linhas sem aluno_id — ver lib/services/importar-resultados.service.ts
--   montarLinhaResultado e lib/services/importacao/batch.ts FASE 9), mas o banco
--   nao impunha o invariante.
--
-- Esta migracao torna aluno_id NOT NULL nas 3 tabelas de resultado, fechando o
-- buraco permanentemente. A FK ja e ON DELETE CASCADE (migration 003), entao
-- deletar um aluno nao recria NULLs.
--
-- Idempotencia: limpa residuo (DELETE ... WHERE aluno_id IS NULL) antes do
--   SET NOT NULL; o SET NOT NULL e no-op se a coluna ja for NOT NULL.
--
-- ATENCAO: validar contra o banco alvo antes de aplicar (contagem de orfaos no
--   bloco de diagnostico abaixo). A migration 003 ja deveria ter zerado os
--   orfaos de resultados_provas; o DELETE aqui e defensivo/idempotente.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Diagnostico: quantas linhas orfas serao removidas (apenas NOTICE, nao falha)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  orfaos_provas        BIGINT;
  orfaos_consolidados  BIGINT;
  orfaos_producao      BIGINT := 0;
BEGIN
  SELECT COUNT(*) INTO orfaos_provas       FROM resultados_provas       WHERE aluno_id IS NULL;
  SELECT COUNT(*) INTO orfaos_consolidados FROM resultados_consolidados WHERE aluno_id IS NULL;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    SELECT COUNT(*) INTO orfaos_producao FROM resultados_producao WHERE aluno_id IS NULL;
  END IF;
  RAISE NOTICE 'Orfaos a remover -> provas: %, consolidados: %, producao: %',
    orfaos_provas, orfaos_consolidados, orfaos_producao;
END $$;

-- ----------------------------------------------------------------------------
-- Limpeza de residuo (linhas orfas sao inuteis: sem aluno nao ha leitura)
-- ----------------------------------------------------------------------------
DELETE FROM resultados_provas       WHERE aluno_id IS NULL;
DELETE FROM resultados_consolidados WHERE aluno_id IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    DELETE FROM resultados_producao WHERE aluno_id IS NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Impor o invariante: aluno_id NOT NULL
-- ----------------------------------------------------------------------------
ALTER TABLE resultados_provas       ALTER COLUMN aluno_id SET NOT NULL;
ALTER TABLE resultados_consolidados ALTER COLUMN aluno_id SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    ALTER TABLE resultados_producao ALTER COLUMN aluno_id SET NOT NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Verificacao final (deve retornar 0 em todas)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  restantes BIGINT;
BEGIN
  SELECT COUNT(*) INTO restantes FROM resultados_provas WHERE aluno_id IS NULL;
  IF restantes > 0 THEN
    RAISE EXCEPTION 'resultados_provas ainda tem % linhas com aluno_id NULL', restantes;
  END IF;
END $$;

COMMIT;
