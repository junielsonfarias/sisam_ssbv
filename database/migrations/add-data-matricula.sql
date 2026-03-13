-- ============================================
-- MIGRACAO: Data de Matrícula na Turma
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- Adiciona campo data_matricula para registrar quando o aluno
-- ingressou na turma. Permite visualizar o período de permanência
-- (data_matricula até data de transferência, se houver).
--
-- IMPACTO:
-- - Nova coluna data_matricula em alunos
-- - Backfill: alunos existentes recebem criado_em como data_matricula
-- ============================================

-- ETAPA 1: Adicionar coluna
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS data_matricula DATE;

-- ETAPA 2: Backfill — usar criado_em como data de matrícula para alunos existentes
UPDATE alunos SET data_matricula = criado_em::date WHERE data_matricula IS NULL;

-- ETAPA 3: Índice
CREATE INDEX IF NOT EXISTS idx_alunos_data_matricula ON alunos(data_matricula);

-- VERIFICACAO
DO $$
DECLARE
    sem_data INTEGER;
BEGIN
    SELECT COUNT(*) INTO sem_data FROM alunos WHERE data_matricula IS NULL;
    RAISE NOTICE '=== MIGRACAO DATA MATRICULA CONCLUIDA ===';
    RAISE NOTICE 'Alunos sem data_matricula: % (deve ser 0)', sem_data;
END $$;
