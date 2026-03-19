-- ============================================
-- DIAGNÓSTICO DE INTEGRIDADE 2026
-- SISAM + Gestor Escolar
-- ============================================

-- 1. Resumo geral por escola (2026)
SELECT '1. ESCOLAS 2026' as consulta,
       e.nome as escola, e.codigo,
       COUNT(DISTINCT a.id) as alunos,
       COUNT(DISTINCT t.id) as turmas,
       COUNT(DISTINCT a.serie) as series
FROM escolas e
LEFT JOIN alunos a ON a.escola_id = e.id AND a.ano_letivo = '2026' AND a.ativo = true
LEFT JOIN turmas t ON t.escola_id = e.id AND t.ano_letivo = '2026' AND t.ativo = true
WHERE e.ativo = true
GROUP BY e.id, e.nome, e.codigo
HAVING COUNT(a.id) > 0
ORDER BY e.nome;

-- 2. Alunos sem turma vinculada (2026)
SELECT '2. SEM TURMA' as consulta, a.nome, a.serie, a.ano_letivo, e.nome as escola
FROM alunos a
LEFT JOIN escolas e ON a.escola_id = e.id
WHERE a.ano_letivo = '2026' AND a.ativo = true AND a.turma_id IS NULL
ORDER BY e.nome, a.nome;

-- 3. Alunos com turma de ano diferente
SELECT '3. TURMA ANO DIVERGENTE' as consulta,
       a.nome, a.ano_letivo as aluno_ano, t.ano_letivo as turma_ano,
       t.codigo as turma, e.nome as escola
FROM alunos a
INNER JOIN turmas t ON a.turma_id = t.id
LEFT JOIN escolas e ON a.escola_id = e.id
WHERE a.ano_letivo = '2026' AND a.ativo = true AND t.ano_letivo != '2026';

-- 4. Alunos com escola divergente da turma
SELECT '4. ESCOLA DIVERGENTE' as consulta,
       a.nome, a.escola_id as aluno_escola, t.escola_id as turma_escola,
       t.codigo as turma
FROM alunos a
INNER JOIN turmas t ON a.turma_id = t.id
WHERE a.ano_letivo = '2026' AND a.ativo = true AND a.escola_id != t.escola_id;

-- 5. Turmas 2026 sem alunos
SELECT '5. TURMA VAZIA' as consulta,
       t.codigo, t.serie, t.nome, e.nome as escola
FROM turmas t
LEFT JOIN escolas e ON t.escola_id = e.id
WHERE t.ano_letivo = '2026' AND t.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM alunos a WHERE a.turma_id = t.id AND a.ano_letivo = '2026' AND a.ativo = true
  )
ORDER BY e.nome, t.codigo;

-- 6. Resultados consolidados 2026 - integridade
SELECT '6. RESULTADOS CONSOLIDADOS' as consulta,
       COUNT(*) as total_rc,
       COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM alunos a WHERE a.id = rc.aluno_id AND a.ano_letivo = '2026')) as orfaos,
       COUNT(*) FILTER (WHERE rc.turma_id IS NULL) as sem_turma,
       COUNT(*) FILTER (WHERE rc.escola_id IS NULL) as sem_escola
FROM resultados_consolidados rc
WHERE rc.ano_letivo = '2026';

-- 7. Alunos 2026 sem resultado consolidado (avaliação diagnóstica)
SELECT '7. SEM RC DIAGNOSTICA' as consulta, a.nome, a.serie,
       (SELECT codigo FROM turmas WHERE id = a.turma_id) as turma,
       e.nome as escola
FROM alunos a
LEFT JOIN escolas e ON a.escola_id = e.id
WHERE a.ano_letivo = '2026' AND a.ativo = true AND a.situacao = 'cursando'
  AND NOT EXISTS (
    SELECT 1 FROM resultados_consolidados rc
    INNER JOIN avaliacoes av ON rc.avaliacao_id = av.id
    WHERE rc.aluno_id = a.id AND av.ano_letivo = '2026' AND av.tipo = 'diagnostica'
  )
ORDER BY e.nome, a.serie, a.nome;

-- 8. Notas escolares 2026 - integridade turma_id
SELECT '8. NOTAS ESCOLARES' as consulta,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE turma_id IS NOT NULL) as com_turma,
       COUNT(*) FILTER (WHERE turma_id IS NULL) as sem_turma,
       COUNT(DISTINCT aluno_id) as alunos_com_nota,
       COUNT(DISTINCT disciplina_id) as disciplinas
FROM notas_escolares
WHERE ano_letivo = '2026';

-- 9. Frequência bimestral 2026
SELECT '9. FREQUENCIA BIMESTRAL' as consulta,
       COUNT(*) as total,
       COUNT(DISTINCT aluno_id) as alunos,
       COUNT(DISTINCT turma_id) as turmas
FROM frequencia_bimestral
WHERE ano_letivo = '2026';

-- 10. Frequência diária 2026
SELECT '10. FREQUENCIA DIARIA' as consulta,
       COUNT(*) as total,
       COUNT(DISTINCT aluno_id) as alunos,
       COUNT(DISTINCT turma_id) as turmas,
       MIN(data) as primeira_data,
       MAX(data) as ultima_data
FROM frequencia_diaria
WHERE EXTRACT(YEAR FROM data) = 2026;

-- 11. Conselho de classe 2026
SELECT '11. CONSELHO CLASSE' as consulta,
       COUNT(DISTINCT cc.id) as conselhos,
       COUNT(DISTINCT cc.turma_id) as turmas,
       COUNT(cca.id) as pareceres
FROM conselho_classe cc
LEFT JOIN conselho_classe_alunos cca ON cca.conselho_id = cc.id
WHERE cc.ano_letivo = '2026';

-- 12. Transferências 2026
SELECT '12. TRANSFERENCIAS' as consulta,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE tipo_movimentacao = 'saida') as saidas,
       COUNT(*) FILTER (WHERE tipo_movimentacao = 'entrada') as entradas
FROM historico_situacao hs
INNER JOIN alunos a ON hs.aluno_id = a.id
WHERE a.ano_letivo = '2026';

-- 13. Avaliações 2026 configuradas
SELECT '13. AVALIACOES 2026' as consulta,
       id, nome, tipo, ordem, ativo
FROM avaliacoes
WHERE ano_letivo = '2026'
ORDER BY ordem;

-- 14. Configuração de séries ativas
SELECT '14. CONFIG SERIES' as consulta,
       serie, nome_serie, qtd_questoes_lp, qtd_questoes_mat,
       tem_producao_textual, ativo
FROM configuracao_series
WHERE ativo = true
ORDER BY serie::int;

-- 15. Duplicatas de alunos 2026 (mesmo nome + escola)
SELECT '15. DUPLICATAS' as consulta,
       UPPER(TRIM(a.nome)) as nome, e.nome as escola,
       COUNT(*) as qtd,
       STRING_AGG(a.id::text, ', ') as ids
FROM alunos a
LEFT JOIN escolas e ON a.escola_id = e.id
WHERE a.ano_letivo = '2026' AND a.ativo = true
GROUP BY UPPER(TRIM(a.nome)), a.escola_id, e.nome
HAVING COUNT(*) > 1
ORDER BY e.nome, nome;

-- 16. Formato de série (consistência)
SELECT '16. FORMATO SERIE' as consulta,
       'alunos' as tabela, serie, COUNT(*) as qtd
FROM alunos WHERE ano_letivo = '2026' AND ativo = true
GROUP BY serie
UNION ALL
SELECT '16. FORMATO SERIE', 'turmas', serie, COUNT(*)
FROM turmas WHERE ano_letivo = '2026' AND ativo = true
GROUP BY serie
UNION ALL
SELECT '16. FORMATO SERIE', 'resultados_consolidados', serie, COUNT(*)
FROM resultados_consolidados WHERE ano_letivo = '2026'
GROUP BY serie
ORDER BY consulta, tabela, serie;

-- 17. RESUMO FINAL
SELECT
  '17. RESUMO 2026' as consulta,
  (SELECT COUNT(*) FROM escolas WHERE ativo = true AND id IN (SELECT DISTINCT escola_id FROM alunos WHERE ano_letivo = '2026')) as escolas,
  (SELECT COUNT(*) FROM turmas WHERE ano_letivo = '2026' AND ativo = true) as turmas,
  (SELECT COUNT(*) FROM alunos WHERE ano_letivo = '2026' AND ativo = true) as alunos,
  (SELECT COUNT(*) FROM alunos WHERE ano_letivo = '2026' AND ativo = true AND pcd = true) as pcd,
  (SELECT COUNT(*) FROM resultados_consolidados WHERE ano_letivo = '2026') as resultados_consolidados,
  (SELECT COUNT(*) FROM notas_escolares WHERE ano_letivo = '2026') as notas_escolares,
  (SELECT COUNT(*) FROM frequencia_bimestral WHERE ano_letivo = '2026') as freq_bimestral,
  (SELECT COUNT(*) FROM avaliacoes WHERE ano_letivo = '2026' AND ativo = true) as avaliacoes;
