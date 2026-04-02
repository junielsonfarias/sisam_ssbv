-- ============================================
-- MIGRACAO: Tarefas da Turma (Homework)
-- Data: 2026-04-02
-- ============================================
--
-- CONTEXTO:
-- Permite que professores criem tarefas/atividades com prazo.
-- Pais e alunos visualizam no portal com status (pendente/vencida).
--
-- IMPACTO:
-- - 1 nova tabela
-- ============================================

CREATE TABLE IF NOT EXISTS tarefas_turma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    disciplina VARCHAR(100),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_entrega DATE NOT NULL,
    tipo VARCHAR(30) DEFAULT 'atividade'
        CHECK (tipo IN ('atividade', 'trabalho', 'prova', 'pesquisa', 'leitura')),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tarefas_turma ON tarefas_turma(turma_id, data_entrega DESC);
CREATE INDEX IF NOT EXISTS idx_tarefas_professor ON tarefas_turma(professor_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_entrega ON tarefas_turma(data_entrega) WHERE ativo = true;

DROP TRIGGER IF EXISTS update_tarefas_turma_updated_at ON tarefas_turma;
CREATE TRIGGER update_tarefas_turma_updated_at BEFORE UPDATE ON tarefas_turma
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO TAREFAS TURMA CONCLUIDA ===';
END $$;
