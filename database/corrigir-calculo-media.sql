-- ============================================
-- CORREÇÃO: Ajustar cálculo da média do aluno
-- ============================================
-- A média deve ser calculada como a média aritmética das 4 notas das disciplinas
-- (nota_lp + nota_ch + nota_mat + nota_cn) / 4
-- Em vez de calcular a média de todas as 60 questões

-- Recriar a VIEW resultados_consolidados_v2 com cálculo correto da média
CREATE OR REPLACE VIEW resultados_consolidados_v2 AS
WITH notas_calculadas AS (
  SELECT 
    aluno_id,
    escola_id,
    turma_id,
    ano_letivo,
    serie,
    MAX(presenca) as presenca,
    
    -- Totais de acertos por disciplina
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%português%' OR area_conhecimento ILIKE '%LP%' OR disciplina ILIKE '%português%' OR disciplina ILIKE '%LP%')
           OR (questao_codigo ~ '^Q([1-9]|1[0-9]|20)$')
      THEN CASE WHEN acertou = true THEN 1 ELSE 0 END 
      ELSE 0 
    END)::INTEGER as total_acertos_lp,
    
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%')
           OR (questao_codigo ~ '^Q(2[1-9]|30)$')
      THEN CASE WHEN acertou = true THEN 1 ELSE 0 END 
      ELSE 0 
    END)::INTEGER as total_acertos_ch,
    
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%')
           OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$')
      THEN CASE WHEN acertou = true THEN 1 ELSE 0 END 
      ELSE 0 
    END)::INTEGER as total_acertos_mat,
    
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%')
           OR (questao_codigo ~ '^Q(5[1-9]|60)$')
      THEN CASE WHEN acertou = true THEN 1 ELSE 0 END 
      ELSE 0 
    END)::INTEGER as total_acertos_cn,
    
    -- Notas por disciplina (calculadas a partir dos acertos)
    ROUND(
      CASE 
        WHEN SUM(CASE WHEN (area_conhecimento ILIKE '%português%' OR area_conhecimento ILIKE '%LP%' OR disciplina ILIKE '%português%' OR disciplina ILIKE '%LP%') OR (questao_codigo ~ '^Q([1-9]|1[0-9]|20)$') THEN 1 ELSE 0 END) > 0
        THEN (SUM(CASE WHEN (area_conhecimento ILIKE '%português%' OR area_conhecimento ILIKE '%LP%' OR disciplina ILIKE '%português%' OR disciplina ILIKE '%LP%') OR (questao_codigo ~ '^Q([1-9]|1[0-9]|20)$') THEN CASE WHEN acertou = true THEN nota ELSE 0 END ELSE 0 END) / 
              NULLIF(SUM(CASE WHEN (area_conhecimento ILIKE '%português%' OR area_conhecimento ILIKE '%LP%' OR disciplina ILIKE '%português%' OR disciplina ILIKE '%LP%') OR (questao_codigo ~ '^Q([1-9]|1[0-9]|20)$') THEN 1 ELSE 0 END), 0)) * 10
        ELSE NULL
      END, 2
    ) as nota_lp,
    
    ROUND(
      CASE 
        WHEN SUM(CASE WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%') OR (questao_codigo ~ '^Q(2[1-9]|30)$') THEN 1 ELSE 0 END) > 0
        THEN (SUM(CASE WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%') OR (questao_codigo ~ '^Q(2[1-9]|30)$') THEN CASE WHEN acertou = true THEN nota ELSE 0 END ELSE 0 END) / 
              NULLIF(SUM(CASE WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%') OR (questao_codigo ~ '^Q(2[1-9]|30)$') THEN 1 ELSE 0 END), 0)) * 10
        ELSE NULL
      END, 2
    ) as nota_ch,
    
    ROUND(
      CASE 
        WHEN SUM(CASE WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%') OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$') THEN 1 ELSE 0 END) > 0
        THEN (SUM(CASE WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%') OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$') THEN CASE WHEN acertou = true THEN nota ELSE 0 END ELSE 0 END) / 
              NULLIF(SUM(CASE WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%') OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$') THEN 1 ELSE 0 END), 0)) * 10
        ELSE NULL
      END, 2
    ) as nota_mat,
    
    ROUND(
      CASE 
        WHEN SUM(CASE WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%') OR (questao_codigo ~ '^Q(5[1-9]|60)$') THEN 1 ELSE 0 END) > 0
        THEN (SUM(CASE WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%') OR (questao_codigo ~ '^Q(5[1-9]|60)$') THEN CASE WHEN acertou = true THEN nota ELSE 0 END ELSE 0 END) / 
              NULLIF(SUM(CASE WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%') OR (questao_codigo ~ '^Q(5[1-9]|60)$') THEN 1 ELSE 0 END), 0)) * 10
        ELSE NULL
      END, 2
    ) as nota_cn,
    
    MIN(criado_em) as criado_em,
    MAX(atualizado_em) as atualizado_em
    
  FROM resultados_provas
  WHERE aluno_id IS NOT NULL
  GROUP BY aluno_id, escola_id, turma_id, ano_letivo, serie
)
SELECT 
  aluno_id,
  escola_id,
  turma_id,
  ano_letivo,
  serie,
  presenca,
  total_acertos_lp,
  total_acertos_ch,
  total_acertos_mat,
  total_acertos_cn,
  nota_lp,
  nota_ch,
  nota_mat,
  nota_cn,
  
  -- Média geral (média aritmética das 4 notas das disciplinas)
  -- Se alguma nota for NULL, calcula a média apenas das notas disponíveis
  ROUND(
    (
      COALESCE(nota_lp, 0) + 
      COALESCE(nota_ch, 0) + 
      COALESCE(nota_mat, 0) + 
      COALESCE(nota_cn, 0)
    ) / 
    NULLIF(
      CASE WHEN nota_lp IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN nota_ch IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN nota_mat IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN nota_cn IS NOT NULL THEN 1 ELSE 0 END,
      0
    ),
    2
  ) as media_aluno,
  
  criado_em,
  atualizado_em
  
FROM notas_calculadas;

-- Comentário explicativo
COMMENT ON VIEW resultados_consolidados_v2 IS 
  'VIEW que calcula dados consolidados dinamicamente a partir de resultados_provas. A média é calculada como a média aritmética das 4 notas das disciplinas.';

