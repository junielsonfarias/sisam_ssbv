-- SISAM - Migration: Tabela de Histórico de Divergências
-- Data: 2026-01-10
-- Descrição: Cria tabela para armazenar histórico de divergências corrigidas (retenção 30 dias)

-- Tabela de Histórico de Divergências
CREATE TABLE IF NOT EXISTS divergencias_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(50) NOT NULL,
    nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('critico', 'importante', 'aviso', 'informativo')),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    entidade VARCHAR(50),
    entidade_id UUID,
    entidade_nome VARCHAR(255),
    dados_antes JSONB,
    dados_depois JSONB,
    acao_realizada VARCHAR(100) NOT NULL,
    correcao_automatica BOOLEAN DEFAULT false,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nome VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_divergencias_historico_created
ON divergencias_historico(created_at);

CREATE INDEX IF NOT EXISTS idx_divergencias_historico_tipo
ON divergencias_historico(tipo);

CREATE INDEX IF NOT EXISTS idx_divergencias_historico_nivel
ON divergencias_historico(nivel);

CREATE INDEX IF NOT EXISTS idx_divergencias_historico_usuario
ON divergencias_historico(usuario_id);

-- Comentários da tabela
COMMENT ON TABLE divergencias_historico IS 'Histórico de divergências corrigidas no sistema - retenção de 30 dias';
COMMENT ON COLUMN divergencias_historico.tipo IS 'Tipo da divergência: alunos_duplicados, medias_inconsistentes, etc';
COMMENT ON COLUMN divergencias_historico.nivel IS 'Nível de gravidade: critico, importante, aviso, informativo';
COMMENT ON COLUMN divergencias_historico.dados_antes IS 'Estado dos dados antes da correção (JSON)';
COMMENT ON COLUMN divergencias_historico.dados_depois IS 'Estado dos dados após a correção (JSON)';
COMMENT ON COLUMN divergencias_historico.correcao_automatica IS 'Se a correção foi automática (true) ou manual (false)';

-- Função para limpar histórico com mais de 30 dias
CREATE OR REPLACE FUNCTION limpar_historico_divergencias()
RETURNS INTEGER AS $$
DECLARE
    registros_removidos INTEGER;
BEGIN
    DELETE FROM divergencias_historico
    WHERE created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS registros_removidos = ROW_COUNT;

    RETURN registros_removidos;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION limpar_historico_divergencias() IS 'Remove registros de divergências com mais de 30 dias. Retorna quantidade de registros removidos.';
