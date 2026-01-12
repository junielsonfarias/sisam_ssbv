-- ============================================
-- MIGRACAO: Corrigir calculo de media_aluno na VIEW unificada
-- para incluir nota_producao nos Anos Iniciais
-- ============================================
--
-- PROBLEMA IDENTIFICADO:
-- A media_aluno armazenada na tabela pode estar incorreta ou
-- com arredondamento diferente (1 casa decimal vs 2 casas decimais)
--
-- Exemplo: Julia Caoline - LP=7.86, MAT=8.57, PROD=6.00
-- - Media incorreta: 7.50 (arredondado para 1 casa)
-- - Media correta: 7.48 (arredondado para 2 casas)
--
-- Esta migracao recria a VIEW para calcular media_aluno dinamicamente:
-- - Anos Iniciais (2, 3, 5): media = (LP + MAT + PROD) / 3
-- - Anos Finais (6-9): media = (LP + CH + MAT + CN) / 4
-- Todas as medias com ROUND(..., 2) para consistencia
-- ============================================

-- ============================================
-- ETAPA 1: Recriar VIEW unificada com calculo correto
-- ============================================
CREATE OR REPLACE VIEW resultados_consolidados_unificada AS
SELECT
  aluno_id,
  escola_id,
  turma_id,
  ano_letivo,
  serie,
  presenca::text AS presenca,
  total_acertos_lp,
  total_acertos_ch,
  total_acertos_mat,
  total_acertos_cn,
  nota_lp,
  nota_ch,
  nota_mat,
  nota_cn,
  nota_producao,

  -- MEDIA ALUNO: Recalcular dinamicamente com 2 casas decimais
  -- Anos Iniciais (2, 3, 5): (LP + MAT + PROD) / quantidade de notas validas
  -- Anos Finais (6, 7, 8, 9): (LP + MAT + CH + CN) / quantidade de notas validas
  CASE
    WHEN REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
      -- Anos Iniciais: media de LP, MAT e PROD
      ROUND(
        (
          COALESCE(CAST(nota_lp AS DECIMAL), 0) +
          COALESCE(CAST(nota_mat AS DECIMAL), 0) +
          COALESCE(CAST(nota_producao AS DECIMAL), 0)
        ) /
        NULLIF(
          CASE WHEN nota_lp IS NOT NULL AND CAST(nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
          CASE WHEN nota_mat IS NOT NULL AND CAST(nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
          CASE WHEN nota_producao IS NOT NULL AND CAST(nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
          0
        ),
        2
      )
    ELSE
      -- Anos Finais: media de LP, CH, MAT e CN
      ROUND(
        (
          COALESCE(CAST(nota_lp AS DECIMAL), 0) +
          COALESCE(CAST(nota_ch AS DECIMAL), 0) +
          COALESCE(CAST(nota_mat AS DECIMAL), 0) +
          COALESCE(CAST(nota_cn AS DECIMAL), 0)
        ) /
        NULLIF(
          CASE WHEN nota_lp IS NOT NULL AND CAST(nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
          CASE WHEN nota_ch IS NOT NULL AND CAST(nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
          CASE WHEN nota_mat IS NOT NULL AND CAST(nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
          CASE WHEN nota_cn IS NOT NULL AND CAST(nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
          0
        ),
        2
      )
  END as media_aluno,

  criado_em,
  atualizado_em
FROM resultados_consolidados;

-- ============================================
-- ETAPA 2: Atualizar comentario da VIEW
-- ============================================
COMMENT ON VIEW resultados_consolidados_unificada IS
  'VIEW que calcula media_aluno dinamicamente a partir da tabela resultados_consolidados.
   IMPORTANTE: media_aluno e recalculada com formula correta por serie:
   - Anos Iniciais (2, 3, 5): media = (LP + MAT + PROD) / qtd notas validas
   - Anos Finais (6-9): media = (LP + CH + MAT + CN) / qtd notas validas
   Todas as medias sao arredondadas para 2 casas decimais (ROUND(..., 2)).';
