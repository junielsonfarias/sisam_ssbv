-- ============================================
-- MIGRACAO: QR Code para Presenca
-- Data: 2026-04-02
-- ============================================
--
-- CONTEXTO:
-- Alternativa ao reconhecimento facial para registro de presenca.
-- Professor gera QR code temporario da turma, aluno escaneia com celular.
-- Ideal para escolas sem camera fixa.
--
-- IMPACTO:
-- - 1 nova tabela (qr_presenca)
-- ============================================

CREATE TABLE IF NOT EXISTS qr_presenca (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    data DATE NOT NULL,
    gerado_por UUID NOT NULL REFERENCES usuarios(id),
    expira_em TIMESTAMP NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qr_presenca_token ON qr_presenca(token) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_qr_presenca_turma ON qr_presenca(turma_id, data);

-- ============================================
-- VERIFICACAO
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO QR PRESENCA CONCLUIDA ===';
    RAISE NOTICE 'Tabela criada: qr_presenca';
END $$;
