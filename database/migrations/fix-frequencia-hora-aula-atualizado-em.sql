-- ============================================
-- MIGRACAO: Adicionar atualizado_em em frequencia_hora_aula
-- Data: 2026-03-17
-- ============================================

ALTER TABLE frequencia_hora_aula ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS update_frequencia_hora_aula_updated_at ON frequencia_hora_aula;
CREATE TRIGGER update_frequencia_hora_aula_updated_at BEFORE UPDATE ON frequencia_hora_aula
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE '=== FIX: atualizado_em adicionado em frequencia_hora_aula ===';
END $$;
