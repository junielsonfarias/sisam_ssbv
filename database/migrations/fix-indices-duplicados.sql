-- ============================================================================
-- fix-indices-duplicados.sql
-- Data: 2026-06-21
-- Ciclo: 4 (FlowSchoolAgent) — Gestor (banco): fonte unica / integridade
-- Auditoria: diagnostico via pg_indexes no projeto educanet-demo
--            (tbbnswuqsqhulserwtcc) revelou indices UNIQUE redundantes,
--            multiplos indices com DEFINICAO IDENTICA sobre a mesma chave.
--
-- Objetivo: manter UM indice canonico por chave de unicidade e remover os
--           redundantes (estrutura duplicada -> overhead de escrita e ruido
--           para o planner). DROP INDEX remove APENAS a estrutura do indice;
--           NAO apaga linha alguma da tabela (nao-destrutivo de dados).
--
-- Grupos de duplicados encontrados e decisao do canonico:
--
--  1) alunos.codigo_inep_aluno  (3 indices IDENTICOS):
--       CANONICO (manter): idx_alunos_inep_unique
--       DROPAR:            idx_alunos_codigo_inep        (nao-canonico)
--                          idx_alunos_codigo_inep_anti_dup
--     Todos: UNIQUE (codigo_inep_aluno) WHERE codigo_inep_aluno IS NOT NULL
--
--  2) alunos.cpf  (2 indices IDENTICOS):
--       CANONICO (manter): idx_alunos_cpf_unique
--       DROPAR:            idx_alunos_cpf_anti_dup
--     Ambos: UNIQUE (cpf) WHERE cpf IS NOT NULL
--
--  3) professor_turmas (vinculo disciplina) (2 indices IDENTICOS):
--       CANONICO (manter): idx_professor_turmas_disciplina_unique
--       DROPAR:            idx_prof_turmas_disciplina_unique
--     Ambos: UNIQUE (turma_id, disciplina_id, ano_letivo)
--            WHERE tipo_vinculo='disciplina' AND ativo AND disciplina_id NOT NULL
--
--  4) professor_turmas (vinculo polivalente) (2 indices IDENTICOS):
--       CANONICO (manter): idx_professor_turmas_polivalente_unique
--       DROPAR:            idx_prof_turmas_polivalente_unique
--     Ambos: UNIQUE (turma_id, ano_letivo)
--            WHERE tipo_vinculo='polivalente' AND ativo
--
-- Seguranca para ON CONFLICT: o upsert no Postgres infere o indice pelas
-- COLUNAS/predicado (nao pelo nome). Como o canonico cobre exatamente as
-- mesmas colunas + predicado do indice dropado, todo ON CONFLICT segue
-- funcionando. Grep no codigo (.ts/.tsx/.js) confirmou ZERO referencia aos
-- nomes dropados — nenhum service/route depende deles.
--
-- Idempotencia: DROP INDEX IF EXISTS (no-op se ja removido).
-- Atomicidade: BEGIN/COMMIT.
--
-- ROLLBACK (recriar os indices redundantes, caso necessario):
--   CREATE UNIQUE INDEX idx_alunos_codigo_inep ON public.alunos (codigo_inep_aluno) WHERE codigo_inep_aluno IS NOT NULL;
--   CREATE UNIQUE INDEX idx_alunos_codigo_inep_anti_dup ON public.alunos (codigo_inep_aluno) WHERE codigo_inep_aluno IS NOT NULL;
--   CREATE UNIQUE INDEX idx_alunos_cpf_anti_dup ON public.alunos (cpf) WHERE cpf IS NOT NULL;
--   CREATE UNIQUE INDEX idx_prof_turmas_disciplina_unique ON public.professor_turmas (turma_id, disciplina_id, ano_letivo) WHERE tipo_vinculo='disciplina' AND ativo = true AND disciplina_id IS NOT NULL;
--   CREATE UNIQUE INDEX idx_prof_turmas_polivalente_unique ON public.professor_turmas (turma_id, ano_letivo) WHERE tipo_vinculo='polivalente' AND ativo = true;
-- (Rollback NAO e recomendado — sao duplicatas exatas do canonico.)
-- ============================================================================

BEGIN;

-- Diagnostico: quantos indices redundantes ainda existem antes do DROP
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_alunos_codigo_inep',
      'idx_alunos_codigo_inep_anti_dup',
      'idx_alunos_cpf_anti_dup',
      'idx_prof_turmas_disciplina_unique',
      'idx_prof_turmas_polivalente_unique'
    );
  RAISE NOTICE 'fix-indices-duplicados: % indice(s) redundante(s) encontrado(s) para remocao.', v_count;
END $$;

-- 1) alunos.codigo_inep_aluno — manter idx_alunos_inep_unique
DROP INDEX IF EXISTS public.idx_alunos_codigo_inep;
DROP INDEX IF EXISTS public.idx_alunos_codigo_inep_anti_dup;

-- 2) alunos.cpf — manter idx_alunos_cpf_unique
DROP INDEX IF EXISTS public.idx_alunos_cpf_anti_dup;

-- 3) professor_turmas (disciplina) — manter idx_professor_turmas_disciplina_unique
DROP INDEX IF EXISTS public.idx_prof_turmas_disciplina_unique;

-- 4) professor_turmas (polivalente) — manter idx_professor_turmas_polivalente_unique
DROP INDEX IF EXISTS public.idx_prof_turmas_polivalente_unique;

-- Verificacao final: os canonicos DEVEM continuar existindo; os redundantes NAO.
DO $$
DECLARE
  v_redundantes integer;
  v_canonicos   integer;
BEGIN
  SELECT count(*) INTO v_redundantes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_alunos_codigo_inep',
      'idx_alunos_codigo_inep_anti_dup',
      'idx_alunos_cpf_anti_dup',
      'idx_prof_turmas_disciplina_unique',
      'idx_prof_turmas_polivalente_unique'
    );

  SELECT count(*) INTO v_canonicos
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_alunos_inep_unique',
      'idx_alunos_cpf_unique',
      'idx_professor_turmas_disciplina_unique',
      'idx_professor_turmas_polivalente_unique'
    );

  IF v_redundantes <> 0 THEN
    RAISE EXCEPTION 'fix-indices-duplicados: ainda restam % indice(s) redundante(s) apos o DROP.', v_redundantes;
  END IF;

  IF v_canonicos <> 4 THEN
    RAISE EXCEPTION 'fix-indices-duplicados: esperado 4 indices canonicos, encontrado %.', v_canonicos;
  END IF;

  RAISE NOTICE 'fix-indices-duplicados: OK — redundantes=0, canonicos=4.';
END $$;

COMMIT;
