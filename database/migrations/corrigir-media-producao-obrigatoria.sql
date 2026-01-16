-- ============================================
-- MIGRACAO: Corrigir calculo de media_aluno - Producao OBRIGATORIA
-- Data: 2026-01-16
-- ============================================
--
-- PROBLEMA IDENTIFICADO:
-- Alunos do 2, 3 e 5 ano PRESENTES estao tendo media calculada
-- sem considerar a producao textual quando ela esta NULL.
--
-- Exemplo: DAVID JAYLLER TAVARES DOS SANTOS - 2 ANO
-- - LP=8.57, MAT=9.29, PROD=NULL
-- - Media INCORRETA: (8.57 + 9.29) / 2 = 8.93 (ignora PROD)
-- - Media CORRETA: (8.57 + 9.29 + 0) / 3 = 5.95 (PROD obrigatoria)
--
-- REGRA DE NEGOCIO:
-- Para alunos PRESENTES dos Anos Iniciais (2, 3, 5 ano),
-- a Producao Textual e OBRIGATORIA. Se nao houver nota,
-- deve contar como 0 (zero) na media.
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
  -- Anos Iniciais (2, 3, 5): (LP + MAT + PROD) / 3 (OBRIGATORIAS)
  -- Anos Finais (6, 7, 8, 9): (LP + MAT + CH + CN) / 4 (OBRIGATORIAS)
  CASE
    WHEN REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
      -- Anos Iniciais: media de LP, MAT e PROD (OBRIGATORIAS - divisor fixo 3)
      -- Se aluno presente sem nota de producao, conta como 0 na media
      ROUND(
        (
          COALESCE(CAST(nota_lp AS DECIMAL), 0) +
          COALESCE(CAST(nota_mat AS DECIMAL), 0) +
          COALESCE(CAST(nota_producao AS DECIMAL), 0)
        ) / 3.0,
        2
      )
    ELSE
      -- Anos Finais: media de LP, CH, MAT e CN (OBRIGATORIAS - divisor fixo 4)
      ROUND(
        (
          COALESCE(CAST(nota_lp AS DECIMAL), 0) +
          COALESCE(CAST(nota_ch AS DECIMAL), 0) +
          COALESCE(CAST(nota_mat AS DECIMAL), 0) +
          COALESCE(CAST(nota_cn AS DECIMAL), 0)
        ) / 4.0,
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
   - Anos Iniciais (2, 3, 5): media = (LP + MAT + PROD) / 3 (OBRIGATORIAS)
   - Anos Finais (6-9): media = (LP + CH + MAT + CN) / 4 (OBRIGATORIAS)
   Se uma disciplina nao tem nota, conta como 0 no numerador.
   Todas as medias sao arredondadas para 2 casas decimais (ROUND(..., 2)).';
