-- ============================================================================
-- MIGRATION: BNCC (Base Nacional Comum Curricular)
-- Data: 2026-05-25 (Fase 2 SEMED)
-- Objetivo: estrutura curricular oficial da BNCC para vincular a questoes,
--           planos de aula, tarefas e avaliacoes descritivas.
-- Fonte: http://basenacionalcomum.mec.gov.br
-- ============================================================================

-- ----------------------------------------------------------------------------
-- COMPETENCIAS GERAIS (10 - aplicaveis a todas as etapas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bncc_competencias_gerais (
  id          SMALLINT PRIMARY KEY,  -- 1 a 10
  titulo      VARCHAR(255) NOT NULL,
  descricao   TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- ETAPAS DE ENSINO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bncc_etapas (
  id          VARCHAR(30) PRIMARY KEY,   -- 'EI', 'EF_AI', 'EF_AF', 'EM'
  nome        VARCHAR(100) NOT NULL,
  ordem       SMALLINT NOT NULL
);

-- ----------------------------------------------------------------------------
-- AREAS DE CONHECIMENTO (5 areas no Ensino Fundamental)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bncc_areas_conhecimento (
  id          VARCHAR(30) PRIMARY KEY,   -- 'LINGUAGENS', 'MATEMATICA', etc.
  nome        VARCHAR(100) NOT NULL,
  etapa_id    VARCHAR(30) REFERENCES bncc_etapas(id),
  ordem       SMALLINT NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- COMPONENTES CURRICULARES (Lingua Portuguesa, Matematica, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bncc_componentes_curriculares (
  id           VARCHAR(30) PRIMARY KEY,   -- 'LP', 'MAT', 'CIE', 'HIS', 'GEO'...
  nome         VARCHAR(100) NOT NULL,
  area_id      VARCHAR(30) REFERENCES bncc_areas_conhecimento(id),
  abreviatura  VARCHAR(10),
  ordem        SMALLINT NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- UNIDADES TEMATICAS / OBJETOS DE CONHECIMENTO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bncc_unidades_tematicas (
  id           VARCHAR(50) PRIMARY KEY,
  nome         VARCHAR(255) NOT NULL,
  componente_id VARCHAR(30) NOT NULL REFERENCES bncc_componentes_curriculares(id),
  ano_inicio   SMALLINT,    -- 1 a 9 (ou NULL para Ed. Infantil)
  ano_fim      SMALLINT,
  ordem        SMALLINT NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- HABILIDADES (codigos como EF01LP01, EF05MA10...)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bncc_habilidades (
  -- Codigo oficial: EF{ano}{componente}{numero} ou EI{faixa}{campo}{numero}
  codigo            VARCHAR(20) PRIMARY KEY,
  descricao         TEXT NOT NULL,
  componente_id     VARCHAR(30) REFERENCES bncc_componentes_curriculares(id),
  unidade_tematica_id VARCHAR(50) REFERENCES bncc_unidades_tematicas(id),
  etapa_id          VARCHAR(30) REFERENCES bncc_etapas(id),
  ano               SMALLINT,           -- 1-9 (NULL p/ Ed. Infantil)
  campo_experiencia VARCHAR(50),        -- Para Ed. Infantil (CE_EOEU, CE_CG...)
  faixa_etaria      VARCHAR(20),        -- Para Ed. Infantil (BC: 0-1a6m, CCR: 1a7m-3a11m, CRE: 4a-5a11m)
  ativa             BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bncc_hab_componente ON bncc_habilidades(componente_id);
CREATE INDEX IF NOT EXISTS idx_bncc_hab_etapa ON bncc_habilidades(etapa_id);
CREATE INDEX IF NOT EXISTS idx_bncc_hab_ano ON bncc_habilidades(ano) WHERE ano IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bncc_hab_campo_exp ON bncc_habilidades(campo_experiencia) WHERE campo_experiencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bncc_hab_descricao ON bncc_habilidades USING gin(to_tsvector('portuguese', descricao));

-- ----------------------------------------------------------------------------
-- VINCULOS (junction tables) - apenas se as entidades destino existirem
-- ----------------------------------------------------------------------------

-- Questoes <-> Habilidades BNCC
CREATE TABLE IF NOT EXISTS questoes_bncc_habilidades (
  questao_id      UUID NOT NULL,
  habilidade_codigo VARCHAR(20) NOT NULL REFERENCES bncc_habilidades(codigo),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (questao_id, habilidade_codigo)
);
CREATE INDEX IF NOT EXISTS idx_qbncc_habilidade ON questoes_bncc_habilidades(habilidade_codigo);

-- Planos de aula <-> Habilidades BNCC
CREATE TABLE IF NOT EXISTS planos_aula_bncc_habilidades (
  plano_id        UUID NOT NULL,
  habilidade_codigo VARCHAR(20) NOT NULL REFERENCES bncc_habilidades(codigo),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (plano_id, habilidade_codigo)
);
CREATE INDEX IF NOT EXISTS idx_pabncc_habilidade ON planos_aula_bncc_habilidades(habilidade_codigo);

-- Tarefas turma <-> Habilidades BNCC
CREATE TABLE IF NOT EXISTS tarefas_turma_bncc_habilidades (
  tarefa_id       UUID NOT NULL,
  habilidade_codigo VARCHAR(20) NOT NULL REFERENCES bncc_habilidades(codigo),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tarefa_id, habilidade_codigo)
);
CREATE INDEX IF NOT EXISTS idx_ttbncc_habilidade ON tarefas_turma_bncc_habilidades(habilidade_codigo);

COMMENT ON TABLE bncc_habilidades IS
  'Habilidades oficiais da BNCC (Base Nacional Comum Curricular). Codigos no formato EF{ano}{comp}{num} ou EI{faixa}{campo}{num}.';

COMMENT ON COLUMN bncc_habilidades.codigo IS
  'Codigo oficial da habilidade. Ex: EF01LP01 (1o ano LP, habilidade 1), EI02EO01 (creche, Eu/Outro/Nos, hab 1)';
