-- Migration: Override de regras de avaliacao por escola
-- Data: 2026-03-19
-- Permite que cada escola customize o tipo/regra de avaliacao para suas series

BEGIN;

CREATE TABLE IF NOT EXISTS escola_regras_avaliacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    serie_escolar_id UUID NOT NULL REFERENCES series_escolares(id) ON DELETE CASCADE,
    tipo_avaliacao_id UUID REFERENCES tipos_avaliacao(id),
    regra_avaliacao_id UUID REFERENCES regras_avaliacao(id),
    -- Overrides opcionais (se NULL, usa o da regra vinculada)
    media_aprovacao DECIMAL(5,2),
    media_recuperacao DECIMAL(5,2),
    nota_maxima DECIMAL(5,2),
    permite_recuperacao BOOLEAN,
    observacao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(escola_id, serie_escolar_id)
);

CREATE INDEX IF NOT EXISTS idx_escola_regras_avaliacao_escola ON escola_regras_avaliacao(escola_id);
CREATE INDEX IF NOT EXISTS idx_escola_regras_avaliacao_serie ON escola_regras_avaliacao(serie_escolar_id);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION trigger_update_escola_regras_avaliacao_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_escola_regras_avaliacao_timestamp ON escola_regras_avaliacao;
CREATE TRIGGER set_escola_regras_avaliacao_timestamp
    BEFORE UPDATE ON escola_regras_avaliacao
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_escola_regras_avaliacao_timestamp();

COMMIT;
