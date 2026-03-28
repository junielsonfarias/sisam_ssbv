BEGIN;

-- 1. Adicionar 'publicador' ao tipo_usuario
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
  CHECK (tipo_usuario IN ('administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor', 'publicador'));

-- 2. Criar tabela publicacoes
CREATE TABLE IF NOT EXISTS publicacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL,
  numero VARCHAR(50),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  orgao VARCHAR(100) NOT NULL,
  data_publicacao DATE NOT NULL,
  ano_referencia VARCHAR(10),
  url_arquivo TEXT,
  ativo BOOLEAN DEFAULT true,
  publicado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_publicacoes_tipo ON publicacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_publicacoes_orgao ON publicacoes(orgao);
CREATE INDEX IF NOT EXISTS idx_publicacoes_ano ON publicacoes(ano_referencia);
CREATE INDEX IF NOT EXISTS idx_publicacoes_data ON publicacoes(data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_publicacoes_ativo ON publicacoes(ativo) WHERE ativo = true;

COMMIT;
