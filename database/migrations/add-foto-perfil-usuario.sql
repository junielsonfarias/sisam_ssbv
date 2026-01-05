-- Migration: Adicionar campo foto_url na tabela usuarios
-- Data: 2026-01-05

-- Adicionar coluna foto_url para armazenar URL da foto de perfil
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Comentário para documentação
COMMENT ON COLUMN usuarios.foto_url IS 'URL da foto de perfil do usuário (armazenada no Supabase Storage)';
