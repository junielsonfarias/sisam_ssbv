-- ============================================
-- MIGRAÇÃO: Unificar resultados_consolidados e resultados_provas
-- ============================================
-- Esta migração cria uma VIEW que calcula os dados consolidados
-- dinamicamente a partir de resultados_provas, eliminando a necessidade
-- de manter duas tabelas separadas.

-- ============================================
-- ETAPA 1: Criar VIEW resultados_consolidados_v2
-- ============================================
-- Esta VIEW calcula os dados consolidados dinamicamente
CREATE OR REPLACE VIEW resultados_consolidados_v2 AS
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
            SUM(CASE WHEN (area_conhecimento ILIKE '%português%' OR area_conhecimento ILIKE '%LP%' OR disciplina ILIKE '%português%' OR disciplina ILIKE '%LP%') OR (questao_codigo ~ '^Q([1-9]|1[0-9]|20)$') THEN 1 ELSE 0 END)) * 10
      ELSE NULL
    END, 2
  ) as nota_lp,
  
  ROUND(
    CASE 
      WHEN SUM(CASE WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%') OR (questao_codigo ~ '^Q(2[1-9]|30)$') THEN 1 ELSE 0 END) > 0
      THEN (SUM(CASE WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%') OR (questao_codigo ~ '^Q(2[1-9]|30)$') THEN CASE WHEN acertou = true THEN nota ELSE 0 END ELSE 0 END) / 
            SUM(CASE WHEN (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%' OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%') OR (questao_codigo ~ '^Q(2[1-9]|30)$') THEN 1 ELSE 0 END)) * 10
      ELSE NULL
    END, 2
  ) as nota_ch,
  
  ROUND(
    CASE 
      WHEN SUM(CASE WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%') OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$') THEN 1 ELSE 0 END) > 0
      THEN (SUM(CASE WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%') OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$') THEN CASE WHEN acertou = true THEN nota ELSE 0 END ELSE 0 END) / 
            SUM(CASE WHEN (area_conhecimento ILIKE '%matemática%' OR area_conhecimento ILIKE '%MAT%' OR disciplina ILIKE '%matemática%' OR disciplina ILIKE '%MAT%') OR (questao_codigo ~ '^Q(3[1-9]|4[0-9]|50)$') THEN 1 ELSE 0 END)) * 10
      ELSE NULL
    END, 2
  ) as nota_mat,
  
  ROUND(
    CASE 
      WHEN SUM(CASE WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%') OR (questao_codigo ~ '^Q(5[1-9]|60)$') THEN 1 ELSE 0 END) > 0
      THEN (SUM(CASE WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%') OR (questao_codigo ~ '^Q(5[1-9]|60)$') THEN CASE WHEN acertou = true THEN nota ELSE 0 END ELSE 0 END) / 
            SUM(CASE WHEN (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%' OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%') OR (questao_codigo ~ '^Q(5[1-9]|60)$') THEN 1 ELSE 0 END)) * 10
      ELSE NULL
    END, 2
  ) as nota_cn,
  
  -- Média geral (média de todas as notas)
  ROUND(AVG(CASE WHEN acertou = true THEN nota ELSE 0 END) * 10, 2) as media_aluno,
  
  -- Timestamps
  MIN(criado_em) as criado_em,
  MAX(atualizado_em) as atualizado_em
  
FROM resultados_provas
WHERE aluno_id IS NOT NULL
GROUP BY aluno_id, escola_id, turma_id, ano_letivo, serie;

-- ============================================
-- ETAPA 2: Criar VIEW unificada com fallback
-- ============================================
-- Esta VIEW usa resultados_consolidados_v2 se houver dados em resultados_provas,
-- caso contrário usa a tabela resultados_consolidados (fallback)
-- Prioriza dados calculados dinamicamente quando disponíveis
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
  COALESCE(v2.media_aluno, rc.media_aluno) as media_aluno,
  COALESCE(v2.criado_em, rc.criado_em) as criado_em,
  COALESCE(v2.atualizado_em, rc.atualizado_em) as atualizado_em
FROM resultados_consolidados_v2 v2
FULL OUTER JOIN resultados_consolidados rc 
  ON v2.aluno_id = rc.aluno_id 
  AND v2.ano_letivo = rc.ano_letivo;

-- ============================================
-- ETAPA 3: Criar índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_resultados_provas_aluno_ano 
  ON resultados_provas(aluno_id, ano_letivo);

CREATE INDEX IF NOT EXISTS idx_resultados_provas_questao_codigo 
  ON resultados_provas(questao_codigo);

CREATE INDEX IF NOT EXISTS idx_resultados_provas_area_conhecimento 
  ON resultados_provas(area_conhecimento);

-- ============================================
-- ETAPA 4: Comentários e documentação
-- ============================================
COMMENT ON VIEW resultados_consolidados_v2 IS 
  'VIEW que calcula dados consolidados dinamicamente a partir de resultados_provas';

COMMENT ON VIEW resultados_consolidados_unificada IS 
  'VIEW unificada que usa resultados_consolidados_v2 quando disponível, ou resultados_consolidados como fallback';

