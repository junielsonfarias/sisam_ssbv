-- ============================================
-- MIGRACAO: Anonimizar logs de acesso (LGPD)
-- Data: 2026-04-01
-- Descricao: Remove coluna usuario_nome e hasheia emails existentes
-- ============================================

-- 1. Hashear emails existentes (SHA-256, primeiros 16 chars)
UPDATE logs_acesso
SET email = LEFT(encode(sha256(email::bytea), 'hex'), 16)
WHERE email LIKE '%@%';

-- 2. Remover coluna usuario_nome (dados pessoais nao devem estar em logs)
ALTER TABLE logs_acesso DROP COLUMN IF EXISTS usuario_nome;

-- Atualizar comentario
COMMENT ON COLUMN logs_acesso.email IS 'Hash SHA-256 do email (16 chars) para anonimizacao LGPD';
