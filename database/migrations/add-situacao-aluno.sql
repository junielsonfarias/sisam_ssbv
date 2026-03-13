-- ============================================
-- MIGRACAO: Situação do Aluno (Fase 1 - Gestor Escolar)
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- Adiciona controle de situação acadêmica do aluno (cursando, transferido,
-- abandono, aprovado, reprovado) com histórico completo de mudanças.
--
-- IMPACTO:
-- - Nova coluna: situacao em alunos
-- - Nova tabela: historico_situacao
-- - Backfill: alunos ativos recebem 'cursando'
-- ============================================

-- ============================================
-- ETAPA 1: Adicionar coluna situacao na tabela alunos
-- ============================================

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS situacao VARCHAR(20) DEFAULT 'cursando'
  CHECK (situacao IN ('cursando', 'transferido', 'abandono', 'aprovado', 'reprovado', 'remanejado'));

CREATE INDEX IF NOT EXISTS idx_alunos_situacao ON alunos(situacao);

-- ============================================
-- ETAPA 2: Criar tabela historico_situacao
-- ============================================

CREATE TABLE IF NOT EXISTS historico_situacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    situacao VARCHAR(20) NOT NULL CHECK (situacao IN ('cursando', 'transferido', 'abandono', 'aprovado', 'reprovado', 'remanejado')),
    situacao_anterior VARCHAR(20),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    registrado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hist_situacao_aluno ON historico_situacao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_hist_situacao_data ON historico_situacao(data);

-- ============================================
-- ETAPA 3: Backfill - alunos ativos = 'cursando'
-- ============================================

UPDATE alunos SET situacao = 'cursando' WHERE ativo = true AND situacao IS NULL;
UPDATE alunos SET situacao = 'transferido' WHERE ativo = false AND situacao IS NULL;

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

DO $$
DECLARE
    total_sem_situacao INTEGER;
    total_historico INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_sem_situacao FROM alunos WHERE situacao IS NULL;
    SELECT COUNT(*) INTO total_historico FROM historico_situacao;

    RAISE NOTICE '=== MIGRACAO SITUACAO ALUNO CONCLUIDA ===';
    RAISE NOTICE 'Alunos sem situacao: % (deve ser 0)', total_sem_situacao;
    RAISE NOTICE 'Registros no historico: %', total_historico;
END $$;
