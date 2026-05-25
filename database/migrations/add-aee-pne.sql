-- ============================================================================
-- MIGRATION: AEE - Atendimento Educacional Especializado (Fase 2 SEMED)
-- Inclusao escolar conforme Lei 13.146/2015 (Lei Brasileira de Inclusao).
-- ============================================================================

-- Salas de Recursos Multifuncionais
CREATE TABLE IF NOT EXISTS aee_salas_recursos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  nome            VARCHAR(255) NOT NULL,
  -- Tipo: I (basica) ou II (atende deficiencia visual)
  tipo_sala       VARCHAR(10) NOT NULL DEFAULT 'tipo_i' CHECK (tipo_sala IN ('tipo_i', 'tipo_ii')),
  professor_responsavel_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  capacidade      SMALLINT DEFAULT 20,
  horario_funcionamento TEXT,
  ativa           BOOLEAN NOT NULL DEFAULT TRUE,
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aee_salas_escola ON aee_salas_recursos(escola_id);

-- Vinculo aluno <-> AEE com tipo de deficiencia (LDB Art. 58 + Decreto 7.611/2011)
CREATE TABLE IF NOT EXISTS alunos_aee (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL UNIQUE REFERENCES alunos(id) ON DELETE CASCADE,
  -- Tipo de deficiencia (multipla via array)
  tipos_deficiencia TEXT[] NOT NULL DEFAULT '{}',
  -- Possiveis: 'fisica', 'auditiva', 'visual', 'intelectual', 'multipla',
  --            'tea' (transtorno do espectro autista),
  --            'altas_habilidades', 'surdocegueira',
  --            'transtorno_global_desenvolvimento'
  cid_codigos     TEXT[] DEFAULT '{}',  -- codigos CID-10 ou CID-11
  laudo_medico    BOOLEAN NOT NULL DEFAULT FALSE,
  laudo_data      DATE,
  laudo_arquivo_url VARCHAR(500),  -- URL no Blob/storage
  laudo_emitido_por VARCHAR(255),  -- nome do medico/instituicao
  observacoes     TEXT,
  -- Necessidades especificas
  necessita_cuidador   BOOLEAN NOT NULL DEFAULT FALSE,
  necessita_interprete BOOLEAN NOT NULL DEFAULT FALSE,
  recursos_especiais   TEXT[] DEFAULT '{}',  -- ex: ['libras', 'braile', 'cadeira_rodas', 'audiodescricao']
  sala_recursos_id     UUID REFERENCES aee_salas_recursos(id) ON DELETE SET NULL,
  frequencia_aee       VARCHAR(50),  -- ex: '2x/semana', 'diaria'
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alunos_aee_aluno ON alunos_aee(aluno_id);
CREATE INDEX IF NOT EXISTS idx_alunos_aee_sala ON alunos_aee(sala_recursos_id);

-- Plano Educacional Individualizado (PEI) / Plano AEE
CREATE TABLE IF NOT EXISTS aee_planos_individuais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  ano_letivo      VARCHAR(4) NOT NULL,
  -- Objetivos pedagogicos
  objetivos       TEXT NOT NULL,
  -- Estrategias e metodologias
  estrategias     TEXT NOT NULL,
  recursos_necessarios TEXT,
  -- Areas trabalhadas (ex: comunicacao, autonomia, aprendizagem)
  areas_foco      TEXT[] DEFAULT '{}',
  -- Periodicidade do AEE
  periodicidade_horas_semanais SMALLINT,
  -- Avaliacao de progresso (texto livre)
  avaliacao_progresso TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('rascunho', 'ativo', 'concluido', 'cancelado')),
  professor_aee_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  data_inicio     DATE NOT NULL,
  data_revisao    DATE,
  data_fim        DATE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_aee_planos_aluno ON aee_planos_individuais(aluno_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_aee_planos_status ON aee_planos_individuais(status);

-- Registros de atendimento AEE (sessoes)
CREATE TABLE IF NOT EXISTS aee_atendimentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id        UUID NOT NULL REFERENCES aee_planos_individuais(id) ON DELETE CASCADE,
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  professor_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  data_atendimento DATE NOT NULL,
  duracao_minutos SMALLINT NOT NULL DEFAULT 50,
  presente        BOOLEAN NOT NULL DEFAULT TRUE,
  atividades_realizadas TEXT,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aee_atend_aluno ON aee_atendimentos(aluno_id, data_atendimento DESC);
CREATE INDEX IF NOT EXISTS idx_aee_atend_plano ON aee_atendimentos(plano_id);

COMMENT ON TABLE alunos_aee IS
  'Cadastro do aluno publico-alvo da educacao especial (PNE). Inclui tipos de deficiencia, laudo, recursos.';

COMMENT ON TABLE aee_planos_individuais IS
  'Plano AEE (Plano Educacional Individualizado) anual por aluno.';

COMMENT ON TABLE aee_atendimentos IS
  'Registros das sessoes individuais de AEE (frequencia + atividades).';
