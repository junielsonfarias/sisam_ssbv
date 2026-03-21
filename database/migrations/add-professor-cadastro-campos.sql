-- ============================================================================
-- Migration: Campos adicionais para cadastro de professor
-- Data: 2026-03-21
-- Descrição: Adiciona CPF e telefone na tabela usuarios para auto-cadastro
--            de professores via site institucional.
-- ============================================================================

-- 1. Adicionar campos opcionais
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- 2. Índice único para CPF (ignora nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf
  ON usuarios(cpf) WHERE cpf IS NOT NULL AND cpf != '';

-- ============================================================================
-- Verificação
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'usuarios' AND column_name IN ('cpf', 'telefone');
