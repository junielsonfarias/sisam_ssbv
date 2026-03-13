-- =====================================================
-- SISAM - Migration: Matrículas 2026
-- Adiciona campos CPF, data de nascimento e PCD à tabela alunos
-- =====================================================

-- Adicionar novas colunas à tabela alunos
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS pcd BOOLEAN DEFAULT false;

-- CPF único quando preenchido (índice parcial)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_cpf_unique ON alunos(cpf) WHERE cpf IS NOT NULL;

-- Índice para busca por data de nascimento
CREATE INDEX IF NOT EXISTS idx_alunos_data_nascimento ON alunos(data_nascimento);
