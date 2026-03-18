-- ============================================
-- DIAGNÓSTICO: Verificar formato do campo serie
-- na escola N.S. Lourdes vs outras escolas
-- ============================================

-- 1. Formato da serie nos alunos da N.S. Lourdes
SELECT 'LOURDES alunos' as tabela, serie, COUNT(*) as qtd
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND ano_letivo = '2026'
GROUP BY serie ORDER BY serie;

-- 2. Formato da serie em OUTRAS escolas (para comparar)
SELECT 'OUTRAS alunos' as tabela, serie, COUNT(*) as qtd
FROM alunos
WHERE escola_id != (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND ativo = true
GROUP BY serie ORDER BY serie
LIMIT 20;

-- 3. Formato nos resultados_consolidados da Lourdes
SELECT 'LOURDES resultados' as tabela, serie, COUNT(*) as qtd
FROM resultados_consolidados
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND ano_letivo = '2026'
GROUP BY serie ORDER BY serie;

-- 4. Formato nos resultados_consolidados de OUTRAS escolas
SELECT 'OUTRAS resultados' as tabela, serie, COUNT(*) as qtd
FROM resultados_consolidados
WHERE escola_id != (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
GROUP BY serie ORDER BY serie
LIMIT 20;

-- 5. Configuracao_series (referência)
SELECT serie, nome_serie FROM configuracao_series WHERE ativo = true ORDER BY serie::int;
