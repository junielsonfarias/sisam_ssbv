-- =====================================================
-- MIGRACAO: Adicionar índice em resultados_consolidados.aluno_id
-- Data: 2026-01-06
-- Descricao: Otimiza queries que buscam consolidados por aluno
-- =====================================================

BEGIN;

-- Índice para buscas por aluno_id (usado em histórico de alunos)
CREATE INDEX IF NOT EXISTS idx_consolidados_aluno_id
ON resultados_consolidados(aluno_id);

-- Índice composto para buscas por aluno + ano (histórico por ano)
CREATE INDEX IF NOT EXISTS idx_consolidados_aluno_ano
ON resultados_consolidados(aluno_id, ano_letivo);

COMMIT;

-- Verificação
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'resultados_consolidados'
AND indexname LIKE 'idx_consolidados_aluno%';
