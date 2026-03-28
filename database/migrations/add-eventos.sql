BEGIN;
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(30) DEFAULT 'geral', -- 'reuniao', 'formatura', 'jogos', 'capacitacao', 'geral'
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP,
  local VARCHAR(255),
  publico BOOLEAN DEFAULT true,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_publico ON eventos(publico) WHERE publico = true;
COMMIT;
