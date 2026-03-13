-- ============================================
-- MIGRACAO: Dados Complementares do Aluno
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- Adiciona campos de informacoes pessoais, familiares,
-- sociais e de programas sociais ao cadastro do aluno.
--
-- IMPACTO:
-- - Novos campos nullable na tabela alunos
-- - Compativel com registros existentes
-- ============================================

-- Dados familiares
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nome_mae VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nome_pai VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS responsavel VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS telefone_responsavel VARCHAR(20);

-- Dados pessoais
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS genero VARCHAR(20)
  CHECK (genero IS NULL OR genero IN ('masculino', 'feminino', 'outro', 'nao_informado'));
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS raca_cor VARCHAR(30)
  CHECK (raca_cor IS NULL OR raca_cor IN ('branca', 'preta', 'parda', 'amarela', 'indigena', 'nao_declarada'));
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS naturalidade VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nacionalidade VARCHAR(100) DEFAULT 'Brasileira';

-- Documentos
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS rg VARCHAR(20);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS certidao_nascimento VARCHAR(50);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS sus VARCHAR(20);

-- Endereco
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cep VARCHAR(10);

-- Programas sociais
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS bolsa_familia BOOLEAN DEFAULT false;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nis VARCHAR(20);

-- Projetos e contraturno
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS projeto_contraturno BOOLEAN DEFAULT false;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS projeto_nome VARCHAR(255);

-- Saude e necessidades
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS tipo_deficiencia VARCHAR(255);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS alergia TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS medicacao TEXT;

-- Observacoes
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Indices
CREATE INDEX IF NOT EXISTS idx_alunos_nome_mae ON alunos(nome_mae);
CREATE INDEX IF NOT EXISTS idx_alunos_bolsa_familia ON alunos(bolsa_familia) WHERE bolsa_familia = true;
CREATE INDEX IF NOT EXISTS idx_alunos_nis ON alunos(nis) WHERE nis IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_projeto ON alunos(projeto_contraturno) WHERE projeto_contraturno = true;

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO DADOS COMPLEMENTARES DO ALUNO CONCLUIDA ===';
END $$;
