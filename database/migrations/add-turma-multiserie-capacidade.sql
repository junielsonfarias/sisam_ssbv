-- ============================================
-- MIGRACAO: Turma Multiserie/Multietapa + Capacidade
-- Data: 2026-03-14
-- ============================================

-- Campos multiserie e multietapa
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS multiserie BOOLEAN DEFAULT FALSE;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS multietapa BOOLEAN DEFAULT FALSE;

-- Garantir que capacidade_maxima existe (pode já existir da migração anterior)
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER DEFAULT 35;

-- ============================================
-- VERIFICACAO FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Migração Turma Multiserie/Multietapa concluída ===';
  RAISE NOTICE 'Colunas adicionadas: turmas.multiserie, turmas.multietapa';
END $$;
