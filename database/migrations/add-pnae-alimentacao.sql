-- ============================================================================
-- MIGRATION: PNAE - Programa Nacional de Alimentacao Escolar (Fase 3 SEMED)
-- Base legal: Lei 11.947/2009 + Resolucao FNDE
-- ============================================================================

-- Nutricionistas responsaveis (cadastro tecnico)
CREATE TABLE IF NOT EXISTS pnae_nutricionistas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(255) NOT NULL,
  crn             VARCHAR(20) UNIQUE NOT NULL,
  -- CRN = Conselho Regional de Nutricionistas
  telefone        VARCHAR(20),
  email           VARCHAR(254),
  -- Responsavel tecnico geral do municipio? (Resolucao FNDE 06/2020)
  responsavel_tecnico BOOLEAN NOT NULL DEFAULT FALSE,
  ativa           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cardapio semanal por escola
CREATE TABLE IF NOT EXISTS pnae_cardapios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id       UUID REFERENCES escolas(id) ON DELETE CASCADE,
  -- escola_id NULL = cardapio padrao do municipio (aplicavel a todas)
  semana_inicio   DATE NOT NULL,
  semana_fim      DATE NOT NULL,
  -- Faixa etaria atendida (importante para PNAE - valores per capita diferentes)
  faixa_etaria    VARCHAR(30) NOT NULL CHECK (faixa_etaria IN (
    'creche', 'pre_escola', 'fundamental', 'eja', 'integral'
  )),
  nutricionista_id UUID REFERENCES pnae_nutricionistas(id) ON DELETE SET NULL,
  observacoes     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (escola_id, semana_inicio, faixa_etaria)
);

CREATE INDEX IF NOT EXISTS idx_pnae_card_escola ON pnae_cardapios(escola_id);
CREATE INDEX IF NOT EXISTS idx_pnae_card_semana ON pnae_cardapios(semana_inicio, semana_fim);

-- Refeicoes do cardapio (multiplas por dia)
CREATE TABLE IF NOT EXISTS pnae_refeicoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cardapio_id     UUID NOT NULL REFERENCES pnae_cardapios(id) ON DELETE CASCADE,
  dia_semana      SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  -- 1 = segunda, 7 = domingo
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN (
    'cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'
  )),
  descricao       TEXT NOT NULL,
  -- Ingredientes/restricoes detalhados (JSON livre)
  detalhes        JSONB DEFAULT '{}'::jsonb,
  -- Informacoes nutricionais aproximadas (opcional)
  kcal            NUMERIC(7,2),
  proteinas_g     NUMERIC(6,2),
  carboidratos_g  NUMERIC(6,2),
  gorduras_g      NUMERIC(6,2),
  -- Restricoes/alergenicos (gluten, lactose, etc.)
  contem_alergenicos TEXT[] DEFAULT '{}',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnae_ref_cardapio ON pnae_refeicoes(cardapio_id, dia_semana, tipo);

-- Registro diario de alunos atendidos (para prestacao FNDE)
CREATE TABLE IF NOT EXISTS pnae_atendimentos_diarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  data_atendimento DATE NOT NULL,
  faixa_etaria    VARCHAR(30) NOT NULL,
  tipo_refeicao   VARCHAR(20) NOT NULL,
  -- Numero de alunos servidos (para calculo do per capita)
  qtd_alunos      INTEGER NOT NULL CHECK (qtd_alunos >= 0),
  -- Aluno fora do PNAE (visitante) - nao conta para FNDE
  qtd_extra       INTEGER NOT NULL DEFAULT 0,
  observacoes     TEXT,
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (escola_id, data_atendimento, faixa_etaria, tipo_refeicao)
);

CREATE INDEX IF NOT EXISTS idx_pnae_atend_escola ON pnae_atendimentos_diarios(escola_id, data_atendimento DESC);
CREATE INDEX IF NOT EXISTS idx_pnae_atend_data ON pnae_atendimentos_diarios(data_atendimento);

-- Restricoes alimentares por aluno (alergias, diabetes, intolerancias)
CREATE TABLE IF NOT EXISTS pnae_restricoes_alunos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  tipo_restricao  VARCHAR(50) NOT NULL,
  -- ex: 'alergia_lactose', 'celiaco', 'diabetes', 'vegetariano', 'religiosa'
  descricao       TEXT NOT NULL,
  laudo_url       VARCHAR(500),
  registrada_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registrada_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ativa           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_pnae_rest_aluno ON pnae_restricoes_alunos(aluno_id) WHERE ativa = TRUE;

COMMENT ON TABLE pnae_cardapios IS 'Cardapios semanais por escola, faixa etaria e periodo (PNAE).';
COMMENT ON TABLE pnae_atendimentos_diarios IS 'Registro diario de refeicoes servidas para prestacao de contas ao FNDE.';
COMMENT ON TABLE pnae_restricoes_alunos IS 'Restricoes alimentares medicas/religiosas/dieteticas dos alunos.';
