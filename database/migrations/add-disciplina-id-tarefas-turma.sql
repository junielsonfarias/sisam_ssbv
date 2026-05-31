-- ============================================
-- MIGRACAO: disciplina_id em tarefas_turma
-- Data: 2026-05-30
-- ============================================
--
-- CONTEXTO:
-- A tabela tarefas_turma tem desde 2026-04-02 uma coluna `disciplina`
-- VARCHAR(100) — input livre. Para alinhar com a arquitetura BNCC do
-- portal professor (que usa disciplina_id em planos_aula, diario_classe
-- e notas_escolares), adicionamos FK opcional disciplina_id referenciando
-- disciplinas_escolares.
--
-- COMPATIBILIDADE:
-- A coluna `disciplina` (VARCHAR) e mantida nullable. O GET de
-- /api/professor/tarefas resolve via COALESCE(de.nome, t.disciplina)
-- preferindo a FK quando presente. Dados antigos continuam funcionando.
--
-- IDEMPOTENTE: pode rodar varias vezes sem efeito colateral.
-- Esta migracao ja foi aplicada via mcp__apply_migration em prod no dia
-- 2026-05-30 (nome: add_disciplina_id_to_tarefas_turma). Este arquivo
-- garante que clones do repositorio que rodem migrations locais tenham
-- o mesmo schema.
-- ============================================

BEGIN;

ALTER TABLE tarefas_turma
  ADD COLUMN IF NOT EXISTS disciplina_id UUID REFERENCES disciplinas_escolares(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_turma_disciplina_id
  ON tarefas_turma(disciplina_id)
  WHERE disciplina_id IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE '=== MIGRACAO disciplina_id EM tarefas_turma CONCLUIDA ===';
END $$;

COMMIT;
