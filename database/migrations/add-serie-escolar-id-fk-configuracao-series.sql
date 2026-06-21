-- Migration: serie_escolar_id (FK -> series_escolares) em configuracao_series
-- Data: 2026-06-21
-- ADR: ADR-004 (fonte canonica de series) — passo 1 do plano de migracao
-- Branch: auto/adr-implementacao
--
-- OBJETIVO
--   Fechar a ultima das tres representacoes de "serie" sem FK para o catalogo
--   canonico. Hoje configuracao_series.serie e um varchar livre ("1".."9") sem
--   vinculo com series_escolares (codigo/nome). Esta migration adiciona
--   serie_escolar_id (FK -> series_escolares, NULLABLE) em configuracao_series e
--   faz o backfill por match de nome/codigo, SEM dropar a coluna textual `serie`
--   (compatibilidade com o codigo de leitura/escrita existente).
--   Replica o padrao das migrations anteriores do ADR-004:
--     - add-serie-id-fk-turmas-alunos.sql (ciclo 1)
--     - add-serie-escolar-id-fk-series-escola.sql (ciclo 5)
--
-- CANONICA: `series_escolares` e o catalogo mestre de series. `serie_escolar_id`
--   aponta para ela. A coluna textual `serie` permanece como espelho legado ate a
--   evolucao das escritas; corte da coluna textual e item separado (passo 8 do ADR).
--
-- IDEMPOTENCIA
--   ADD COLUMN IF NOT EXISTS + DO-block que so cria a FK se ainda nao existir +
--   CREATE INDEX IF NOT EXISTS. O backfill so toca linhas com serie_escolar_id IS
--   NULL. Re-execucao e segura (no-op nas linhas ja vinculadas).
--
-- NAO-DESTRUTIVO
--   Nenhum DROP/DELETE/TRUNCATE. A coluna serie_escolar_id e NULLABLE (sem NOT
--   NULL), portanto nao quebra insercoes existentes. O backfill e UPDATE apenas
--   das linhas novas (serie_escolar_id NULL) por match exato de nome/codigo do
--   catalogo — nao altera linhas ja vinculadas nem a coluna textual `serie`.
--   Em configuracao_series o match prioriza o codigo (serie="1".."9") e o nome
--   (nome_serie="1º Ano"), ambos case/space-insensitive.
--
-- ROLLBACK (manual, se necessario):
--   ALTER TABLE configuracao_series DROP CONSTRAINT IF EXISTS fk_configuracao_series_serie_escolar_id;
--   ALTER TABLE configuracao_series DROP COLUMN IF EXISTS serie_escolar_id;
--   DROP INDEX IF EXISTS idx_configuracao_series_serie_escolar_id;

BEGIN;

-- 1. Coluna serie_escolar_id (NULLABLE) em configuracao_series
ALTER TABLE configuracao_series ADD COLUMN IF NOT EXISTS serie_escolar_id UUID;

-- 2. FK -> series_escolares (ON DELETE SET NULL: o catalogo nao deve apagar a
--    configuracao; apenas desreferenciar para tratamento posterior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_configuracao_series_serie_escolar_id'
  ) THEN
    ALTER TABLE configuracao_series
      ADD CONSTRAINT fk_configuracao_series_serie_escolar_id
      FOREIGN KEY (serie_escolar_id) REFERENCES series_escolares(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Indice de suporte aos joins/filtros por serie_escolar_id
CREATE INDEX IF NOT EXISTS idx_configuracao_series_serie_escolar_id
  ON configuracao_series(serie_escolar_id);

-- 4. Backfill por match de codigo/nome (so linhas ainda nao vinculadas)
--    Match: configuracao_series.serie = codigo do catalogo
--        OU configuracao_series.nome_serie = nome do catalogo (case/space-insensitive)
UPDATE configuracao_series cfg
SET serie_escolar_id = cat.id
FROM series_escolares cat
WHERE cfg.serie_escolar_id IS NULL
  AND (
        upper(btrim(cfg.serie)) = upper(btrim(cat.codigo))
     OR lower(btrim(cfg.nome_serie)) = lower(btrim(cat.nome))
      );

-- 5. Diagnostico: quantas linhas ficaram SEM vinculo (residuo para normalizacao)
DO $$
DECLARE
  v_orfa INT;
  v_total INT;
BEGIN
  SELECT count(*) INTO v_total FROM configuracao_series;
  SELECT count(*) INTO v_orfa
    FROM configuracao_series WHERE serie_escolar_id IS NULL;

  RAISE NOTICE 'Backfill configuracao_series.serie_escolar_id: total=%, sem vinculo=%',
    v_total, v_orfa;
  -- Nao falha: serie_escolar_id e NULLABLE de proposito. Residuos (textos fora do
  -- catalogo) sao registrados para normalizacao manual/proxima fase.
END $$;

COMMIT;
