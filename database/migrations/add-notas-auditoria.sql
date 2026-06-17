-- ============================================================================
-- add-notas-auditoria.sql
-- Data: 2026-06-17
--
-- Trilha de alteração de notas (Plano Fase 3.2).
--
-- Hoje o lançamento de nota é um UPSERT sem histórico: não se sabe quem mudou
-- a nota de um aluno, quando, nem de quanto para quanto. Esta tabela registra
-- o "de-para" a cada lançamento/alteração de nota.
--
-- O registro é gravado FORA da transação de lançamento e de forma NÃO-FATAL
-- (igual à filosofia de logs_auditoria): se esta tabela não existir ou o insert
-- falhar, o lançamento de nota NUNCA é bloqueado. Por isso é seguro aplicar
-- esta migration depois do deploy do código.
--
-- Idempotente. Aplicar no Supabase (banco fora do acesso MCP).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS notas_escolares_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  disciplina_id UUID,
  periodo_id UUID,
  turma_id UUID,
  escola_id UUID,
  ano_letivo VARCHAR(10),
  acao VARCHAR(20) NOT NULL CHECK (acao IN ('lancamento', 'alteracao')),
  nota_anterior NUMERIC(5,2),
  nota_nova NUMERIC(5,2),
  nota_recuperacao_anterior NUMERIC(5,2),
  nota_recuperacao_nova NUMERIC(5,2),
  nota_final_anterior NUMERIC(5,2),
  nota_final_nova NUMERIC(5,2),
  alterado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notas_audit_aluno ON notas_escolares_auditoria(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_audit_disc_periodo ON notas_escolares_auditoria(disciplina_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_notas_audit_data ON notas_escolares_auditoria(criado_em DESC);

COMMENT ON TABLE notas_escolares_auditoria IS
  'Trilha de alteração de notas: de-para por aluno/disciplina/período, quem e quando.';

COMMIT;
