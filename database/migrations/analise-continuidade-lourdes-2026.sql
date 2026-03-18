-- ============================================
-- ANÁLISE DE CONTINUIDADE: N.S. Lourdes 2025 → 2026
-- ============================================
-- Compara os alunos de 2025 com os de 2026 para identificar:
-- 1. Alunos que CONTINUARAM (estavam em 2025 e estão em 2026)
-- 2. Alunos NOVOS em 2026 (não estavam em 2025)
-- 3. Alunos que NÃO CONTINUARAM (estavam em 2025 mas não estão em 2026)
-- ============================================

-- ============================================
-- RESUMO GERAL
-- ============================================
WITH escola AS (
  SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true
),
alunos_2025 AS (
  SELECT DISTINCT ON (UPPER(TRIM(nome)))
    id, nome, serie, turma_id, situacao, data_nascimento
  FROM alunos
  WHERE escola_id = (SELECT id FROM escola)
    AND ano_letivo = '2025'
  ORDER BY UPPER(TRIM(nome)), criado_em DESC
),
alunos_2026 AS (
  SELECT id, nome, serie, turma_id, situacao, data_nascimento
  FROM alunos
  WHERE escola_id = (SELECT id FROM escola)
    AND ano_letivo = '2026'
),
continuaram AS (
  SELECT a26.id as id_2026, a25.id as id_2025,
         a26.nome, a25.serie as serie_2025, a26.serie as serie_2026
  FROM alunos_2026 a26
  INNER JOIN alunos_2025 a25
    ON UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
),
novos AS (
  SELECT a26.id, a26.nome, a26.serie
  FROM alunos_2026 a26
  WHERE NOT EXISTS (
    SELECT 1 FROM alunos_2025 a25
    WHERE UPPER(TRIM(a25.nome)) = UPPER(TRIM(a26.nome))
  )
),
nao_continuaram AS (
  SELECT a25.id, a25.nome, a25.serie, a25.situacao
  FROM alunos_2025 a25
  WHERE NOT EXISTS (
    SELECT 1 FROM alunos_2026 a26
    WHERE UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
  )
)
SELECT
  (SELECT COUNT(*) FROM alunos_2025) as total_alunos_2025,
  (SELECT COUNT(*) FROM alunos_2026) as total_alunos_2026,
  (SELECT COUNT(*) FROM continuaram) as continuaram,
  (SELECT COUNT(*) FROM novos) as novos_2026,
  (SELECT COUNT(*) FROM nao_continuaram) as nao_continuaram_2026;

-- ============================================
-- LISTA: Alunos que CONTINUARAM (2025 → 2026) com progressão de série
-- ============================================
WITH escola AS (
  SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true
),
alunos_2025 AS (
  SELECT DISTINCT ON (UPPER(TRIM(nome)))
    id, nome, serie, data_nascimento,
    (SELECT codigo FROM turmas WHERE id = turma_id) as turma_codigo
  FROM alunos
  WHERE escola_id = (SELECT id FROM escola) AND ano_letivo = '2025'
  ORDER BY UPPER(TRIM(nome)), criado_em DESC
)
SELECT
  ROW_NUMBER() OVER (ORDER BY a26.serie, a26.nome) as "#",
  a26.nome,
  a25.serie as serie_2025,
  a25.turma_codigo as turma_2025,
  a26.serie as serie_2026,
  (SELECT codigo FROM turmas WHERE id = a26.turma_id) as turma_2026,
  CASE
    WHEN a25.serie IS NULL OR a26.serie IS NULL THEN '-'
    WHEN CAST(REGEXP_REPLACE(a26.serie, '[^0-9]', '', 'g') AS INT) >
         CAST(REGEXP_REPLACE(a25.serie, '[^0-9]', '', 'g') AS INT) THEN 'APROVADO'
    WHEN a25.serie = a26.serie THEN 'RETIDO'
    ELSE 'REMANEJADO'
  END as progressao
FROM alunos a26
INNER JOIN alunos_2025 a25
  ON UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
WHERE a26.escola_id = (SELECT id FROM escola)
  AND a26.ano_letivo = '2026'
ORDER BY a26.serie, a26.nome;

-- ============================================
-- LISTA: Alunos NOVOS em 2026 (não estavam em 2025)
-- ============================================
WITH escola AS (
  SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true
)
SELECT
  ROW_NUMBER() OVER (ORDER BY a26.serie, a26.nome) as "#",
  a26.nome,
  a26.serie as serie_2026,
  (SELECT codigo FROM turmas WHERE id = a26.turma_id) as turma_2026,
  a26.data_nascimento,
  a26.responsavel
FROM alunos a26
WHERE a26.escola_id = (SELECT id FROM escola)
  AND a26.ano_letivo = '2026'
  AND NOT EXISTS (
    SELECT 1 FROM alunos a25
    WHERE a25.escola_id = (SELECT id FROM escola)
      AND a25.ano_letivo = '2025'
      AND UPPER(TRIM(a25.nome)) = UPPER(TRIM(a26.nome))
  )
ORDER BY a26.serie, a26.nome;

-- ============================================
-- LISTA: Alunos que NÃO CONTINUARAM em 2026 (saíram da escola)
-- ============================================
WITH escola AS (
  SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true
)
SELECT
  ROW_NUMBER() OVER (ORDER BY a25.serie, a25.nome) as "#",
  a25.nome,
  a25.serie as serie_2025,
  (SELECT codigo FROM turmas WHERE id = a25.turma_id) as turma_2025,
  a25.situacao as situacao_2025,
  a25.data_nascimento,
  a25.responsavel
FROM alunos a25
WHERE a25.escola_id = (SELECT id FROM escola)
  AND a25.ano_letivo = '2025'
  AND NOT EXISTS (
    SELECT 1 FROM alunos a26
    WHERE a26.escola_id = (SELECT id FROM escola)
      AND a26.ano_letivo = '2026'
      AND UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
  )
ORDER BY a25.serie, a25.nome;

-- ============================================
-- RESUMO POR SÉRIE: Progressão 2025 → 2026
-- ============================================
WITH escola AS (
  SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true
),
alunos_2025 AS (
  SELECT DISTINCT ON (UPPER(TRIM(nome)))
    id, nome, serie
  FROM alunos
  WHERE escola_id = (SELECT id FROM escola) AND ano_letivo = '2025'
  ORDER BY UPPER(TRIM(nome)), criado_em DESC
)
SELECT
  a25.serie as serie_2025,
  COUNT(*) as total_2025,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM alunos a26
    WHERE a26.escola_id = (SELECT id FROM escola)
      AND a26.ano_letivo = '2026'
      AND UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
  )) as continuaram,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM alunos a26
    WHERE a26.escola_id = (SELECT id FROM escola)
      AND a26.ano_letivo = '2026'
      AND UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
  )) as sairam
FROM alunos_2025 a25
GROUP BY a25.serie
ORDER BY a25.serie;
