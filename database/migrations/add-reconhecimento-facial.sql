-- ============================================
-- MIGRACAO: Reconhecimento Facial e Frequência Diária
-- Data: 2026-03-17
-- ============================================
--
-- CONTEXTO:
-- Cria tabelas para suportar o módulo de reconhecimento facial:
-- - dispositivos_faciais: gestão de dispositivos (totens/câmeras) nas escolas
-- - consentimentos_faciais: controle LGPD de consentimento dos responsáveis
-- - embeddings_faciais: vetores numéricos para reconhecimento (sem fotos)
-- - frequencia_diaria: registro diário de presença (manual, facial ou qrcode)
-- - logs_dispositivos: auditoria de eventos dos dispositivos
--
-- IMPACTO:
-- - 5 novas tabelas
-- - 1 coluna adicionada em frequencia_bimestral (metodo)
-- ============================================

-- ============================================
-- TABELA 1: dispositivos_faciais
-- Dispositivos de reconhecimento facial nas escolas
-- ============================================
CREATE TABLE IF NOT EXISTS dispositivos_faciais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    localizacao VARCHAR(255),
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(8) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
    ultimo_ping TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_escola ON dispositivos_faciais(escola_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_status ON dispositivos_faciais(status);
CREATE INDEX IF NOT EXISTS idx_dispositivos_prefix ON dispositivos_faciais(api_key_prefix);

DROP TRIGGER IF EXISTS update_dispositivos_faciais_updated_at ON dispositivos_faciais;
CREATE TRIGGER update_dispositivos_faciais_updated_at BEFORE UPDATE ON dispositivos_faciais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA 2: consentimentos_faciais (LGPD)
-- Controle de consentimento dos responsáveis
-- ============================================
CREATE TABLE IF NOT EXISTS consentimentos_faciais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    responsavel_nome VARCHAR(255) NOT NULL,
    responsavel_cpf VARCHAR(14),
    consentido BOOLEAN NOT NULL DEFAULT false,
    data_consentimento TIMESTAMP,
    data_revogacao TIMESTAMP,
    ip_registro VARCHAR(45),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_consentimentos_aluno ON consentimentos_faciais(aluno_id);

DROP TRIGGER IF EXISTS update_consentimentos_faciais_updated_at ON consentimentos_faciais;
CREATE TRIGGER update_consentimentos_faciais_updated_at BEFORE UPDATE ON consentimentos_faciais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA 3: embeddings_faciais
-- Vetores numéricos para reconhecimento facial
-- Armazena apenas embeddings (vetores), NUNCA fotos
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings_faciais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    embedding_data BYTEA NOT NULL,
    qualidade DECIMAL(5,2) CHECK (qualidade >= 0 AND qualidade <= 100),
    versao_modelo VARCHAR(50) DEFAULT 'v1',
    registrado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_aluno ON embeddings_faciais(aluno_id);

DROP TRIGGER IF EXISTS update_embeddings_faciais_updated_at ON embeddings_faciais;
CREATE TRIGGER update_embeddings_faciais_updated_at BEFORE UPDATE ON embeddings_faciais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA 4: frequencia_diaria
-- Registro diário de presença dos alunos
-- ============================================
CREATE TABLE IF NOT EXISTS frequencia_diaria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    hora_entrada TIME,
    hora_saida TIME,
    metodo VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (metodo IN ('manual', 'facial', 'qrcode')),
    dispositivo_id UUID REFERENCES dispositivos_faciais(id) ON DELETE SET NULL,
    confianca DECIMAL(5,4) CHECK (confianca >= 0 AND confianca <= 1),
    registrado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id, data)
);

CREATE INDEX IF NOT EXISTS idx_freq_diaria_aluno ON frequencia_diaria(aluno_id);
CREATE INDEX IF NOT EXISTS idx_freq_diaria_data ON frequencia_diaria(data);
CREATE INDEX IF NOT EXISTS idx_freq_diaria_turma ON frequencia_diaria(turma_id);
CREATE INDEX IF NOT EXISTS idx_freq_diaria_escola ON frequencia_diaria(escola_id);
CREATE INDEX IF NOT EXISTS idx_freq_diaria_escola_data ON frequencia_diaria(escola_id, data);
CREATE INDEX IF NOT EXISTS idx_freq_diaria_metodo ON frequencia_diaria(metodo);

-- ============================================
-- TABELA 5: logs_dispositivos
-- Auditoria de eventos dos dispositivos
-- ============================================
CREATE TABLE IF NOT EXISTS logs_dispositivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispositivo_id UUID NOT NULL REFERENCES dispositivos_faciais(id) ON DELETE CASCADE,
    evento VARCHAR(50) NOT NULL,
    detalhes JSONB DEFAULT '{}',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_disp_dispositivo ON logs_dispositivos(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_logs_disp_criado ON logs_dispositivos(criado_em);

-- ============================================
-- ALTERACAO: adicionar coluna metodo em frequencia_bimestral
-- ============================================
ALTER TABLE frequencia_bimestral ADD COLUMN IF NOT EXISTS metodo VARCHAR(20) DEFAULT 'manual';

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO RECONHECIMENTO FACIAL CONCLUIDA ===';
    RAISE NOTICE 'Tabelas criadas: dispositivos_faciais, consentimentos_faciais, embeddings_faciais, frequencia_diaria, logs_dispositivos';
    RAISE NOTICE 'Coluna adicionada: frequencia_bimestral.metodo';
END $$;
