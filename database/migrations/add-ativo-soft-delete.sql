-- ============================================
-- Migração: Adicionar coluna ativo para soft delete
-- Data: 2026-03-31
-- ============================================
--
-- Adiciona coluna 'ativo' às tabelas que passaram a usar soft delete
-- em vez de hard DELETE. Valores padrão = true para não afetar registros existentes.
--

BEGIN;

-- Tabela eventos
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_eventos_ativo ON eventos(ativo) WHERE ativo = true;

-- Tabela configuracao_notas_escola
ALTER TABLE configuracao_notas_escola ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_config_notas_ativo ON configuracao_notas_escola(ativo) WHERE ativo = true;

COMMIT;
