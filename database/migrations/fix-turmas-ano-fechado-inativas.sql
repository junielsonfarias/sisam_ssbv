-- ============================================================================
-- fix-turmas-ano-fechado-inativas.sql
-- Data: 2026-06-21
-- Ciclo: 6 (FlowSchoolAgent) — eixo Ano Letivo / higiene de dados legados
-- Banco-alvo: educanet-demo (tbbnswuqsqhulserwtcc) — PRODUCAO DESVINCULADA.
--
-- Auditoria: diagnostico no demo revelou que TODAS as turmas de ano letivo
--   com status='fechado' continuavam marcadas como ativo=true, contrariando
--   o ciclo de vida do ano letivo (ano fechado => turmas inativas) e poluindo
--   listagens/consumidores que filtram por turmas.ativo.
--   Em 2026-06-21 (demo): ano 2024 = 'fechado' com 36 turmas, 36 ativas e
--   0 alunos vinculados (alunos.turma_id). Anos 2025/2026 ='em_andamento'
--   permanecem intactos.
--
-- Objetivo: inativar (ativo=false) as turmas pertencentes a QUALQUER ano
--   letivo fechado (regra generalizada, nao hardcoda '2024'). Correcao de
--   DADOS apenas — nao altera schema.
--
-- Idempotente: a clausula WHERE ativo IS DISTINCT FROM false garante que
--   rodar de novo nao afeta linhas ja inativas (0 linhas no replay).
--
-- Seguranca: backfill condicionado a ano com status='fechado'. Antes de
--   inativar, RAISE NOTICE informa quantas turmas serao tocadas e
--   RAISE EXCEPTION aborta se houver aluno vinculado a turma fechada ativa
--   (guarda de integridade: nao inativar turma com aluno).
--
-- Rollback: reativar as turmas dos anos fechados (somente se necessario):
--   BEGIN;
--   UPDATE turmas t SET ativo = true, atualizado_em = now()
--   FROM anos_letivos al
--   WHERE al.id = t.ano_letivo_id AND al.status = 'fechado' AND t.ativo = false;
--   COMMIT;
--   (Obs.: o rollback reativa TODAS as turmas de anos fechados, inclusive as
--    que ja estivessem inativas antes desta migration; no demo todas as 36
--    estavam ativas, entao reverte ao estado original.)
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_com_aluno  integer;
  v_alvo       integer;
  v_atualizado integer;
BEGIN
  -- Guarda de integridade: nenhuma turma de ano fechado pode ter aluno vinculado
  SELECT COUNT(*) INTO v_com_aluno
  FROM alunos a
  JOIN turmas t       ON t.id = a.turma_id
  JOIN anos_letivos al ON al.id = t.ano_letivo_id
  WHERE al.status = 'fechado' AND t.ativo IS TRUE;

  IF v_com_aluno > 0 THEN
    RAISE EXCEPTION
      'Abortado: % turma(s) de ano fechado possuem alunos vinculados — revisar antes de inativar.',
      v_com_aluno;
  END IF;

  -- Diagnostico do que sera afetado
  SELECT COUNT(*) INTO v_alvo
  FROM turmas t
  JOIN anos_letivos al ON al.id = t.ano_letivo_id
  WHERE al.status = 'fechado' AND t.ativo IS DISTINCT FROM false;

  RAISE NOTICE 'Turmas de ano fechado a inativar: %', v_alvo;

  -- Backfill
  UPDATE turmas t
  SET ativo = false,
      atualizado_em = now()
  FROM anos_letivos al
  WHERE al.id = t.ano_letivo_id
    AND al.status = 'fechado'
    AND t.ativo IS DISTINCT FROM false;

  GET DIAGNOSTICS v_atualizado = ROW_COUNT;
  RAISE NOTICE 'Turmas inativadas: %', v_atualizado;

  -- Verificacao final: nao pode sobrar turma ativa em ano fechado
  IF EXISTS (
    SELECT 1 FROM turmas t
    JOIN anos_letivos al ON al.id = t.ano_letivo_id
    WHERE al.status = 'fechado' AND t.ativo IS TRUE
  ) THEN
    RAISE EXCEPTION 'Verificacao falhou: ainda ha turma ativa em ano fechado.';
  END IF;
END $$;

COMMIT;
