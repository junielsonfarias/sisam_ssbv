-- ============================================
-- MIGRACAO: Frequência Bimestral
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- Cria tabela para registrar frequência de alunos por bimestre,
-- com dias letivos, presenças, faltas e percentual calculado.
-- Independente das faltas por disciplina em notas_escolares.
--
-- IMPACTO:
-- - Nova tabela frequencia_bimestral
-- ============================================

CREATE TABLE IF NOT EXISTS frequencia_bimestral (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos_letivos(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    ano_letivo VARCHAR(10) NOT NULL,
    dias_letivos INTEGER NOT NULL DEFAULT 0 CHECK (dias_letivos >= 0),
    presencas INTEGER NOT NULL DEFAULT 0 CHECK (presencas >= 0),
    faltas INTEGER NOT NULL DEFAULT 0 CHECK (faltas >= 0),
    faltas_justificadas INTEGER NOT NULL DEFAULT 0 CHECK (faltas_justificadas >= 0),
    percentual_frequencia DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN dias_letivos > 0 THEN ROUND((presencas::DECIMAL / dias_letivos) * 100, 2) ELSE 0 END
    ) STORED,
    observacao TEXT,
    registrado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id, periodo_id)
);

CREATE INDEX IF NOT EXISTS idx_freq_bim_aluno ON frequencia_bimestral(aluno_id);
CREATE INDEX IF NOT EXISTS idx_freq_bim_periodo ON frequencia_bimestral(periodo_id);
CREATE INDEX IF NOT EXISTS idx_freq_bim_turma ON frequencia_bimestral(turma_id);
CREATE INDEX IF NOT EXISTS idx_freq_bim_escola ON frequencia_bimestral(escola_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_frequencia_bimestral_updated_at ON frequencia_bimestral;
CREATE TRIGGER update_frequencia_bimestral_updated_at BEFORE UPDATE ON frequencia_bimestral
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO FREQUENCIA BIMESTRAL CONCLUIDA ===';
END $$;
