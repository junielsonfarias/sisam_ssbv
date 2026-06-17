-- ============================================================================
-- add-politica-frequencia-config.sql
-- Data: 2026-06-17
--
-- Política de frequência configurável por escola (Plano Fase 2.1).
--
-- Hoje o mínimo de 75% (LDB art. 24) é hardcoded no fechamento e faltas
-- justificadas não abonam. Esta migration torna a regra configurável:
--   - percentual_frequencia_minimo: % mínimo para aprovação (default 75).
--   - abona_faltas_justificadas: se TRUE, faltas com status 'justificado'
--     contam como presença no cálculo de frequência do FECHAMENTO (a coluna
--     frequencia_bimestral.percentual_frequencia continua sendo a frequência
--     BRUTA, para transparência — o abono é aplicado na decisão).
--
-- Idempotente. Aplicar no Supabase (banco fora do acesso MCP).
-- ============================================================================

BEGIN;

ALTER TABLE configuracao_notas_escola
  ADD COLUMN IF NOT EXISTS percentual_frequencia_minimo INTEGER NOT NULL DEFAULT 75
    CHECK (percentual_frequencia_minimo >= 0 AND percentual_frequencia_minimo <= 100);

ALTER TABLE configuracao_notas_escola
  ADD COLUMN IF NOT EXISTS abona_faltas_justificadas BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN configuracao_notas_escola.percentual_frequencia_minimo IS
  'Frequência mínima (%) para aprovação. Default 75 (LDB art. 24).';
COMMENT ON COLUMN configuracao_notas_escola.abona_faltas_justificadas IS
  'Se TRUE, faltas justificadas contam como presença no fechamento.';

COMMIT;
