-- ============================================
-- MIGRACAO: Conselho de Classe
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- Cria tabelas para registrar atas e decisoes do
-- conselho de classe por turma e bimestre.
--
-- IMPACTO:
-- - Nova tabela conselho_classe (ata geral)
-- - Nova tabela conselho_classe_alunos (parecer por aluno)
-- ============================================

-- Tabela principal: ata do conselho por turma/periodo
CREATE TABLE IF NOT EXISTS conselho_classe (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos_letivos(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    ano_letivo VARCHAR(10) NOT NULL,
    data_reuniao DATE,
    ata_geral TEXT,
    registrado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(turma_id, periodo_id)
);

-- Parecer individual por aluno no conselho
CREATE TABLE IF NOT EXISTS conselho_classe_alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conselho_id UUID NOT NULL REFERENCES conselho_classe(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    parecer VARCHAR(30) NOT NULL DEFAULT 'sem_parecer'
        CHECK (parecer IN ('aprovado', 'reprovado', 'recuperacao', 'progressao_parcial', 'sem_parecer')),
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conselho_id, aluno_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_conselho_turma ON conselho_classe(turma_id);
CREATE INDEX IF NOT EXISTS idx_conselho_periodo ON conselho_classe(periodo_id);
CREATE INDEX IF NOT EXISTS idx_conselho_escola ON conselho_classe(escola_id);
CREATE INDEX IF NOT EXISTS idx_conselho_alunos_conselho ON conselho_classe_alunos(conselho_id);
CREATE INDEX IF NOT EXISTS idx_conselho_alunos_aluno ON conselho_classe_alunos(aluno_id);

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_conselho_classe_updated_at ON conselho_classe;
CREATE TRIGGER update_conselho_classe_updated_at BEFORE UPDATE ON conselho_classe
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conselho_alunos_updated_at ON conselho_classe_alunos;
CREATE TRIGGER update_conselho_alunos_updated_at BEFORE UPDATE ON conselho_classe_alunos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO CONSELHO DE CLASSE CONCLUIDA ===';
END $$;
