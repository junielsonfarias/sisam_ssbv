-- ============================================================================
-- backfill-ano-letivo-id-canonico.sql
-- Data: 2026-06-21
-- Ciclo: 6 (FlowSchoolAgent) — Chave temporal canonica (Gestor -> todos os modulos)
-- Banco alvo: educanet-demo (tbbnswuqsqhulserwtcc) — APENAS demo. Producao desvinculada.
--
-- CONTEXTO / ARMADILHA:
--   As 5 tabelas do eixo temporal (alunos, turmas, professor_turmas,
--   series_escola, periodos_letivos) ja possuem a coluna `ano_letivo_id` (uuid)
--   e a FK *_ano_letivo_id_fkey -> anos_letivos(id), mas o BACKFILL nunca rodou:
--   100% dos registros estao com ano_letivo_id IS NULL. Como a FK so valida
--   linhas NAO-nulas, ficou uma armadilha silenciosa: qualquer JOIN/filtro por
--   ano_letivo_id retorna VAZIO sem erro.
--
--   Diagnostico (demo, 2026-06-21):
--     tabela           total  nulls  backfillaveis  orfaos_ano  ano_letivo_null
--     alunos            1608   1608   1608           0           0
--     turmas             183    183    183           0           0
--     professor_turmas   331    331    331           0           0
--     series_escola       36     36     36           0           0
--     periodos_letivos    12     12     12           0           0
--   anos_letivos canonicos: 2024, 2025, 2026.
--   Zero orfaos (todo ano_letivo casa com anos_letivos.ano) -> backfill 100%
--   resolvivel sem dado externo.
--
-- OBJETIVO:
--   Popular ano_letivo_id em cada tabela a partir do par textual
--   tabela.ano_letivo = anos_letivos.ano, dentro de UMA transacao, com
--   diagnostico (RAISE NOTICE) das linhas atualizadas e verificacao final
--   (RAISE EXCEPTION) garantindo zero NULLs backfillaveis remanescentes.
--   ANALYZE ao final para atualizar estatisticas do planner.
--
-- NAO FAZ (adiado para ciclo seguinte, conforme orientacao):
--   - SET NOT NULL em ano_letivo_id (depende das escritas futuras popularem
--     o campo na origem).
--
-- IDEMPOTENCIA:
--   O UPDATE so toca linhas com ano_letivo_id IS NULL. Reexecucao apos sucesso
--   atualiza 0 linhas. A verificacao final tolera NULLs cujo ano_letivo nao
--   exista em anos_letivos (orfaos) — hoje sao 0; se surgirem, falha explicita.
--
-- ROLLBACK (reverter o backfill deste ciclo):
--   BEGIN;
--     UPDATE alunos           SET ano_letivo_id = NULL;
--     UPDATE turmas           SET ano_letivo_id = NULL;
--     UPDATE professor_turmas SET ano_letivo_id = NULL;
--     UPDATE series_escola    SET ano_letivo_id = NULL;
--     UPDATE periodos_letivos SET ano_letivo_id = NULL;
--   COMMIT;
--   (Reverte ao estado pre-ciclo-6: coluna existente, FK existente, valores NULL.
--    NAO derruba coluna nem FK — essas pre-existiam a este ciclo.)
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_upd   bigint;
  v_resto bigint;
BEGIN
  -- 1) alunos -------------------------------------------------------------
  UPDATE alunos t
     SET ano_letivo_id = al.id
    FROM anos_letivos al
   WHERE t.ano_letivo = al.ano
     AND t.ano_letivo_id IS NULL;
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  RAISE NOTICE 'alunos: % linhas atualizadas', v_upd;

  -- 2) turmas -------------------------------------------------------------
  UPDATE turmas t
     SET ano_letivo_id = al.id
    FROM anos_letivos al
   WHERE t.ano_letivo = al.ano
     AND t.ano_letivo_id IS NULL;
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  RAISE NOTICE 'turmas: % linhas atualizadas', v_upd;

  -- 3) professor_turmas ---------------------------------------------------
  UPDATE professor_turmas t
     SET ano_letivo_id = al.id
    FROM anos_letivos al
   WHERE t.ano_letivo = al.ano
     AND t.ano_letivo_id IS NULL;
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  RAISE NOTICE 'professor_turmas: % linhas atualizadas', v_upd;

  -- 4) series_escola ------------------------------------------------------
  UPDATE series_escola t
     SET ano_letivo_id = al.id
    FROM anos_letivos al
   WHERE t.ano_letivo = al.ano
     AND t.ano_letivo_id IS NULL;
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  RAISE NOTICE 'series_escola: % linhas atualizadas', v_upd;

  -- 5) periodos_letivos ---------------------------------------------------
  UPDATE periodos_letivos t
     SET ano_letivo_id = al.id
    FROM anos_letivos al
   WHERE t.ano_letivo = al.ano
     AND t.ano_letivo_id IS NULL;
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  RAISE NOTICE 'periodos_letivos: % linhas atualizadas', v_upd;

  -- VERIFICACAO FINAL: nenhuma linha BACKFILLAVEL pode sobrar NULL.
  -- (backfillavel = ano_letivo nao-nulo que existe em anos_letivos)
  SELECT
    (SELECT count(*) FROM alunos t           JOIN anos_letivos al ON t.ano_letivo = al.ano WHERE t.ano_letivo_id IS NULL)
  + (SELECT count(*) FROM turmas t           JOIN anos_letivos al ON t.ano_letivo = al.ano WHERE t.ano_letivo_id IS NULL)
  + (SELECT count(*) FROM professor_turmas t JOIN anos_letivos al ON t.ano_letivo = al.ano WHERE t.ano_letivo_id IS NULL)
  + (SELECT count(*) FROM series_escola t    JOIN anos_letivos al ON t.ano_letivo = al.ano WHERE t.ano_letivo_id IS NULL)
  + (SELECT count(*) FROM periodos_letivos t JOIN anos_letivos al ON t.ano_letivo = al.ano WHERE t.ano_letivo_id IS NULL)
  INTO v_resto;

  IF v_resto <> 0 THEN
    RAISE EXCEPTION 'Backfill nao convergiu: % linhas backfillaveis ainda com ano_letivo_id NULL', v_resto;
  END IF;

  RAISE NOTICE 'Verificacao OK: 0 linhas backfillaveis remanescentes.';
END $$;

COMMIT;

-- Atualiza estatisticas do planner (fora da transacao).
ANALYZE alunos;
ANALYZE turmas;
ANALYZE professor_turmas;
ANALYZE series_escola;
ANALYZE periodos_letivos;
