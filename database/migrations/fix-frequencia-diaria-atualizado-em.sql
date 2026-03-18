-- ============================================
-- MIGRACAO: Adicionar atualizado_em em frequencia_diaria
-- Data: 2026-03-17
-- ============================================
-- CONTEXTO: A tabela frequencia_diaria foi criada sem coluna
-- atualizado_em e sem trigger de updated_at, causando perda
-- de rastreio em updates (hora_saida, confianca).
-- ============================================

ALTER TABLE frequencia_diaria ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS update_frequencia_diaria_updated_at ON frequencia_diaria;
CREATE TRIGGER update_frequencia_diaria_updated_at BEFORE UPDATE ON frequencia_diaria
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== FIX: atualizado_em adicionado em frequencia_diaria ===';
END $$;
