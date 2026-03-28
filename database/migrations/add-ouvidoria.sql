BEGIN;
CREATE TABLE IF NOT EXISTS ouvidoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocolo VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(30) NOT NULL, -- 'denuncia', 'sugestao', 'elogio', 'reclamacao', 'informacao'
  nome VARCHAR(255),
  email VARCHAR(255),
  telefone VARCHAR(20),
  escola_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
  assunto VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'aberto', -- 'aberto', 'em_analise', 'respondido', 'encerrado'
  resposta TEXT,
  respondido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  respondido_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_protocolo ON ouvidoria(protocolo);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_status ON ouvidoria(status);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_data ON ouvidoria(criado_em DESC);
COMMIT;
