-- Migration: serie_id (FK -> series_escolares) em turmas e alunos
-- Data: 2026-06-21
-- Ciclo: FlowSchoolAgent ciclo 1 — Gestor (catalogo de series), fase CORRECAO
-- Branch: auto/fluxo-escolar
--
-- OBJETIVO
--   Eliminar o acoplamento textual (sem FK) entre turmas/alunos e o catalogo de
--   series. Hoje turmas.serie e alunos.serie sao varchar livres e a consistencia
--   e garantida apenas pela aplicacao (tripla fonte: series_escolares,
--   configuracao_series e series_escola).
--   Esta migration adiciona a coluna serie_id (FK -> series_escolares, NULLABLE)
--   em turmas e alunos e faz o backfill por match de nome/codigo, SEM dropar a
--   coluna textual `serie` (compatibilidade com codigo existente).
--   ADR de fonte canonica e consolidacao de configuracao_series em
--   series_escolares ficam para a Fase 2 (documentador-sisam).
--
-- CANONICA (decisao Fase 1): `series_escolares` e o catalogo mestre de series.
--   `serie_id` aponta para ela. Coluna textual `serie` permanece como espelho
--   legado ate a Fase 2.
--
-- IDEMPOTENCIA
--   ADD COLUMN IF NOT EXISTS + DO-block que so cria a FK se ainda nao existir.
--   Backfill so toca linhas com serie_id IS NULL. Re-execucao e segura.
--
-- NAO-DESTRUTIVO
--   Nenhum DROP/DELETE/TRUNCATE. A coluna serie_id e NULLABLE (sem NOT NULL),
--   portanto nao quebra insercoes existentes. Backfill e UPDATE apenas das
--   linhas novas (serie_id NULL) por match exato de nome/codigo do catalogo.
--
-- ROLLBACK (manual, se necessario):
--   ALTER TABLE turmas DROP CONSTRAINT IF EXISTS fk_turmas_serie_id;
--   ALTER TABLE turmas DROP COLUMN IF EXISTS serie_id;
--   ALTER TABLE alunos DROP CONSTRAINT IF EXISTS fk_alunos_serie_id;
--   ALTER TABLE alunos DROP COLUMN IF EXISTS serie_id;
--   DROP INDEX IF EXISTS idx_turmas_serie_id;
--   DROP INDEX IF EXISTS idx_alunos_serie_id;

BEGIN;

-- 1. Coluna serie_id (NULLABLE) em turmas e alunos
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS serie_id UUID;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS serie_id UUID;

-- 2. FK -> series_escolares (ON DELETE SET NULL: catalogo nao deve apagar turma/aluno)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_turmas_serie_id'
  ) THEN
    ALTER TABLE turmas
      ADD CONSTRAINT fk_turmas_serie_id
      FOREIGN KEY (serie_id) REFERENCES series_escolares(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_alunos_serie_id'
  ) THEN
    ALTER TABLE alunos
      ADD CONSTRAINT fk_alunos_serie_id
      FOREIGN KEY (serie_id) REFERENCES series_escolares(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Indices de suporte aos joins/filtros por serie_id
CREATE INDEX IF NOT EXISTS idx_turmas_serie_id ON turmas(serie_id);
CREATE INDEX IF NOT EXISTS idx_alunos_serie_id ON alunos(serie_id);

-- 4. Backfill por match de nome/codigo (so linhas ainda nao vinculadas)
--    Match: serie textual = nome do catalogo OU = codigo do catalogo (case/space-insensitive)
UPDATE turmas t
SET serie_id = se.id
FROM series_escolares se
WHERE t.serie_id IS NULL
  AND t.serie IS NOT NULL
  AND (
        lower(btrim(t.serie)) = lower(btrim(se.nome))
     OR upper(btrim(t.serie)) = upper(btrim(se.codigo))
      );

UPDATE alunos a
SET serie_id = se.id
FROM series_escolares se
WHERE a.serie_id IS NULL
  AND a.serie IS NOT NULL
  AND (
        lower(btrim(a.serie)) = lower(btrim(se.nome))
     OR upper(btrim(a.serie)) = upper(btrim(se.codigo))
      );

-- 5. Diagnostico: quantas linhas com serie textual ficaram SEM vinculo (residuo)
DO $$
DECLARE
  v_turmas_orfa INT;
  v_alunos_orfa INT;
BEGIN
  SELECT count(*) INTO v_turmas_orfa
    FROM turmas WHERE serie IS NOT NULL AND serie_id IS NULL;
  SELECT count(*) INTO v_alunos_orfa
    FROM alunos WHERE serie IS NOT NULL AND serie_id IS NULL;

  RAISE NOTICE 'Backfill serie_id: turmas sem vinculo=%, alunos sem vinculo=%',
    v_turmas_orfa, v_alunos_orfa;
  -- Nao falha: serie_id e NULLABLE de proposito (residuos sao tratados na Fase 2).
  -- Apenas registra para auditoria do que precisa de normalizacao manual.
END $$;

COMMIT;
