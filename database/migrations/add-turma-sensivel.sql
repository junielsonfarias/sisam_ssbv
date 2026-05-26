-- ============================================================================
-- MIGRATION: Flag de turma sensível (LGPD / auditoria de leitura)
-- Data: 2026-05-26
--
-- Permite marcar uma turma como "sensível" (ex: AEE, EJA, turmas com alunos
-- em proteção judicial). Quando admin/técnico/escola abre o diário de uma
-- turma marcada como sensível, o acesso é registrado em logs_auditoria com
-- a ação DIARIO_LER_SENSIVEL.
--
-- Padrão Pt.2 audita apenas mutações. Esta é a primeira exceção deliberada
-- para LEITURA, justificada por LGPD art. 11 (dados sensíveis).
-- ============================================================================

ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS sensivel BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN turmas.sensivel IS
  'Quando TRUE, leituras do diário desta turma sao registradas em logs_auditoria (acao=DIARIO_LER_SENSIVEL). Usado para turmas AEE, EJA, ou com alunos em situacao especial (protecao judicial, etc.).';

-- Índice parcial: o caso comum é sensivel=FALSE, então só vale a pena
-- indexar as turmas marcadas (volumetria esperada: < 5% do total).
CREATE INDEX IF NOT EXISTS idx_turmas_sensivel
  ON turmas(id)
  WHERE sensivel = TRUE;
