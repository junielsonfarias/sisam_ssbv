-- Migration: Criar materialized view mv_sisam_media
-- Pre-calcula medias para cada aluno em resultados_consolidados
-- Data: 2026-03-28

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sisam_media AS
SELECT
  rc.id as resultado_id,
  rc.aluno_id,
  rc.escola_id,
  rc.turma_id,
  rc.ano_letivo,
  rc.serie,
  rc.presenca,
  rc.avaliacao_id,
  CASE
    WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('1','2','3','4','5') THEN 'anos_iniciais'
    WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6','7','8','9') THEN 'anos_finais'
    ELSE 'outro'
  END as tipo_ensino,
  CASE
    WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('1','2','3','4','5') THEN
      ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0, 2)
    ELSE
      ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0, 2)
  END as media_calculada,
  COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) as nota_lp,
  COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) as nota_mat,
  COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) as nota_ch,
  COALESCE(CAST(rc.nota_cn AS DECIMAL), 0) as nota_cn,
  COALESCE(CAST(rc.nota_producao AS DECIMAL), 0) as nota_producao
FROM resultados_consolidados rc;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sisam_media_id ON mv_sisam_media(resultado_id);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_ano ON mv_sisam_media(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_escola ON mv_sisam_media(escola_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_tipo ON mv_sisam_media(tipo_ensino, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_presenca ON mv_sisam_media(presenca, ano_letivo);

-- Para atualizar a view apos novas importacoes:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sisam_media;
