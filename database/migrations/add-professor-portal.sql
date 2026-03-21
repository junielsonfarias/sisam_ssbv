-- ============================================================================
-- Migration: Portal do Professor
-- Data: 2026-03-21
-- Descrição: Adiciona tipo de usuário 'professor' e tabela de vínculo
--            professor-turma com suporte a polivalente (creche-5º) e
--            por disciplina (6º-9º).
-- ============================================================================

-- 1. Alterar CHECK constraint para incluir 'professor'
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
  CHECK (tipo_usuario IN ('administrador', 'tecnico', 'polo', 'escola', 'professor'));

-- 2. Tabela de vínculo professor-turma
CREATE TABLE IF NOT EXISTS professor_turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  disciplina_id UUID REFERENCES disciplinas_escolares(id) ON DELETE SET NULL,
  tipo_vinculo VARCHAR(20) NOT NULL CHECK (tipo_vinculo IN ('polivalente', 'disciplina')),
  ano_letivo VARCHAR(10) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Índices de busca
CREATE INDEX IF NOT EXISTS idx_prof_turmas_professor ON professor_turmas(professor_id);
CREATE INDEX IF NOT EXISTS idx_prof_turmas_turma ON professor_turmas(turma_id);
CREATE INDEX IF NOT EXISTS idx_prof_turmas_ano ON professor_turmas(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_prof_turmas_ativo ON professor_turmas(professor_id, ativo) WHERE ativo = true;

-- 4. Constraints de unicidade parcial
-- Polivalente (creche-5º): apenas 1 professor por turma por ano
CREATE UNIQUE INDEX IF NOT EXISTS idx_prof_turmas_polivalente_unique
  ON professor_turmas(turma_id, ano_letivo)
  WHERE tipo_vinculo = 'polivalente' AND ativo = true;

-- Disciplina (6º-9º): apenas 1 professor por turma+disciplina por ano
CREATE UNIQUE INDEX IF NOT EXISTS idx_prof_turmas_disciplina_unique
  ON professor_turmas(turma_id, disciplina_id, ano_letivo)
  WHERE tipo_vinculo = 'disciplina' AND ativo = true AND disciplina_id IS NOT NULL;

-- 5. Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_professor_turmas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_professor_turmas_updated ON professor_turmas;
CREATE TRIGGER trigger_professor_turmas_updated
  BEFORE UPDATE ON professor_turmas
  FOR EACH ROW
  EXECUTE FUNCTION update_professor_turmas_timestamp();

-- ============================================================================
-- Verificação
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'professor_turmas'
-- ORDER BY ordinal_position;
--
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'usuarios'::regclass AND conname LIKE '%tipo_usuario%';
