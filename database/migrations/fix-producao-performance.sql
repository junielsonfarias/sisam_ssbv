-- ============================================
-- MIGRACAO: Fixes de Performance para Produção
-- Data: 2026-03-17
-- ============================================
-- CONTEXTO: Indexes faltantes e ajustes para suportar
-- carga de produção com múltiplos terminais simultâneos.
-- ============================================

-- Index para queries de estatísticas por dispositivo
CREATE INDEX IF NOT EXISTS idx_freq_diaria_dispositivo ON frequencia_diaria(dispositivo_id);

-- Index composto para painel-turma (turma + data)
CREATE INDEX IF NOT EXISTS idx_freq_diaria_turma_data ON frequencia_diaria(turma_id, data);

-- Index para agregação hora-aula por período
CREATE INDEX IF NOT EXISTS idx_fha_data ON frequencia_hora_aula(data);

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== FIX PRODUCAO: 3 indexes adicionados ===';
END $$;
