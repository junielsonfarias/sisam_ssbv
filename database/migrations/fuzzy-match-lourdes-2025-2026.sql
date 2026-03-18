-- ============================================
-- ANÁLISE FUZZY: Identificar possíveis duplicatas
-- entre alunos 2025 e 2026 da N.S. Lourdes
-- ============================================
-- Usa similarity (pg_trgm) e também comparação por
-- data_nascimento + responsável para encontrar matches
-- ============================================

-- Habilitar extensão de similaridade (se não existir)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. MATCH POR SIMILARIDADE DE NOME (> 70%)
-- ============================================
SELECT
  '1. FUZZY NOME' as tipo_match,
  ROUND(similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome)))::numeric, 2) as similaridade,
  a25.nome as nome_2025,
  a26.nome as nome_2026,
  a25.serie as serie_2025,
  a26.serie as serie_2026,
  a25.data_nascimento as nasc_2025,
  a26.data_nascimento as nasc_2026,
  CASE WHEN a25.data_nascimento = a26.data_nascimento THEN 'SIM' ELSE 'NAO' END as mesma_nasc,
  a25.id as id_2025,
  a26.id as id_2026
FROM alunos a25
CROSS JOIN alunos a26
WHERE a25.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a26.escola_id = a25.escola_id
  AND a25.ano_letivo = '2025'
  AND a26.ano_letivo = '2026'
  AND a25.id != a26.id
  AND similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome))) > 0.70
  -- Excluir matches exatos (esses já foram tratados)
  AND UPPER(TRIM(a25.nome)) != UPPER(TRIM(a26.nome))
ORDER BY similaridade DESC, a25.nome;

-- ============================================
-- 2. MATCH POR DATA DE NASCIMENTO + RESPONSÁVEL
--    (nomes podem ser completamente diferentes)
-- ============================================
SELECT
  '2. MATCH NASCIMENTO' as tipo_match,
  a25.nome as nome_2025,
  a26.nome as nome_2026,
  a25.data_nascimento,
  a25.serie as serie_2025,
  a26.serie as serie_2026,
  a25.responsavel as resp_2025,
  a26.responsavel as resp_2026,
  ROUND(similarity(UPPER(COALESCE(a25.responsavel,'')), UPPER(COALESCE(a26.responsavel,'')))::numeric, 2) as sim_responsavel,
  a25.id as id_2025,
  a26.id as id_2026
FROM alunos a25
INNER JOIN alunos a26
  ON a25.data_nascimento = a26.data_nascimento
  AND a25.id != a26.id
  AND a25.escola_id = a26.escola_id
WHERE a25.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a25.ano_letivo = '2025'
  AND a26.ano_letivo = '2026'
  -- Excluir matches exatos de nome
  AND UPPER(TRIM(a25.nome)) != UPPER(TRIM(a26.nome))
ORDER BY a25.data_nascimento, a25.nome;

-- ============================================
-- 3. MATCH POR TELEFONE DO RESPONSÁVEL
-- ============================================
SELECT
  '3. MATCH TELEFONE' as tipo_match,
  a25.nome as nome_2025,
  a26.nome as nome_2026,
  a25.telefone_responsavel as telefone,
  a25.serie as serie_2025,
  a26.serie as serie_2026,
  a25.responsavel as resp_2025,
  a26.responsavel as resp_2026,
  a25.id as id_2025,
  a26.id as id_2026
FROM alunos a25
INNER JOIN alunos a26
  ON a25.telefone_responsavel = a26.telefone_responsavel
  AND a25.telefone_responsavel IS NOT NULL
  AND a25.id != a26.id
  AND a25.escola_id = a26.escola_id
WHERE a25.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a25.ano_letivo = '2025'
  AND a26.ano_letivo = '2026'
  -- Excluir matches exatos de nome (já tratados)
  AND UPPER(TRIM(a25.nome)) != UPPER(TRIM(a26.nome))
ORDER BY a25.telefone_responsavel, a25.nome;

-- ============================================
-- 4. ALUNOS 2025 SEM NENHUM MATCH (realmente saíram)
-- ============================================
SELECT
  '4. SEM MATCH (SAIU)' as tipo_match,
  a25.nome,
  a25.serie as serie_2025,
  a25.situacao,
  a25.data_nascimento,
  a25.responsavel,
  a25.telefone_responsavel,
  (SELECT codigo FROM turmas WHERE id = a25.turma_id) as turma_2025
FROM alunos a25
WHERE a25.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a25.ano_letivo = '2025'
  -- Sem match exato de nome
  AND NOT EXISTS (
    SELECT 1 FROM alunos a26
    WHERE a26.escola_id = a25.escola_id
      AND a26.ano_letivo = '2026'
      AND UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
  )
  -- Sem match fuzzy de nome (> 70%)
  AND NOT EXISTS (
    SELECT 1 FROM alunos a26
    WHERE a26.escola_id = a25.escola_id
      AND a26.ano_letivo = '2026'
      AND similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome))) > 0.70
  )
  -- Sem match por data nascimento
  AND NOT EXISTS (
    SELECT 1 FROM alunos a26
    WHERE a26.escola_id = a25.escola_id
      AND a26.ano_letivo = '2026'
      AND a25.data_nascimento IS NOT NULL
      AND a26.data_nascimento = a25.data_nascimento
  )
ORDER BY a25.serie, a25.nome;

-- ============================================
-- 5. RESUMO DA ANÁLISE
-- ============================================
WITH escola AS (
  SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true
),
alunos_2025_sem_match_exato AS (
  SELECT a25.*
  FROM alunos a25
  WHERE a25.escola_id = (SELECT id FROM escola)
    AND a25.ano_letivo = '2025'
    AND NOT EXISTS (
      SELECT 1 FROM alunos a26
      WHERE a26.escola_id = a25.escola_id
        AND a26.ano_letivo = '2026'
        AND UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome))
    )
),
fuzzy_nome AS (
  SELECT DISTINCT a25.id
  FROM alunos_2025_sem_match_exato a25
  CROSS JOIN alunos a26
  WHERE a26.escola_id = (SELECT id FROM escola)
    AND a26.ano_letivo = '2026'
    AND similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome))) > 0.70
),
match_nascimento AS (
  SELECT DISTINCT a25.id
  FROM alunos_2025_sem_match_exato a25
  INNER JOIN alunos a26
    ON a26.escola_id = a25.escola_id
    AND a26.ano_letivo = '2026'
    AND a25.data_nascimento = a26.data_nascimento
    AND a25.data_nascimento IS NOT NULL
  WHERE a25.id NOT IN (SELECT id FROM fuzzy_nome)
)
SELECT
  (SELECT COUNT(*) FROM alunos WHERE escola_id = (SELECT id FROM escola) AND ano_letivo = '2025') as total_2025,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = (SELECT id FROM escola) AND ano_letivo = '2026') as total_2026,
  (SELECT COUNT(*) FROM alunos a25
   WHERE a25.escola_id = (SELECT id FROM escola) AND a25.ano_letivo = '2025'
   AND EXISTS (SELECT 1 FROM alunos a26 WHERE a26.escola_id = a25.escola_id AND a26.ano_letivo = '2026'
               AND UPPER(TRIM(a26.nome)) = UPPER(TRIM(a25.nome)))
  ) as match_exato_nome,
  (SELECT COUNT(*) FROM fuzzy_nome) as match_fuzzy_nome,
  (SELECT COUNT(*) FROM match_nascimento) as match_nascimento,
  (SELECT COUNT(*) FROM alunos_2025_sem_match_exato) -
    (SELECT COUNT(*) FROM fuzzy_nome) -
    (SELECT COUNT(*) FROM match_nascimento) as sem_nenhum_match;
