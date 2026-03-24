-- ============================================================================
-- Índices de performance v2 (2026-03-24)
-- Otimiza queries que usam REGEXP_REPLACE para série e filtros de presença
-- ============================================================================

-- 1. Expression index para número da série (evita full table scan com REGEXP_REPLACE)
-- Usado em: comparativos, estatisticas-serie, turmas, escolas com filtro de série
CREATE INDEX IF NOT EXISTS idx_alunos_serie_numero
  ON alunos (REGEXP_REPLACE(serie, '[^0-9]', '', 'g'))
  WHERE ativo = true AND serie IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rc_serie_numero
  ON resultados_consolidados (REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g'))
  WHERE serie IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_turmas_serie_numero
  ON turmas (REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g'))
  WHERE ativo = true AND serie IS NOT NULL;

-- 2. Índice para presença nos consolidados (filtro frequente P/F)
CREATE INDEX IF NOT EXISTS idx_rc_presenca
  ON resultados_consolidados (presenca)
  WHERE presenca IS NOT NULL;

-- 3. Índice para presença na unificada (usada em escolas e turmas com estatísticas)
CREATE INDEX IF NOT EXISTS idx_rcu_presenca
  ON resultados_consolidados_unificada (presenca)
  WHERE presenca IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rcu_escola_presenca
  ON resultados_consolidados_unificada (escola_id, presenca)
  WHERE presenca IN ('P', 'p', 'F', 'f');

-- 4. Índice para frequência diária por status (usado em agregação e resumo)
CREATE INDEX IF NOT EXISTS idx_fd_status_presente
  ON frequencia_diaria (escola_id, data)
  WHERE status = 'presente';

CREATE INDEX IF NOT EXISTS idx_fd_turma_data_status
  ON frequencia_diaria (turma_id, data, status);

-- 5. Índice para boletim público (busca por código ou CPF)
CREATE INDEX IF NOT EXISTS idx_alunos_codigo_ano
  ON alunos (codigo, ano_letivo)
  WHERE ativo = true AND codigo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alunos_cpf_nascimento
  ON alunos (cpf, data_nascimento)
  WHERE ativo = true AND cpf IS NOT NULL;

-- 6. Índice para notas escolares por aluno+disciplina+periodo (ON CONFLICT key)
CREATE INDEX IF NOT EXISTS idx_notas_esc_aluno_disc_periodo
  ON notas_escolares (aluno_id, disciplina_id, periodo_id);
