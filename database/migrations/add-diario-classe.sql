BEGIN;
CREATE TABLE IF NOT EXISTS diario_classe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  disciplina_id UUID REFERENCES disciplinas_escolares(id) ON DELETE SET NULL,
  data_aula DATE NOT NULL,
  conteudo TEXT NOT NULL,
  metodologia TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(professor_id, turma_id, disciplina_id, data_aula)
);
CREATE INDEX IF NOT EXISTS idx_diario_professor ON diario_classe(professor_id);
CREATE INDEX IF NOT EXISTS idx_diario_turma ON diario_classe(turma_id, data_aula DESC);
CREATE INDEX IF NOT EXISTS idx_diario_data ON diario_classe(data_aula DESC);
COMMIT;
