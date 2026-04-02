-- ============================================
-- MIGRACAO: Portal do Responsavel (Pais)
-- Data: 2026-04-02
-- ============================================
--
-- CONTEXTO:
-- Cria infraestrutura para o Portal do Responsavel:
-- - Novo tipo de usuario 'responsavel'
-- - Tabela de vinculacao responsavel <-> aluno(s)
-- - Permite que pais acompanhem notas, frequencia e comunicados
--
-- IMPACTO:
-- - 1 nova tabela (responsaveis_alunos)
-- - ALTER na constraint de tipo_usuario
-- - 3 novos indices
-- ============================================

-- ============================================
-- PASSO 1: Atualizar CHECK constraint do tipo_usuario
-- Adicionar 'responsavel' como tipo valido
-- ============================================
DO $$
BEGIN
    -- Remover constraint antiga (se existir)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'usuarios_tipo_usuario_check'
        AND table_name = 'usuarios'
    ) THEN
        ALTER TABLE usuarios DROP CONSTRAINT usuarios_tipo_usuario_check;
    END IF;

    -- Criar nova constraint com 'responsavel'
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
        CHECK (tipo_usuario IN ('administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor', 'publicador', 'responsavel'));

    RAISE NOTICE 'CHECK constraint atualizada com tipo responsavel';
END $$;

-- ============================================
-- PASSO 2: Adicionar CPF na tabela usuarios (para login do responsavel)
-- ============================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Index unico para CPF (permite null, mas quando preenchido deve ser unico)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf_unique
    ON usuarios(cpf) WHERE cpf IS NOT NULL AND cpf != '';

-- ============================================
-- PASSO 3: Tabela de vinculacao responsavel <-> aluno
-- Um responsavel pode ter varios filhos
-- Um aluno pode ter varios responsaveis
-- ============================================
CREATE TABLE IF NOT EXISTS responsaveis_alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    tipo_vinculo VARCHAR(30) NOT NULL DEFAULT 'responsavel'
        CHECK (tipo_vinculo IN ('mae', 'pai', 'responsavel', 'avos', 'outro')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, aluno_id)
);

-- Indices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_resp_alunos_usuario ON responsaveis_alunos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_resp_alunos_aluno ON responsaveis_alunos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_resp_alunos_ativo ON responsaveis_alunos(usuario_id, ativo);

-- Trigger de atualizado_em
DROP TRIGGER IF EXISTS update_responsaveis_alunos_updated_at ON responsaveis_alunos;
CREATE TRIGGER update_responsaveis_alunos_updated_at BEFORE UPDATE ON responsaveis_alunos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICACAO
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO PORTAL RESPONSAVEL CONCLUIDA ===';
    RAISE NOTICE 'Tabela criada: responsaveis_alunos';
    RAISE NOTICE 'Coluna adicionada: usuarios.cpf';
    RAISE NOTICE 'Tipo responsavel adicionado ao CHECK constraint';
END $$;
