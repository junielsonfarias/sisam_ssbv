-- ============================================
-- Renomear "Bimestre" para "Avaliação" nos períodos letivos
-- ============================================

UPDATE periodos_letivos
SET nome = REPLACE(nome, 'Bimestre', 'Avaliação'),
    atualizado_em = CURRENT_TIMESTAMP
WHERE nome LIKE '%Bimestre%';

-- Verificação
SELECT id, nome, tipo, numero, ano_letivo FROM periodos_letivos ORDER BY ano_letivo, numero;
