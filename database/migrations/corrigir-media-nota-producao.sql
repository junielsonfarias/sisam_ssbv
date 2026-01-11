-- ============================================
-- MIGRACAO: Corrigir media_aluno para incluir nota_producao
-- Data: 2026-01-11
-- ============================================
--
-- PROBLEMA IDENTIFICADO:
-- A VIEW resultados_consolidados_v2 calcula media_aluno apenas com LP e MAT
-- para anos iniciais, mas deveria incluir nota_producao quando disponível.
--
-- Esta migração corrige o cálculo da média para Anos Iniciais:
-- - Se nota_producao existir: média de LP, MAT, PT
-- - Se não existir: média de LP, MAT
--
-- Para Anos Finais permanece: média de LP, CH, MAT, CN
-- ============================================

-- ============================================
-- ETAPA 1: Recriar VIEW resultados_consolidados_v2
-- com media_aluno incluindo nota_producao
-- ============================================
CREATE OR REPLACE VIEW resultados_consolidados_v2 AS
WITH questoes_serie AS (
  SELECT
    aluno_id,
    escola_id,
    turma_id,
    ano_letivo,
    serie,
    questao_codigo,
    acertou,
    nota,
    presenca,
    area_conhecimento,
    disciplina,
    criado_em,
    atualizado_em,
    -- Extrair numero da serie (ex: '3o Ano' -> '3', '9o Ano' -> '9')
    REGEXP_REPLACE(serie, '[^0-9]', '', 'g') as numero_serie,
    -- Extrair numero da questao (ex: 'Q15' -> 15)
    CASE
      WHEN questao_codigo ~ '^Q[0-9]+$'
      THEN CAST(SUBSTRING(questao_codigo FROM 2) AS INTEGER)
      ELSE NULL
    END as numero_questao
  FROM resultados_provas
  WHERE aluno_id IS NOT NULL
),
notas_calculadas AS (
  SELECT
    aluno_id,
    escola_id,
    turma_id,
    ano_letivo,
    serie,
    numero_serie,
    MAX(presenca) as presenca,

    -- ============================================
    -- TOTAL ACERTOS LP - considera a serie
    -- Anos iniciais (2,3,5): Q1-Q14
    -- Anos finais (6,7,8,9): Q1-Q20 OU area_conhecimento/disciplina
    -- ============================================
    SUM(CASE
      WHEN numero_serie IN ('2', '3', '5') THEN
        -- Anos iniciais: LP = Q1 a Q14
        CASE WHEN numero_questao BETWEEN 1 AND 14 THEN
          CASE WHEN acertou = true THEN 1 ELSE 0 END
        ELSE 0 END
      ELSE
        -- Anos finais: LP = Q1 a Q20 OU por area/disciplina
        CASE WHEN
          (area_conhecimento ILIKE '%portugues%' OR area_conhecimento ILIKE '%portuguesa%' OR area_conhecimento ILIKE '%LP%'
           OR disciplina ILIKE '%portugues%' OR disciplina ILIKE '%portuguesa%' OR disciplina ILIKE '%LP%')
          OR (numero_questao BETWEEN 1 AND 20)
        THEN CASE WHEN acertou = true THEN 1 ELSE 0 END
        ELSE 0 END
    END)::INTEGER as total_acertos_lp,

    -- ============================================
    -- TOTAL ACERTOS MAT - considera a serie
    -- 2o/3o ano: Q15-Q28 (14 questoes)
    -- 5o ano: Q15-Q34 (20 questoes)
    -- Anos finais: Q31-Q50 OU area_conhecimento/disciplina
    -- ============================================
    SUM(CASE
      WHEN numero_serie IN ('2', '3') THEN
        -- 2o/3o ano: MAT = Q15 a Q28
        CASE WHEN numero_questao BETWEEN 15 AND 28 THEN
          CASE WHEN acertou = true THEN 1 ELSE 0 END
        ELSE 0 END
      WHEN numero_serie = '5' THEN
        -- 5o ano: MAT = Q15 a Q34
        CASE WHEN numero_questao BETWEEN 15 AND 34 THEN
          CASE WHEN acertou = true THEN 1 ELSE 0 END
        ELSE 0 END
      ELSE
        -- Anos finais: MAT = Q31 a Q50 OU por area/disciplina
        CASE WHEN
          (area_conhecimento ILIKE '%matematica%' OR area_conhecimento ILIKE '%MAT%'
           OR disciplina ILIKE '%matematica%' OR disciplina ILIKE '%MAT%')
          OR (numero_questao BETWEEN 31 AND 50)
        THEN CASE WHEN acertou = true THEN 1 ELSE 0 END
        ELSE 0 END
    END)::INTEGER as total_acertos_mat,

    -- ============================================
    -- TOTAL ACERTOS CH - apenas anos finais
    -- Anos iniciais: sempre 0
    -- Anos finais: Q21-Q30 OU area_conhecimento/disciplina
    -- ============================================
    SUM(CASE
      WHEN numero_serie IN ('2', '3', '5') THEN 0
      ELSE
        CASE WHEN
          (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%'
           OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%')
          OR (numero_questao BETWEEN 21 AND 30)
        THEN CASE WHEN acertou = true THEN 1 ELSE 0 END
        ELSE 0 END
    END)::INTEGER as total_acertos_ch,

    -- ============================================
    -- TOTAL ACERTOS CN - apenas anos finais
    -- Anos iniciais: sempre 0
    -- Anos finais: Q51-Q60 OU area_conhecimento/disciplina
    -- ============================================
    SUM(CASE
      WHEN numero_serie IN ('2', '3', '5') THEN 0
      ELSE
        CASE WHEN
          (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%'
           OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%')
          OR (numero_questao BETWEEN 51 AND 60)
        THEN CASE WHEN acertou = true THEN 1 ELSE 0 END
        ELSE 0 END
    END)::INTEGER as total_acertos_cn,

    -- ============================================
    -- TOTAL DE QUESTOES RESPONDIDAS POR DISCIPLINA
    -- (para calcular a nota corretamente)
    -- ============================================
    SUM(CASE
      WHEN numero_serie IN ('2', '3', '5') THEN
        CASE WHEN numero_questao BETWEEN 1 AND 14 THEN 1 ELSE 0 END
      ELSE
        CASE WHEN
          (area_conhecimento ILIKE '%portugues%' OR area_conhecimento ILIKE '%portuguesa%' OR area_conhecimento ILIKE '%LP%'
           OR disciplina ILIKE '%portugues%' OR disciplina ILIKE '%portuguesa%' OR disciplina ILIKE '%LP%')
          OR (numero_questao BETWEEN 1 AND 20)
        THEN 1 ELSE 0 END
    END) as total_questoes_lp,

    SUM(CASE
      WHEN numero_serie IN ('2', '3') THEN
        CASE WHEN numero_questao BETWEEN 15 AND 28 THEN 1 ELSE 0 END
      WHEN numero_serie = '5' THEN
        CASE WHEN numero_questao BETWEEN 15 AND 34 THEN 1 ELSE 0 END
      ELSE
        CASE WHEN
          (area_conhecimento ILIKE '%matematica%' OR area_conhecimento ILIKE '%MAT%'
           OR disciplina ILIKE '%matematica%' OR disciplina ILIKE '%MAT%')
          OR (numero_questao BETWEEN 31 AND 50)
        THEN 1 ELSE 0 END
    END) as total_questoes_mat,

    SUM(CASE
      WHEN numero_serie IN ('2', '3', '5') THEN 0
      ELSE
        CASE WHEN
          (area_conhecimento ILIKE '%humanas%' OR area_conhecimento ILIKE '%CH%'
           OR disciplina ILIKE '%humanas%' OR disciplina ILIKE '%CH%')
          OR (numero_questao BETWEEN 21 AND 30)
        THEN 1 ELSE 0 END
    END) as total_questoes_ch,

    SUM(CASE
      WHEN numero_serie IN ('2', '3', '5') THEN 0
      ELSE
        CASE WHEN
          (area_conhecimento ILIKE '%natureza%' OR area_conhecimento ILIKE '%CN%'
           OR disciplina ILIKE '%natureza%' OR disciplina ILIKE '%CN%')
          OR (numero_questao BETWEEN 51 AND 60)
        THEN 1 ELSE 0 END
    END) as total_questoes_cn,

    MIN(criado_em) as criado_em,
    MAX(atualizado_em) as atualizado_em

  FROM questoes_serie
  GROUP BY aluno_id, escola_id, turma_id, ano_letivo, serie, numero_serie
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

  -- NOTA LP: acertos / questoes esperadas * 10
  CASE
    WHEN total_questoes_lp > 0 THEN
      ROUND((total_acertos_lp::DECIMAL / total_questoes_lp) * 10, 2)
    ELSE NULL
  END as nota_lp,

  -- NOTA CH: apenas para anos finais
  CASE
    WHEN numero_serie IN ('2', '3', '5') THEN NULL
    WHEN total_questoes_ch > 0 THEN
      ROUND((total_acertos_ch::DECIMAL / total_questoes_ch) * 10, 2)
    ELSE NULL
  END as nota_ch,

  -- NOTA MAT: acertos / questoes esperadas * 10
  CASE
    WHEN total_questoes_mat > 0 THEN
      ROUND((total_acertos_mat::DECIMAL / total_questoes_mat) * 10, 2)
    ELSE NULL
  END as nota_mat,

  -- NOTA CN: apenas para anos finais
  CASE
    WHEN numero_serie IN ('2', '3', '5') THEN NULL
    WHEN total_questoes_cn > 0 THEN
      ROUND((total_acertos_cn::DECIMAL / total_questoes_cn) * 10, 2)
    ELSE NULL
  END as nota_cn,

  -- NOTA PRODUCAO: NULL por padrao (sera preenchida via resultados_consolidados)
  NULL::DECIMAL(5,2) as nota_producao,

  -- MEDIA: media das notas disponiveis (CORRIGIDO para incluir nota_producao quando disponível)
  -- A nota_producao vem de resultados_consolidados via JOIN na view unificada
  -- Aqui calculamos apenas LP e MAT para anos iniciais (nota_producao será adicionada na view unificada)
  CASE
    WHEN numero_serie IN ('2', '3', '5') THEN
      -- Anos iniciais: media de LP e MAT (nota_producao será incorporada na view unificada)
      ROUND(
        (
          CASE WHEN total_questoes_lp > 0 THEN (total_acertos_lp::DECIMAL / total_questoes_lp) * 10 ELSE 0 END +
          CASE WHEN total_questoes_mat > 0 THEN (total_acertos_mat::DECIMAL / total_questoes_mat) * 10 ELSE 0 END
        ) /
        NULLIF(
          CASE WHEN total_questoes_lp > 0 THEN 1 ELSE 0 END +
          CASE WHEN total_questoes_mat > 0 THEN 1 ELSE 0 END,
          0
        ),
        2
      )
    ELSE
      -- Anos finais: media de LP, CH, MAT, CN
      ROUND(
        (
          CASE WHEN total_questoes_lp > 0 THEN (total_acertos_lp::DECIMAL / total_questoes_lp) * 10 ELSE 0 END +
          CASE WHEN total_questoes_ch > 0 THEN (total_acertos_ch::DECIMAL / total_questoes_ch) * 10 ELSE 0 END +
          CASE WHEN total_questoes_mat > 0 THEN (total_acertos_mat::DECIMAL / total_questoes_mat) * 10 ELSE 0 END +
          CASE WHEN total_questoes_cn > 0 THEN (total_acertos_cn::DECIMAL / total_questoes_cn) * 10 ELSE 0 END
        ) /
        NULLIF(
          CASE WHEN total_questoes_lp > 0 THEN 1 ELSE 0 END +
          CASE WHEN total_questoes_ch > 0 THEN 1 ELSE 0 END +
          CASE WHEN total_questoes_mat > 0 THEN 1 ELSE 0 END +
          CASE WHEN total_questoes_cn > 0 THEN 1 ELSE 0 END,
          0
        ),
        2
      )
  END as media_aluno,

  criado_em,
  atualizado_em

FROM notas_calculadas;

-- ============================================
-- ETAPA 2: Recriar VIEW unificada com media corrigida
-- A media_aluno agora inclui nota_producao para anos iniciais
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
  -- NOTA PRODUCAO: usar da tabela resultados_consolidados
  rc.nota_producao as nota_producao,
  -- MEDIA ALUNO CORRIGIDA: para anos iniciais, recalcular incluindo nota_producao
  CASE
    WHEN REGEXP_REPLACE(COALESCE(v2.serie, rc.serie), '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
      -- Anos Iniciais: recalcular média incluindo nota_producao
      ROUND(
        (
          COALESCE(COALESCE(v2.nota_lp, rc.nota_lp), 0) +
          COALESCE(COALESCE(v2.nota_mat, rc.nota_mat), 0) +
          COALESCE(rc.nota_producao, 0)
        ) /
        NULLIF(
          CASE WHEN COALESCE(v2.nota_lp, rc.nota_lp) IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN COALESCE(v2.nota_mat, rc.nota_mat) IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN rc.nota_producao IS NOT NULL THEN 1 ELSE 0 END,
          0
        ),
        2
      )
    ELSE
      -- Anos Finais: usar média original
      COALESCE(v2.media_aluno, rc.media_aluno)
  END as media_aluno,
  COALESCE(v2.criado_em, rc.criado_em) as criado_em,
  COALESCE(v2.atualizado_em, rc.atualizado_em) as atualizado_em
FROM resultados_consolidados_v2 v2
FULL OUTER JOIN resultados_consolidados rc
  ON v2.aluno_id = rc.aluno_id
  AND v2.ano_letivo = rc.ano_letivo;

-- ============================================
-- ETAPA 3: Atualizar comentarios
-- ============================================
COMMENT ON VIEW resultados_consolidados_v2 IS
  'VIEW que calcula dados consolidados dinamicamente considerando a estrutura de questoes por serie. Anos iniciais (2,3,5): LP=Q1-Q14, MAT varia. Anos finais (6-9): LP=Q1-Q20, CH=Q21-Q30, MAT=Q31-Q50, CN=Q51-Q60. Inclui campo nota_producao (NULL, preenchido via resultados_consolidados).';

COMMENT ON VIEW resultados_consolidados_unificada IS
  'VIEW unificada que usa resultados_consolidados_v2 quando disponivel, ou resultados_consolidados como fallback. media_aluno para anos iniciais inclui nota_producao quando disponível. Prioriza dados calculados dinamicamente.';
