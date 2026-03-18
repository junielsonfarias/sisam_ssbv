-- Migration: Campos do Censo INEP para tabela alunos
-- Data: 2026-03-18
-- Descrição: Adiciona código INEP do aluno, zona de residência e dados de transporte escolar

BEGIN;

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS codigo_inep_aluno VARCHAR(12);

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS zona_residencia VARCHAR(10)
    CHECK (zona_residencia IN ('urbana', 'rural'));

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS utiliza_transporte_publico BOOLEAN DEFAULT false;

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS tipo_transporte VARCHAR(30)
    CHECK (tipo_transporte IN ('onibus', 'van', 'barco', 'bicicleta', 'outro'));

-- ============================================
-- ÍNDICES
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_codigo_inep
    ON alunos(codigo_inep_aluno) WHERE codigo_inep_aluno IS NOT NULL;

COMMIT;
