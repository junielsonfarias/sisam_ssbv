-- Migração: Indicadores e Metas por Escola
-- Permite definir metas por escola/ano e acompanhar o atingimento

CREATE TABLE IF NOT EXISTS metas_escola (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  ano_letivo VARCHAR(10) NOT NULL,
  indicador VARCHAR(50) NOT NULL, -- 'frequencia', 'media_sisam', 'aprovacao', 'evasao'
  meta_valor DECIMAL(5,2) NOT NULL, -- target value (e.g., 90.00 for 90% frequency)
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(escola_id, ano_letivo, indicador)
);

CREATE INDEX IF NOT EXISTS idx_metas_escola_ano ON metas_escola(escola_id, ano_letivo);
