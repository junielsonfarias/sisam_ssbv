-- ============================================
-- DIAGNÓSTICO: Verificação de integridade dos dados
-- Escola Nossa Senhora de Lourdes (INEP 15560350)
-- ============================================

DO $$
DECLARE
  v_escola_id UUID;
  v_total INT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = '15560350' AND ativo = true;
  RAISE NOTICE 'Escola ID: %', v_escola_id;
  RAISE NOTICE '';

  -- 1. Total de alunos por ano_letivo
  RAISE NOTICE '=== 1. ALUNOS POR ANO LETIVO ===';
  FOR v_total IN
    SELECT 1 FROM alunos WHERE escola_id = v_escola_id
  LOOP EXIT; END LOOP;
END $$;

-- 1. Alunos por ano letivo
SELECT ano_letivo, COUNT(*) as total,
       COUNT(*) FILTER (WHERE situacao = 'cursando') as cursando,
       COUNT(*) FILTER (WHERE situacao != 'cursando' OR situacao IS NULL) as outros
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
GROUP BY ano_letivo ORDER BY ano_letivo;

-- 2. Verificar DUPLICATAS por nome no mesmo ano_letivo
SELECT 'DUPLICATAS NO MESMO ANO' as verificacao,
       UPPER(TRIM(nome)) as nome_normalizado, ano_letivo, COUNT(*) as qtd
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
GROUP BY UPPER(TRIM(nome)), ano_letivo
HAVING COUNT(*) > 1
ORDER BY ano_letivo, nome_normalizado;

-- 3. Verificar alunos que existem em 2025 E 2026 (registros separados = duplicata)
SELECT 'ALUNO EM DOIS ANOS (registros separados)' as verificacao,
       a25.id as id_2025, a26.id as id_2026,
       a25.nome as nome_2025, a26.nome as nome_2026,
       a25.ano_letivo as ano_25, a26.ano_letivo as ano_26,
       a25.serie as serie_25, a26.serie as serie_26,
       a25.turma_id as turma_25, a26.turma_id as turma_26
FROM alunos a25
INNER JOIN alunos a26
  ON UPPER(TRIM(a25.nome)) = UPPER(TRIM(a26.nome))
  AND a25.escola_id = a26.escola_id
  AND a25.id != a26.id
WHERE a25.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a25.ano_letivo = '2025'
  AND a26.ano_letivo = '2026'
ORDER BY a25.nome;

-- 4. Alunos 2026 por turma (verificar se bate com PDF)
SELECT t.codigo as turma, t.serie, t.nome as turma_nome, COUNT(a.id) as total_alunos
FROM turmas t
LEFT JOIN alunos a ON a.turma_id = t.id AND a.ano_letivo = '2026'
WHERE t.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND t.ano_letivo = '2026'
GROUP BY t.id, t.codigo, t.serie, t.nome
ORDER BY t.serie, t.codigo;

-- 5. Alunos 2026 sem turma vinculada
SELECT 'ALUNO SEM TURMA' as verificacao, id, nome, serie, ano_letivo
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND ano_letivo = '2026'
  AND turma_id IS NULL;

-- 6. Alunos 2026 sem resultados consolidados (avaliação diagnóstica)
SELECT 'SEM RESULTADO CONSOLIDADO' as verificacao, a.id, a.nome, a.serie
FROM alunos a
WHERE a.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a.ano_letivo = '2026'
  AND a.situacao = 'cursando'
  AND NOT EXISTS (
    SELECT 1 FROM resultados_consolidados rc
    INNER JOIN avaliacoes av ON rc.avaliacao_id = av.id
    WHERE rc.aluno_id = a.id AND av.ano_letivo = '2026' AND av.tipo = 'diagnostica'
  );

-- 7. Resultados consolidados órfãos (aluno não existe mais ou mudou de ano)
SELECT 'RESULTADO ÓRFÃO' as verificacao, rc.id, rc.aluno_id, rc.ano_letivo, rc.serie
FROM resultados_consolidados rc
WHERE rc.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND rc.ano_letivo = '2026'
  AND NOT EXISTS (
    SELECT 1 FROM alunos a WHERE a.id = rc.aluno_id AND a.ano_letivo = '2026'
  );

-- 8. Alunos PcD identificados
SELECT 'ALUNOS PCD' as verificacao, nome, serie,
       (SELECT codigo FROM turmas WHERE id = turma_id) as turma
FROM alunos
WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND ano_letivo = '2026'
  AND pcd = true
ORDER BY serie, nome;

-- 9. Resumo final
SELECT
  'RESUMO FINAL' as verificacao,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ano_letivo = '2026') as total_2026,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ano_letivo = '2025') as restantes_2025,
  (SELECT COUNT(*) FROM turmas WHERE escola_id = e.id AND ano_letivo = '2026') as turmas_2026,
  (SELECT COUNT(*) FROM resultados_consolidados rc
   INNER JOIN avaliacoes av ON rc.avaliacao_id = av.id
   WHERE rc.escola_id = e.id AND av.ano_letivo = '2026' AND av.tipo = 'diagnostica') as resultados_2026,
  (SELECT COUNT(*) FROM alunos WHERE escola_id = e.id AND ano_letivo = '2026' AND pcd = true) as pcd_2026
FROM escolas e
WHERE e.codigo = '15560350' AND e.ativo = true;
