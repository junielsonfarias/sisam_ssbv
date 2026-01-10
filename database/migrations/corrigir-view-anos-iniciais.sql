-- ============================================
-- MIGRAÇÃO: Corrigir VIEW para Anos Iniciais
-- ============================================
-- Esta migração corrige a VIEW resultados_consolidados_unificada para
-- priorizar os dados da tabela resultados_consolidados para Anos Iniciais,
-- onde as notas são importadas corretamente considerando a distribuição
-- de questões específica de cada série.
--
-- PROBLEMA: A VIEW resultados_consolidados_v2 calcula as notas usando
-- a distribuição de questões de Anos Finais (LP: Q1-Q20, MAT: Q31-Q50),
-- mas Anos Iniciais têm distribuição diferente:
-- - 2º/3º ano: LP: Q1-Q14, MAT: Q15-Q28 (14 questões cada)
-- - 5º ano: LP: Q1-Q14, MAT: Q15-Q34 (14 e 20 questões)

-- ============================================
-- ETAPA 1: Recriar VIEW unificada com lógica por série
-- ============================================
CREATE OR REPLACE VIEW resultados_consolidados_unificada AS
SELECT
  COALESCE(v2.aluno_id, rc.aluno_id) as aluno_id,
  COALESCE(v2.escola_id, rc.escola_id) as escola_id,
  COALESCE(v2.turma_id, rc.turma_id) as turma_id,
  COALESCE(v2.ano_letivo, rc.ano_letivo) as ano_letivo,
  COALESCE(v2.serie, rc.serie) as serie,
  COALESCE(v2.presenca, rc.presenca) as presenca,

  -- Para Anos Iniciais (2º, 3º, 5º), usar dados da tabela resultados_consolidados
  -- Para Anos Finais (6º-9º), usar dados da VIEW (calculados a partir de resultados_provas)
  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.total_acertos_lp::INTEGER, v2.total_acertos_lp, 0)
    ELSE COALESCE(v2.total_acertos_lp, rc.total_acertos_lp::INTEGER, 0)
  END as total_acertos_lp,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.total_acertos_ch::INTEGER, v2.total_acertos_ch, 0)
    ELSE COALESCE(v2.total_acertos_ch, rc.total_acertos_ch::INTEGER, 0)
  END as total_acertos_ch,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.total_acertos_mat::INTEGER, v2.total_acertos_mat, 0)
    ELSE COALESCE(v2.total_acertos_mat, rc.total_acertos_mat::INTEGER, 0)
  END as total_acertos_mat,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.total_acertos_cn::INTEGER, v2.total_acertos_cn, 0)
    ELSE COALESCE(v2.total_acertos_cn, rc.total_acertos_cn::INTEGER, 0)
  END as total_acertos_cn,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.nota_lp, v2.nota_lp)
    ELSE COALESCE(v2.nota_lp, rc.nota_lp)
  END as nota_lp,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.nota_ch, v2.nota_ch)
    ELSE COALESCE(v2.nota_ch, rc.nota_ch)
  END as nota_ch,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.nota_mat, v2.nota_mat)
    ELSE COALESCE(v2.nota_mat, rc.nota_mat)
  END as nota_mat,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.nota_cn, v2.nota_cn)
    ELSE COALESCE(v2.nota_cn, rc.nota_cn)
  END as nota_cn,

  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie)::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
    THEN COALESCE(rc.media_aluno, v2.media_aluno)
    ELSE COALESCE(v2.media_aluno, rc.media_aluno)
  END as media_aluno,

  COALESCE(v2.criado_em, rc.criado_em) as criado_em,
  COALESCE(v2.atualizado_em, rc.atualizado_em) as atualizado_em
FROM resultados_consolidados_v2 v2
FULL OUTER JOIN resultados_consolidados rc
  ON v2.aluno_id = rc.aluno_id
  AND v2.ano_letivo = rc.ano_letivo;

-- ============================================
-- COMENTÁRIO
-- ============================================
COMMENT ON VIEW resultados_consolidados_unificada IS
  'VIEW unificada que prioriza dados da tabela resultados_consolidados para Anos Iniciais (2º, 3º, 5º) e dados da VIEW resultados_consolidados_v2 para Anos Finais (6º-9º)';
