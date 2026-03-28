BEGIN;
CREATE TABLE IF NOT EXISTS comunicados_turma (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(30) DEFAULT 'aviso',
  data_publicacao TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comunicados_turma ON comunicados_turma(turma_id, data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_professor ON comunicados_turma(professor_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_ativo ON comunicados_turma(ativo) WHERE ativo = true;
COMMIT;
