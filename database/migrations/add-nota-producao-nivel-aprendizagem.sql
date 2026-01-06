-- ============================================
-- MIGRAÇÃO: Adicionar nota_producao e nivel_aprendizagem
-- ============================================
-- Esta migração adiciona os campos nota_producao e nivel_aprendizagem
-- necessários para séries como 2º ano, 3º ano e 5º ano

-- ============================================
-- ETAPA 1: Adicionar colunas na tabela resultados_consolidados
-- ============================================
ALTER TABLE resultados_consolidados 
ADD COLUMN IF NOT EXISTS nota_producao DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS nivel_aprendizagem VARCHAR(50);

-- Comentários nas colunas
COMMENT ON COLUMN resultados_consolidados.nota_producao IS 'Nota de produção textual do aluno';
COMMENT ON COLUMN resultados_consolidados.nivel_aprendizagem IS 'Nível de aprendizagem do aluno (Insuficiente, Básico, Adequado, Avançado)';

-- ============================================
-- ETAPA 2: Atualizar VIEW resultados_consolidados_v2
-- ============================================
-- Adicionar cálculo de nota_producao se houver questões de produção textual
CREATE OR REPLACE VIEW resultados_consolidados_v2 AS
WITH notas_calculadas AS (
  SELECT 
    aluno_id,
    escola_id,
    turma_id,
    ano_letivo,
    serie,
    MAX(presenca) as presenca,
    
    -- Totais de acertos por disciplina (baseado em área_conhecimento ou número da questão)
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%português%' OR area_conhecimento ILIKE '%LP%' OR disciplina ILIKE '%português%' OR disciplina ILIKE '%LP%')
           OR (questao_codigo ~ '^Q([1-9]|1[0-9]|20)$') -- Q1 a Q20
      THEN CASE WHEN acertou = true THEN 1 ELSE 0 END 
      ELSE 0 
    END)::INTEGER as total_acertos_lp,
    
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%')
           OR (questao_codigo ~ '^Q(2[1-9]|30)$') -- Q21 a Q30
      THEN CASE WHEN acertou = true THEN 1 ELSE 0 END 
      ELSE 0 
    END)::INTEGER as total_acertos_ch,
    
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%')
           OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$') -- Q31 a Q50
      THEN CASE WHEN acertou = true THEN 1 ELSE 0 END 
      ELSE 0 
    END)::INTEGER as total_acertos_mat,
    
    SUM(CASE 
      WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%')
           OR (questao_codigo ~ '^Q(5[1-9]|60)$') -- Q51 a Q60
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
    
    -- Nota de produção textual (se houver questões específicas de produção)
    -- Pode ser calculada a partir de questões específicas ou campos adicionais
    NULL::DECIMAL(5,2) as nota_producao,
    
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
  nota_producao,
  
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

-- ============================================
-- ETAPA 3: Atualizar VIEW resultados_consolidados_unificada
-- ============================================
CREATE OR REPLACE VIEW resultados_consolidados_unificada AS
SELECT 
  COALESCE(v2.aluno_id, rc.aluno_id) as aluno_id,
  COALESCE(v2.escola_id, rc.escola_id) as escola_id,
  COALESCE(v2.turma_id, rc.turma_id) as turma_id,
  COALESCE(v2.ano_letivo, rc.ano_letivo) as ano_letivo,
  COALESCE(v2.serie, rc.serie) as serie,
  COALESCE(v2.presenca, rc.presenca) as presenca,
  COALESCE(v2.total_acertos_lp, rc.total_acertos_lp::INTEGER, 0) as total_acertos_lp,
  COALESCE(v2.total_acertos_ch, rc.total_acertos_ch::INTEGER, 0) as total_acertos_ch,
  COALESCE(v2.total_acertos_mat, rc.total_acertos_mat::INTEGER, 0) as total_acertos_mat,
  COALESCE(v2.total_acertos_cn, rc.total_acertos_cn::INTEGER, 0) as total_acertos_cn,
  COALESCE(v2.nota_lp, rc.nota_lp) as nota_lp,
  COALESCE(v2.nota_ch, rc.nota_ch) as nota_ch,
  COALESCE(v2.nota_mat, rc.nota_mat) as nota_mat,
  COALESCE(v2.nota_cn, rc.nota_cn) as nota_cn,
  COALESCE(v2.nota_producao, rc.nota_producao) as nota_producao,
  COALESCE(v2.media_aluno, rc.media_aluno) as media_aluno,
  COALESCE(rc.nivel_aprendizagem, NULL) as nivel_aprendizagem,
  COALESCE(v2.criado_em, rc.criado_em) as criado_em,
  COALESCE(v2.atualizado_em, rc.atualizado_em) as atualizado_em
FROM resultados_consolidados_v2 v2
FULL OUTER JOIN resultados_consolidados rc 
  ON v2.aluno_id = rc.aluno_id 
  AND v2.ano_letivo = rc.ano_letivo;

-- ============================================
-- ETAPA 4: Atualizar comentários
-- ============================================
COMMENT ON VIEW resultados_consolidados_v2 IS 
  'VIEW que calcula dados consolidados dinamicamente a partir de resultados_provas. Inclui nota_producao e suporta nivel_aprendizagem.';

COMMENT ON VIEW resultados_consolidados_unificada IS 
  'VIEW unificada que usa resultados_consolidados_v2 quando disponível, ou resultados_consolidados como fallback. Inclui nota_producao e nivel_aprendizagem.';






