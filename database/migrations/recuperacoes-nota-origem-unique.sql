-- =====================================================================
-- Migration de SCHEMA: UNIQUE INDEX parcial em recuperacoes_escolares.nota_id_origem
-- Data: 2026-06-21
-- Autor: implementador-sisam
-- Banco-alvo: educanet-demo (tbbnswuqsqhulserwtcc) — producao desvinculada
-- ADR: docs/adr/ADR-005-recuperacao-flexivel-por-escola.md (passo 4 — dual-write)
-- Pre-requisito: passo 3 (adr-005-passo3-backfill-recuperacoes.sql) que
--                criou a coluna recuperacoes_escolares.nota_id_origem.
--
-- OBJETIVO:
--   Garantir unicidade de nota_id_origem (quando NOT NULL) para habilitar o
--   dual-write IDEMPOTENTE via UPSERT:
--     INSERT ... ON CONFLICT (nota_id_origem) WHERE nota_id_origem IS NOT NULL
--             DO UPDATE SET ...
--   Cada linha de notas_escolares e origem 1:1 de uma recuperacao 'por_periodo';
--   sem este indice unico parcial, o ON CONFLICT por nota_id_origem nao funciona
--   e o caminho de dual-write precisaria do antigo DELETE+INSERT (3 queries).
--
-- IDEMPOTENCIA:
--   - Checagem previa de duplicatas: RAISE EXCEPTION aborta a transacao se
--     houver mais de uma linha com o mesmo nota_id_origem (NOT NULL), evitando
--     falha opaca do CREATE UNIQUE INDEX e protegendo dados existentes.
--   - CREATE UNIQUE INDEX IF NOT EXISTS: no-op se o indice ja existir (no demo
--     o indice provavelmente JA existe — reexecucao e segura).
--
-- ROLLBACK (manual — nao executar sem decisao humana):
--   DROP INDEX IF EXISTS uq_rec_esc_nota_origem;
-- =====================================================================

BEGIN;

-- (1) Guard de seguranca: aborta se existir duplicata de nota_id_origem.
--     Sem esse guard, o CREATE UNIQUE INDEX falharia de forma opaca em base
--     suja. Aqui a falha e explicita e descreve o problema.
DO $$
DECLARE
  v_dups BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_dups
  FROM (
    SELECT nota_id_origem
    FROM recuperacoes_escolares
    WHERE nota_id_origem IS NOT NULL
    GROUP BY nota_id_origem
    HAVING COUNT(*) > 1
  ) d;

  IF v_dups > 0 THEN
    RAISE EXCEPTION
      'Duplicatas em recuperacoes_escolares.nota_id_origem (% grupos). Resolva antes de criar o indice unico.',
      v_dups;
  END IF;

  RAISE NOTICE 'Sem duplicatas de nota_id_origem: seguro criar UNIQUE INDEX parcial.';
END $$;

-- (2) Indice unico parcial: garante 1:1 nota -> recuperacao 'por_periodo'.
--     Parcial (WHERE nota_id_origem IS NOT NULL) para nao colidir os
--     lancamentos novos que ainda nao tem origem (NULL nao conflita entre si,
--     mas o WHERE deixa explicito e mantem o indice enxuto).
CREATE UNIQUE INDEX IF NOT EXISTS uq_rec_esc_nota_origem
  ON recuperacoes_escolares(nota_id_origem)
  WHERE nota_id_origem IS NOT NULL;

COMMIT;

-- Verificacao: o indice unico parcial deve existir.
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'recuperacoes_escolares'
  AND indexname = 'uq_rec_esc_nota_origem';
