-- ============================================================================
-- fix-notas-upsert-disciplina-null.sql
-- Data: 2026-06-21
-- Branch: auto/melhorias-recuperacao
-- Banco-alvo: educanet-demo (tbbnswuqsqhulserwtcc). Producao desvinculada.
--
-- Objetivo (MELHORIA B / Parte 1):
--   Garantir a deduplicacao correta do UPSERT de notas_escolares quando
--   disciplina_id IS NULL (ex.: parecer descritivo sem disciplina vinculada).
--
--   A UNIQUE padrao (aluno_id, disciplina_id, periodo_id) NAO deduplica linhas
--   com disciplina_id NULL — no Postgres, NULL nunca e "igual" a NULL num indice
--   UNIQUE comum, entao varios pareceres descritivos (disciplina_id NULL) do
--   mesmo aluno/periodo escapam da unicidade. Consequencia: o
--   `ON CONFLICT (aluno_id, disciplina_id, periodo_id)` do servico de lancamento
--   NUNCA casa para esses casos -> gera linhas DUPLICADAS em vez de atualizar.
--
--   Correcao ADITIVA e segura: indice UNIQUE de EXPRESSAO que normaliza o NULL
--   via COALESCE para um UUID sentinela. Assim (aluno, parecer-sem-disciplina,
--   periodo) passa a ser unico e o UPSERT pode inferir este indice usando o
--   MESMO conflict target COALESCE(...). A constraint UNIQUE antiga PERMANECE
--   (linhas com disciplina_id NOT NULL ficam cobertas por ambos — compativel).
--
-- Contexto: este indice JA existia no banco educanet-demo, porem SEM migration
--   versionada no repo (banco e repo divergiam). Esta migration FECHA essa
--   divergencia e torna o estado reproduzivel/idempotente.
--
-- Idempotencia: CREATE UNIQUE INDEX IF NOT EXISTS (no-op se ja existe).
-- Atomicidade: BEGIN/COMMIT.
--
-- Pre-condicao de seguranca: o indice UNIQUE so e criado se NAO houver
--   duplicatas sob a chave COALESCE (bloco de diagnostico aborta com EXCEPTION
--   se encontrar residuo — evita falha opaca de "could not create unique index").
--
-- ROLLBACK:
--   DROP INDEX IF EXISTS public.notas_escolares_upsert_uidx;
--   (e reverter o conflict target do codigo para a UNIQUE padrao)
-- ============================================================================

BEGIN;

-- Diagnostico defensivo: detectar duplicatas sob a chave normalizada ANTES de
-- tentar criar o indice UNIQUE (que falharia de forma opaca se houvesse residuo).
DO $$
DECLARE
  v_dups integer;
BEGIN
  SELECT count(*) INTO v_dups
  FROM (
    SELECT aluno_id,
           COALESCE(disciplina_id, '00000000-0000-0000-0000-000000000000'::uuid) AS d,
           periodo_id
    FROM public.notas_escolares
    GROUP BY 1, 2, 3
    HAVING count(*) > 1
  ) x;

  IF v_dups > 0 THEN
    RAISE EXCEPTION
      'fix-notas-upsert: % grupo(s) duplicado(s) sob (aluno_id, COALESCE(disciplina_id,sentinela), periodo_id). Sanear antes de criar o indice UNIQUE.', v_dups;
  END IF;

  RAISE NOTICE 'fix-notas-upsert: 0 duplicata sob a chave normalizada — seguro criar o indice.';
END $$;

-- Indice UNIQUE de expressao que normaliza disciplina_id NULL para sentinela.
-- Da suporte ao conflict target COALESCE(...) do UPSERT em
-- lib/services/notas/lancamento.ts e app/api/professor/sync/route.ts.
CREATE UNIQUE INDEX IF NOT EXISTS notas_escolares_upsert_uidx
  ON public.notas_escolares
  USING btree (aluno_id, COALESCE(disciplina_id, '00000000-0000-0000-0000-000000000000'::uuid), periodo_id);

-- Verificacao final: o indice canonico DEVE existir.
DO $$
DECLARE
  v_ok integer;
BEGIN
  SELECT count(*) INTO v_ok
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname = 'notas_escolares_upsert_uidx';

  IF v_ok <> 1 THEN
    RAISE EXCEPTION 'fix-notas-upsert: indice notas_escolares_upsert_uidx ausente apos a migration.';
  END IF;

  RAISE NOTICE 'fix-notas-upsert: OK — indice de upsert presente.';
END $$;

COMMIT;
