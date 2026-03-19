-- Migration: Correcoes de integridade e performance
-- Data: 2026-03-19
-- Corrige: FKs faltantes, indexes, NOT NULL, triggers atualizado_em

BEGIN;

-- ============================================
-- FOREIGN KEYS FALTANTES
-- ============================================

-- notas_escolares.turma_id -> turmas
DO $$ BEGIN
  ALTER TABLE notas_escolares ADD CONSTRAINT fk_notas_turma
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- frequencia_diaria.turma_id -> turmas (se a coluna existir)
DO $$ BEGIN
  ALTER TABLE frequencia_diaria ADD CONSTRAINT fk_freq_diaria_turma
    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN undefined_column THEN NULL;
END $$;

-- ============================================
-- INDEXES FALTANTES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notas_escolares_turma ON notas_escolares(turma_id);
CREATE INDEX IF NOT EXISTS idx_notas_escolares_turma_aluno ON notas_escolares(turma_id, aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_escolares_aluno_ano ON notas_escolares(aluno_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_series_disciplinas_serie ON series_disciplinas(serie_id);
CREATE INDEX IF NOT EXISTS idx_series_disciplinas_disciplina ON series_disciplinas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_diaria_turma ON frequencia_diaria(turma_id) WHERE turma_id IS NOT NULL;

-- ============================================
-- TRIGGERS atualizado_em FALTANTES
-- ============================================

-- Funcao generica (criar se nao existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- series_escolares
DROP TRIGGER IF EXISTS set_series_escolares_updated_at ON series_escolares;
CREATE TRIGGER set_series_escolares_updated_at
    BEFORE UPDATE ON series_escolares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notas_escolares
DROP TRIGGER IF EXISTS set_notas_escolares_updated_at ON notas_escolares;
CREATE TRIGGER set_notas_escolares_updated_at
    BEFORE UPDATE ON notas_escolares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- turmas (se tem coluna atualizado_em)
DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_turmas_updated_at ON turmas;
  CREATE TRIGGER set_turmas_updated_at
      BEFORE UPDATE ON turmas
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- alunos (se tem coluna atualizado_em)
DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_alunos_updated_at ON alunos;
  CREATE TRIGGER set_alunos_updated_at
      BEFORE UPDATE ON alunos
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

COMMIT;
