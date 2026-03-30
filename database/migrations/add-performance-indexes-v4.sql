-- ============================================================================
-- MIGRAÇÃO: Índices adicionais para performance com 50+ usuários
-- Data: 2026-03-30
-- ============================================================================

BEGIN;

-- Professor-Turmas: busca de vínculo (lançamento de notas, ~70 professores)
CREATE INDEX IF NOT EXISTS idx_prof_turmas_professor_turma_disc
ON professor_turmas(professor_id, turma_id, disciplina_id) WHERE ativo = true;

-- Alunos: keyset pagination (ORDER BY nome, id) — evita OFFSET lento
CREATE INDEX IF NOT EXISTS idx_alunos_nome_id
ON alunos(nome, id) WHERE ativo = true;

-- resultados_consolidados_unificada é uma VIEW — indexar a tabela base
CREATE INDEX IF NOT EXISTS idx_rc_ano_escola_presenca
ON resultados_consolidados(ano_letivo, escola_id, presenca)
WHERE presenca IS NOT NULL;

-- Notas Escolares: filtro escola + ano (dashboard gestor)
CREATE INDEX IF NOT EXISTS idx_notas_esc_escola_ano_nota
ON notas_escolares(escola_id, ano_letivo)
WHERE nota_final IS NOT NULL;

-- Histórico Situação: transferências (dashboard gestor)
CREATE INDEX IF NOT EXISTS idx_historico_situacao_aluno
ON historico_situacao(aluno_id);

CREATE INDEX IF NOT EXISTS idx_historico_situacao_tipo
ON historico_situacao(tipo_movimentacao) WHERE tipo_movimentacao IS NOT NULL;

COMMIT;
