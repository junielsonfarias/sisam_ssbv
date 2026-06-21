-- ============================================================================
-- add-tabela-matriculas.sql
-- Data: 2026-06-21
-- ADR: ADR-002 — Tabela `matriculas` dedicada (registro imutavel por ano letivo)
-- Fase: 1 + 2 do plano de migracao (criar tabela aditiva + backfill).
--
-- OBJETIVO:
--   Criar a tabela `matriculas` como registro de um aluno em uma turma para um
--   ano letivo, com UNIQUE(aluno_id, ano_letivo_id). Mudanca ADITIVA: NAO
--   remove nem altera `alunos.turma_id` (que passa a ser atalho derivado).
--
--   Backfill a partir do estado atual de `alunos` (turma_id + ano_letivo_id +
--   serie_id + situacao + data_matricula). Apenas alunos com turma_id NOT NULL
--   geram matricula (no demo: 1578 de 1608). A trilha de `historico_situacao`
--   nao carrega turma_id por periodo, entao a fonte canonica do vinculo
--   turma<->ano e o proprio registro do aluno; quando alunos.data_matricula for
--   NULL, usa-se a data mais antiga de historico_situacao do aluno como fallback
--   (e, por fim, a data_inicio do ano letivo / CURRENT_DATE).
--
-- IDEMPOTENCIA:
--   * CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
--   * Constraint UNIQUE criada via bloco DO (so adiciona se ainda nao existir).
--   * Backfill com INSERT ... ON CONFLICT (aluno_id, ano_letivo_id) DO NOTHING:
--     reexecutar a migration nao duplica nem sobrescreve matriculas existentes.
--   * Diagnostico via RAISE NOTICE; nao aborta (dado de negocio, aditivo).
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.matriculas;
--   (A tabela e nova e aditiva; nenhuma coluna existente foi alterada, entao o
--    rollback nao afeta `alunos`, `turmas` nem `historico_situacao`.)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Tabela `matriculas` (aditiva — IF NOT EXISTS).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matriculas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES public.alunos(id)         ON DELETE RESTRICT,
  turma_id        UUID NOT NULL REFERENCES public.turmas(id)         ON DELETE RESTRICT,
  ano_letivo_id   UUID NOT NULL REFERENCES public.anos_letivos(id)   ON DELETE RESTRICT,
  serie_id        UUID          REFERENCES public.series_escolares(id) ON DELETE SET NULL,
  situacao        TEXT NOT NULL DEFAULT 'cursando',
  data_matricula  DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint UNIQUE(aluno_id, ano_letivo_id) — adicionada so se ainda nao existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_matriculas_aluno_ano'
      AND conrelid = 'public.matriculas'::regclass
  ) THEN
    ALTER TABLE public.matriculas
      ADD CONSTRAINT uq_matriculas_aluno_ano UNIQUE (aluno_id, ano_letivo_id);
    RAISE NOTICE 'Constraint uq_matriculas_aluno_ano criada.';
  ELSE
    RAISE NOTICE 'Constraint uq_matriculas_aluno_ano ja existe — no-op.';
  END IF;
END $$;

-- Indices de leitura (turma/ano sao filtros frequentes em boletim/frequencia).
CREATE INDEX IF NOT EXISTS idx_matriculas_aluno      ON public.matriculas (aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma      ON public.matriculas (turma_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_ano_letivo ON public.matriculas (ano_letivo_id);

-- ----------------------------------------------------------------------------
-- 2) Backfill a partir do estado atual de `alunos` (apenas com turma_id).
--    data_matricula: coalesce(alunos.data_matricula,
--                              min(historico_situacao.data) do aluno,
--                              anos_letivos.data_inicio,
--                              CURRENT_DATE)
--    ON CONFLICT DO NOTHING garante idempotencia.
-- ----------------------------------------------------------------------------
INSERT INTO public.matriculas
  (aluno_id, turma_id, ano_letivo_id, serie_id, situacao, data_matricula)
SELECT
  a.id,
  a.turma_id,
  a.ano_letivo_id,
  a.serie_id,
  COALESCE(a.situacao, 'cursando'),
  COALESCE(
    a.data_matricula,
    (SELECT MIN(h.data) FROM public.historico_situacao h WHERE h.aluno_id = a.id),
    al.data_inicio,
    CURRENT_DATE
  )
FROM public.alunos a
JOIN public.anos_letivos al ON al.id = a.ano_letivo_id
WHERE a.turma_id IS NOT NULL
ON CONFLICT ON CONSTRAINT uq_matriculas_aluno_ano DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3) Diagnostico final (nao aborta — operacao aditiva).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  total_matriculas BIGINT;
  total_aptos      BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_matriculas FROM public.matriculas;
  SELECT COUNT(*) INTO total_aptos
    FROM public.alunos WHERE turma_id IS NOT NULL;
  RAISE NOTICE 'matriculas: % linha(s) | alunos aptos (com turma): %.',
    total_matriculas, total_aptos;
END $$;

COMMIT;
