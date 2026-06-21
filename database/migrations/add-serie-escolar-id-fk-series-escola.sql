-- Migration: serie_escolar_id (FK -> series_escolares) em series_escola
-- Data: 2026-06-21
-- Ciclo: FlowSchoolAgent ciclo 5 — Gestor Escolar (interno) -> catalogo de Series, fase CORRECAO
-- Branch: auto/fluxo-escolar
--
-- OBJETIVO
--   Eliminar a DUPLA FONTE DA VERDADE para "serie". Hoje series_escola.serie e um
--   varchar livre ("1º Ano".."9º Ano") sem vinculo com o catalogo canonico
--   series_escolares (codigo/nome). Isso permite divergencia (texto livre vs id) e
--   abre brecha de duplicacao logica que o FlowSchoolAgent precisa reconciliar a mao.
--   Esta migration adiciona serie_escolar_id (FK -> series_escolares, NULLABLE) em
--   series_escola e faz o backfill por match de nome/codigo, SEM dropar a coluna
--   textual `serie` (compatibilidade com o codigo de leitura/escrita existente).
--
-- CANONICA (decisao do ciclo): `series_escolares` e o catalogo mestre de series.
--   `serie_escolar_id` aponta para ela. A coluna textual `serie` permanece como
--   espelho legado ate a evolucao das escritas (proxima fase) preencher o id.
--   Alinhado ao ciclo 1 (turmas.serie_id / alunos.serie_id -> series_escolares).
--
-- IDEMPOTENCIA
--   ADD COLUMN IF NOT EXISTS + DO-block que so cria a FK se ainda nao existir +
--   CREATE INDEX IF NOT EXISTS. O backfill so toca linhas com serie_escolar_id IS
--   NULL. Re-execucao e segura (no-op nas linhas ja vinculadas).
--
-- NAO-DESTRUTIVO
--   Nenhum DROP/DELETE/TRUNCATE. A coluna serie_escolar_id e NULLABLE (sem NOT
--   NULL), portanto nao quebra insercoes existentes (o POST atual nao a preenche).
--   O backfill e UPDATE apenas das linhas novas (serie_escolar_id NULL) por match
--   exato de nome/codigo do catalogo — nao altera linhas ja vinculadas nem a
--   coluna textual `serie`.
--
-- PROPOSTAS PARA AS PROXIMAS FASES (NAO executadas aqui):
--   1. Evoluir o POST /api/admin/escolas/[id]/series para preencher serie_escolar_id
--      (resolver via series_escolares por nome/codigo no momento da escrita).
--   2. Avaliar UNIQUE (escola_id, serie_escolar_id, ano_letivo) e, no futuro,
--      tornar serie_escolar_id NOT NULL + deprecar a coluna textual `serie`.
--   3. ON CONFLICT do POST hoje e "ON CONFLICT DO NOTHING" apoiado no UNIQUE
--      textual (escola_id, serie, ano_letivo); migrar o conflito para o id exige
--      o passo 1 antes — caso contrario serie_escolar_id NULL escaparia do upsert.
--
-- ROLLBACK (manual, se necessario):
--   ALTER TABLE series_escola DROP CONSTRAINT IF EXISTS fk_series_escola_serie_escolar_id;
--   ALTER TABLE series_escola DROP COLUMN IF EXISTS serie_escolar_id;
--   DROP INDEX IF EXISTS idx_series_escola_serie_escolar_id;

BEGIN;

-- 1. Coluna serie_escolar_id (NULLABLE) em series_escola
ALTER TABLE series_escola ADD COLUMN IF NOT EXISTS serie_escolar_id UUID;

-- 2. FK -> series_escolares (ON DELETE SET NULL: o catalogo nao deve apagar o
--    vinculo escola<->serie; apenas desreferenciar para tratamento posterior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_series_escola_serie_escolar_id'
  ) THEN
    ALTER TABLE series_escola
      ADD CONSTRAINT fk_series_escola_serie_escolar_id
      FOREIGN KEY (serie_escolar_id) REFERENCES series_escolares(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Indice de suporte aos joins/filtros por serie_escolar_id
CREATE INDEX IF NOT EXISTS idx_series_escola_serie_escolar_id
  ON series_escola(serie_escolar_id);

-- 4. Backfill por match de nome/codigo (so linhas ainda nao vinculadas)
--    Match: serie textual = nome do catalogo OU = codigo do catalogo (case/space-insensitive)
UPDATE series_escola se
SET serie_escolar_id = cat.id
FROM series_escolares cat
WHERE se.serie_escolar_id IS NULL
  AND se.serie IS NOT NULL
  AND (
        lower(btrim(se.serie)) = lower(btrim(cat.nome))
     OR upper(btrim(se.serie)) = upper(btrim(cat.codigo))
      );

-- 5. Diagnostico: quantas linhas com serie textual ficaram SEM vinculo (residuo)
DO $$
DECLARE
  v_orfa INT;
  v_total INT;
BEGIN
  SELECT count(*) INTO v_total FROM series_escola WHERE serie IS NOT NULL;
  SELECT count(*) INTO v_orfa
    FROM series_escola WHERE serie IS NOT NULL AND serie_escolar_id IS NULL;

  RAISE NOTICE 'Backfill series_escola.serie_escolar_id: total com serie=%, sem vinculo=%',
    v_total, v_orfa;
  -- Nao falha: serie_escolar_id e NULLABLE de proposito. Residuos (ex.: textos
  -- fora do catalogo) sao registrados para normalizacao manual/proxima fase.
END $$;

COMMIT;
