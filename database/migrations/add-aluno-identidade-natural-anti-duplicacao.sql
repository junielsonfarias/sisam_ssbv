-- ============================================================================
-- Migração: Identidade natural do aluno (anti-duplicação) — Gestor x Sisam
-- Data: 2026-06-21
-- Ciclo: FlowSchoolAgent — Ciclo 2 (CORREÇÃO)
-- Gap (Médio): Falta chave de identidade natural validada para impedir
--   duplicação real de alunos entre o cadastro mestre (Gestor) e as cargas
--   do ETL Sisam. Os índices UNIQUE parciais em codigo_inep_aluno/cpf já
--   existem no banco, mas não há validação de FORMATO da chave, e os campos
--   chegam quase sempre NULL — então a proteção fica inerte na prática.
--
-- Objetivo (banco, NÃO-DESTRUTIVO e IDEMPOTENTE):
--   1. Garantir os índices UNIQUE PARCIAIS em codigo_inep_aluno e cpf
--      (WHERE ... IS NOT NULL) — não tocam linhas NULL, não quebram cargas.
--   2. Adicionar CHECK de FORMATO da identidade natural como NOT VALID
--      (INEP = 12 dígitos; CPF = 11 dígitos), validando apenas escritas
--      futuras sem reprovar linhas legadas já existentes.
--
-- O QUE ESTA MIGRAÇÃO **NÃO** FAZ (vira PROPOSTA no relatório, exige decisão):
--   - NÃO torna INEP/CPF obrigatório (NOT NULL) — política futura.
--   - NÃO remove o índice UNIQUE de INEP duplicado
--     (idx_alunos_codigo_inep vs idx_alunos_inep_unique) — DROP = proposta.
--   - NÃO executa DELETE/UPDATE em massa para deduplicar.
--   - NÃO valida (VALIDATE CONSTRAINT) os CHECKs sobre o legado — proposta.
--
-- Idempotência: CREATE INDEX IF NOT EXISTS + bloco DO $$ que só adiciona o
--   CHECK quando ainda não existe. Reexecutável sem efeito colateral.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_alunos_codigo_inep_anti_dup;
--   DROP INDEX IF EXISTS idx_alunos_cpf_anti_dup;
--   ALTER TABLE alunos DROP CONSTRAINT IF EXISTS chk_alunos_inep_formato;
--   ALTER TABLE alunos DROP CONSTRAINT IF EXISTS chk_alunos_cpf_formato;
--   (Índices/constraints pré-existentes do schema não são tocados por este rollback.)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Índices UNIQUE parciais (anti-duplicação na fonte) — idempotentes.
--    Só protegem linhas com valor presente; NULLs escapam por design (parcial).
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_codigo_inep_anti_dup
  ON alunos (codigo_inep_aluno)
  WHERE codigo_inep_aluno IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_cpf_anti_dup
  ON alunos (cpf)
  WHERE cpf IS NOT NULL;

COMMENT ON INDEX idx_alunos_codigo_inep_anti_dup IS
  'Anti-duplicação: unicidade do código INEP do aluno quando preenchido (Gestor x Sisam).';
COMMENT ON INDEX idx_alunos_cpf_anti_dup IS
  'Anti-duplicação: unicidade do CPF do aluno quando preenchido (Gestor x Sisam).';

-- ----------------------------------------------------------------------------
-- 2) CHECK de FORMATO da identidade natural — NOT VALID (não reprova legado).
--    Diagnóstico antes de criar: quantas linhas existentes violariam o formato.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_inep_fora int;
  v_cpf_fora  int;
BEGIN
  IF to_regclass('public.alunos') IS NULL THEN
    RAISE NOTICE 'Tabela alunos inexistente — nada a fazer.';
    RETURN;
  END IF;

  SELECT count(*) INTO v_inep_fora
    FROM alunos
   WHERE codigo_inep_aluno IS NOT NULL
     AND codigo_inep_aluno !~ '^[0-9]{12}$';

  SELECT count(*) INTO v_cpf_fora
    FROM alunos
   WHERE cpf IS NOT NULL
     AND regexp_replace(cpf, '\D', '', 'g') !~ '^[0-9]{11}$';

  RAISE NOTICE 'Diagnóstico identidade natural: % linha(s) com INEP fora do formato (12 dígitos), % linha(s) com CPF fora do formato (11 dígitos). CHECKs criados como NOT VALID — não reprovam o legado.', v_inep_fora, v_cpf_fora;

  -- INEP: exatamente 12 dígitos quando presente.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.alunos'::regclass
       AND conname  = 'chk_alunos_inep_formato'
  ) THEN
    ALTER TABLE alunos
      ADD CONSTRAINT chk_alunos_inep_formato
      CHECK (codigo_inep_aluno IS NULL OR codigo_inep_aluno ~ '^[0-9]{12}$')
      NOT VALID;
    RAISE NOTICE 'CHECK chk_alunos_inep_formato criado (NOT VALID).';
  ELSE
    RAISE NOTICE 'CHECK chk_alunos_inep_formato já existe — pulando.';
  END IF;

  -- CPF: exatamente 11 dígitos (ignorando pontuação) quando presente.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.alunos'::regclass
       AND conname  = 'chk_alunos_cpf_formato'
  ) THEN
    ALTER TABLE alunos
      ADD CONSTRAINT chk_alunos_cpf_formato
      CHECK (cpf IS NULL OR regexp_replace(cpf, '\D', '', 'g') ~ '^[0-9]{11}$')
      NOT VALID;
    RAISE NOTICE 'CHECK chk_alunos_cpf_formato criado (NOT VALID).';
  ELSE
    RAISE NOTICE 'CHECK chk_alunos_cpf_formato já existe — pulando.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Verificação final — falha (rollback) se os objetos esperados não existem.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.idx_alunos_codigo_inep_anti_dup') IS NULL
     OR to_regclass('public.idx_alunos_cpf_anti_dup') IS NULL THEN
    RAISE EXCEPTION 'Índices UNIQUE parciais de identidade natural não convergiram.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid='public.alunos'::regclass
                    AND conname='chk_alunos_inep_formato')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint
                     WHERE conrelid='public.alunos'::regclass
                       AND conname='chk_alunos_cpf_formato') THEN
    RAISE EXCEPTION 'CHECKs de formato da identidade natural não convergiram.';
  END IF;

  RAISE NOTICE 'OK: identidade natural do aluno reforçada (índices UNIQUE parciais + CHECKs de formato NOT VALID).';
END $$;

COMMIT;
