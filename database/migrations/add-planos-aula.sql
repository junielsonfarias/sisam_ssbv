BEGIN;
CREATE TABLE IF NOT EXISTS planos_aula (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  disciplina_id UUID REFERENCES disciplinas_escolares(id) ON DELETE SET NULL,
  periodo VARCHAR(20) DEFAULT 'semanal',
  data_inicio DATE NOT NULL,
  data_fim DATE,
  objetivo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  metodologia TEXT,
  recursos TEXT,
  avaliacao TEXT,
  observacoes TEXT,
  status VARCHAR(20) DEFAULT 'rascunho',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_planos_professor ON planos_aula(professor_id);
CREATE INDEX IF NOT EXISTS idx_planos_turma ON planos_aula(turma_id, data_inicio DESC);
COMMIT;
