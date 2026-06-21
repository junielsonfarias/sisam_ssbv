-- ============================================
-- MIGRATION: Regra de recuperação explícita em configuracao_notas_escola
-- Data: 2026-06-21
-- ============================================
-- Contexto: lib/services/notas/calculo.ts decidia entre média PONDERADA e
-- SUBSTITUIÇÃO (MAX) inferindo pela soma dos pesos (~1.0). Como o default de
-- schema é peso 0.60/0.40 (soma 1.0), a ponderação ficava ligada SILENCIOSAMENTE,
-- desligando a substituição sem aviso.
--
-- Correção: tornar a regra EXPLÍCITA. Coluna `regra_recuperacao` com domínio
-- {'substituicao','ponderada'}, DEFAULT 'substituicao'. A ponderação só é
-- aplicada quando regra_recuperacao = 'ponderada' E os pesos somam ~1.0.
--
-- Migração ADITIVA e idempotente: ADD COLUMN IF NOT EXISTS com DEFAULT
-- (preenche linhas existentes com 'substituicao'); sem DROP, sem NOT NULL novo
-- sem default. Não altera dados de notas.

BEGIN;

ALTER TABLE configuracao_notas_escola
  ADD COLUMN IF NOT EXISTS regra_recuperacao VARCHAR(20) NOT NULL DEFAULT 'substituicao';

-- CHECK de domínio (idempotente)
ALTER TABLE configuracao_notas_escola
  DROP CONSTRAINT IF EXISTS configuracao_notas_escola_regra_recuperacao_check;

ALTER TABLE configuracao_notas_escola
  ADD CONSTRAINT configuracao_notas_escola_regra_recuperacao_check
  CHECK (regra_recuperacao IN ('substituicao', 'ponderada'));

COMMENT ON COLUMN configuracao_notas_escola.regra_recuperacao IS
  'Regra de cálculo da nota_final com recuperação: substituicao = MAX(nota, recuperacao); ponderada = (nota*peso_avaliacao)+(recuperacao*peso_recuperacao). Default substituicao.';

COMMIT;
