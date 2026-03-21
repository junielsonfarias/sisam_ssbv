-- ============================================================================
-- Migration: Perfil Editor de Notícias
-- Data: 2026-03-21
-- Descrição: Adiciona tipo de usuário 'editor' para gestão de notícias
--            do site institucional.
-- ============================================================================

-- 1. Alterar CHECK constraint para incluir 'editor'
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
  CHECK (tipo_usuario IN ('administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor'));

-- ============================================================================
-- Verificação
-- ============================================================================
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'usuarios'::regclass AND conname LIKE '%tipo_usuario%';
