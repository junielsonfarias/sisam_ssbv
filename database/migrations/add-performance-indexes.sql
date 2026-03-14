-- ============================================
-- MIGRACAO: Índices de Performance para 50+ usuários
-- Data: 2026-03-14
-- ============================================

-- Índices para busca de alunos por nome (ILIKE)
CREATE INDEX IF NOT EXISTS idx_alunos_nome_trgm ON alunos USING gin (nome gin_trgm_ops);
-- Fallback se extensão pg_trgm não disponível
CREATE INDEX IF NOT EXISTS idx_alunos_nome_lower ON alunos (lower(nome));

-- Índice composto para listagem de alunos filtrada
CREATE INDEX IF NOT EXISTS idx_alunos_escola_ativo_nome ON alunos (escola_id, ativo, nome);
CREATE INDEX IF NOT EXISTS idx_alunos_situacao ON alunos (situacao) WHERE situacao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_turma_ativo ON alunos (turma_id, ativo) WHERE turma_id IS NOT NULL;

-- Índices para notas escolares (batch operations)
CREATE INDEX IF NOT EXISTS idx_notas_escolares_aluno_periodo ON notas_escolares (aluno_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_notas_escolares_aluno_ano ON notas_escolares (aluno_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_notas_escolares_escola_ano ON notas_escolares (escola_id, ano_letivo);

-- Índices para frequência
CREATE INDEX IF NOT EXISTS idx_frequencia_aluno_periodo ON frequencia_bimestral (aluno_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_escola_ano ON frequencia_bimestral (escola_id, ano_letivo);

-- Índices para histórico de situação
CREATE INDEX IF NOT EXISTS idx_hist_situacao_aluno_data ON historico_situacao (aluno_id, data DESC);

-- Índices para conselho de classe
CREATE INDEX IF NOT EXISTS idx_conselho_alunos_aluno ON conselho_classe_alunos (aluno_id);
CREATE INDEX IF NOT EXISTS idx_conselho_classe_turma_periodo ON conselho_classe (turma_id, periodo_id);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_notificacoes_dest_lida ON notificacoes (destinatario_tipo, lida, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_dest_id ON notificacoes (destinatario_id) WHERE destinatario_id IS NOT NULL;

-- Índices para fila de espera
CREATE INDEX IF NOT EXISTS idx_fila_espera_turma_status ON fila_espera (turma_id, status);

-- Índices para anos letivos
CREATE INDEX IF NOT EXISTS idx_anos_letivos_status ON anos_letivos (status);

-- ============================================
-- VERIFICACAO FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Índices de Performance criados ===';
  RAISE NOTICE 'Total: 16 índices para suportar 50+ usuários simultâneos';
END $$;
