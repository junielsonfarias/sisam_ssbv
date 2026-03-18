-- ============================================
-- DIAGNÓSTICO COMPLETO: N.S. Lourdes
-- ============================================

-- 1. Quantos alunos existem por ano_letivo
SELECT '1. ALUNOS POR ANO' as consulta, ano_letivo, COUNT(*) as total
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
GROUP BY ano_letivo
ORDER BY ano_letivo;

-- 2. Alunos 2026 por turma (deve bater com PDF)
SELECT '2. POR TURMA' as consulta,
       t.codigo as turma, t.serie, COUNT(a.id) as alunos
FROM turmas t
LEFT JOIN alunos a ON a.turma_id = t.id AND a.ano_letivo = '2026'
WHERE t.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND t.ano_letivo = '2026'
GROUP BY t.codigo, t.serie
ORDER BY t.serie, t.codigo;

-- 3. DUPLICATAS: mesmo nome na mesma escola (qualquer ano)
SELECT '3. DUPLICATA' as consulta,
       UPPER(TRIM(nome)) as nome, COUNT(*) as qtd,
       STRING_AGG(ano_letivo, ', ' ORDER BY ano_letivo) as anos,
       STRING_AGG(id::text, ', ') as ids
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
GROUP BY UPPER(TRIM(nome))
HAVING COUNT(*) > 1
ORDER BY nome;

-- 4. Alunos PcD
SELECT '4. PCD' as consulta, nome, serie,
       (SELECT codigo FROM turmas WHERE id = turma_id) as turma
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND ano_letivo = '2026' AND pcd = true
ORDER BY serie, nome;

-- 5. Alunos sem turma
SELECT '5. SEM TURMA' as consulta, nome, serie, ano_letivo
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND turma_id IS NULL;

-- 6. Resultados consolidados 2026
SELECT '6. RESULTADOS' as consulta,
       COUNT(*) as total_resultados,
       (SELECT COUNT(*) FROM alunos
        WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
        AND ano_letivo = '2026') as total_alunos_2026
FROM resultados_consolidados rc
INNER JOIN avaliacoes av ON rc.avaliacao_id = av.id
WHERE rc.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND av.ano_letivo = '2026' AND av.tipo = 'diagnostica';

-- 7. Resumo final consolidado
SELECT
  '7. RESUMO' as consulta,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id) as total_geral,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ano_letivo = '2026') as total_2026,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ano_letivo = '2025') as total_2025,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ano_letivo NOT IN ('2025','2026')) as outros_anos,
  (SELECT COUNT(*) FROM turmas WHERE escola_id = e.id AND ano_letivo = '2026') as turmas_2026,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ano_letivo = '2026' AND pcd = true) as pcd
FROM escolas e
WHERE e.codigo = '15560350' AND e.ativo = true;
