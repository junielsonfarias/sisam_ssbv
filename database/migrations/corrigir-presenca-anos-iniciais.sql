-- ============================================
-- MIGRAÇÃO: Corrigir presença de alunos de 2º, 3º e 5º ano
-- ============================================
-- Este script atualiza a presença de alunos de 2º, 3º e 5º ano
-- que estão marcados como 'F' (falta) mas deveriam estar como '-' (sem dados)
-- quando não há dados de frequência na importação original

-- Atualizar resultados_consolidados
-- Alunos de 2º, 3º e 5º ano que estão com presença = 'F' e média = 0 ou null
-- devem ter presença alterada para '-' (sem dados de frequência)
UPDATE resultados_consolidados
SET presenca = '-'
WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
  AND presenca = 'F'
  AND (media_aluno IS NULL OR media_aluno = 0)
  AND (nota_lp IS NULL OR nota_lp = 0)
  AND (nota_ch IS NULL OR nota_ch = 0)
  AND (nota_mat IS NULL OR nota_mat = 0)
  AND (nota_cn IS NULL OR nota_cn = 0)
  AND (nota_producao IS NULL OR nota_producao = 0);

-- Atualizar também resultados_provas para manter consistência
UPDATE resultados_provas
SET presenca = '-'
WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
  AND presenca = 'F'
  AND aluno_id IN (
    SELECT DISTINCT aluno_id
    FROM resultados_consolidados
    WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
      AND presenca = '-'
  );

-- Log da quantidade de registros atualizados
DO $$
DECLARE
  v_count_consolidados INTEGER;
  v_count_provas INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_consolidados
  FROM resultados_consolidados
  WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
    AND presenca = '-';
  
  SELECT COUNT(*) INTO v_count_provas
  FROM resultados_provas
  WHERE serie IN ('2º Ano', '2º', '2', '3º Ano', '3º', '3', '5º Ano', '5º', '5')
    AND presenca = '-';
  
  RAISE NOTICE 'Registros atualizados: % em resultados_consolidados, % em resultados_provas', 
    v_count_consolidados, v_count_provas;
END $$;

