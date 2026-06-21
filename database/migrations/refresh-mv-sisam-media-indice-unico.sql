-- Migration: Garantir indice unico em mv_sisam_media (pre-requisito para REFRESH CONCURRENTLY)
-- Contexto: ao final do fluxo de importacao do Sisam (Fase 10 - validarImportacao) o
--           orquestrador executa REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sisam_media
--           para manter o painel do Semed sincronizado. O REFRESH CONCURRENTLY exige
--           um indice UNICO na materialized view.
-- Caracteristica: idempotente e nao destrutiva (so cria o indice se faltar).
-- Data: 2026-06-21

DO $$
BEGIN
  -- So executa se a materialized view existir
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_sisam_media'
  ) THEN
    -- Cria o indice unico apenas se ainda nao existir nenhum indice unico na MV
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE tablename = 'mv_sisam_media'
        AND indexname = 'idx_mv_sisam_media_id'
    ) THEN
      CREATE UNIQUE INDEX idx_mv_sisam_media_id ON mv_sisam_media (resultado_id);
    END IF;
  END IF;
END
$$;
