-- ============================================================================
-- MIGRATION: Educacao Infantil - Portfolio do aluno (Fase 2 SEMED)
-- Berçario, Creche, Pre-escola: avaliacao documentada por portfolio
-- (fotos, atividades, observacoes da rotina).
-- ============================================================================

-- Grupos etarios da Ed. Infantil (G1 a G6)
CREATE TABLE IF NOT EXISTS ed_infantil_grupos_etarios (
  id           VARCHAR(10) PRIMARY KEY,
  nome         VARCHAR(50) NOT NULL,
  faixa_etaria VARCHAR(50) NOT NULL,
  -- BC (bebês 0-1a6m), CCR (creche 1a7m-3a11m), CRE (pre-escola 4a-5a11m)
  faixa_bncc   VARCHAR(10) NOT NULL,
  ordem        SMALLINT NOT NULL
);

INSERT INTO ed_infantil_grupos_etarios (id, nome, faixa_etaria, faixa_bncc, ordem) VALUES
  ('G1', 'Berçario I',     '0 a 11 meses',          'BC',  1),
  ('G2', 'Berçario II',    '1 ano a 1 ano 11 meses','BC',  2),
  ('G3', 'Maternal I',     '2 anos a 2 anos 11m',   'CCR', 3),
  ('G4', 'Maternal II',    '3 anos a 3 anos 11m',   'CCR', 4),
  ('G5', 'Pre-escola I',   '4 anos a 4 anos 11m',   'CRE', 5),
  ('G6', 'Pre-escola II',  '5 anos a 5 anos 11m',   'CRE', 6)
ON CONFLICT (id) DO NOTHING;

-- Vinculo turma <-> grupo etario
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS grupo_etario_id VARCHAR(10) REFERENCES ed_infantil_grupos_etarios(id);

-- Portfolio: registros multimidia da rotina do aluno
CREATE TABLE IF NOT EXISTS ed_infantil_portfolio (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  professor_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  data_registro DATE NOT NULL,
  -- Tipo de registro: foto, video, audio, atividade, observacao
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('foto', 'video', 'audio', 'atividade', 'observacao')),
  titulo        VARCHAR(255),
  descricao     TEXT,
  -- URL do arquivo (Storage/Vercel Blob) - NULL para observacao texto
  arquivo_url   VARCHAR(500),
  arquivo_tamanho_bytes BIGINT,
  -- Campo de experiencia BNCC vinculado (EOEU, CG, TS, EF, ET)
  campo_experiencia VARCHAR(10),
  -- Codigos BNCC vinculados (array)
  habilidades_bncc TEXT[] DEFAULT '{}',
  -- Visibilidade: privado (so professor) ou compartilhado com responsavel
  visivel_responsavel BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_porteinf_aluno ON ed_infantil_portfolio(aluno_id, data_registro DESC);
CREATE INDEX IF NOT EXISTS idx_porteinf_professor ON ed_infantil_portfolio(professor_id);
CREATE INDEX IF NOT EXISTS idx_porteinf_campo ON ed_infantil_portfolio(campo_experiencia);

COMMENT ON TABLE ed_infantil_portfolio IS
  'Portfolio individual do aluno de Educacao Infantil: fotos, videos, observacoes da rotina.';

-- Relatorios pedagogicos semestrais (Ed. Infantil)
-- A avaliacao descritiva ja cobre, esta tabela e para o relatorio formal
CREATE TABLE IF NOT EXISTS ed_infantil_relatorios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  ano_letivo      VARCHAR(4) NOT NULL,
  periodo         VARCHAR(20) NOT NULL,  -- 'semestre_1', 'semestre_2', 'final'
  -- Texto descritivo por campo de experiencia BNCC
  eu_outro_nos    TEXT,
  corpo_gestos_movimentos TEXT,
  tracos_sons_cores_formas TEXT,
  escuta_fala_pensamento  TEXT,
  espacos_tempos_quantidades TEXT,
  -- Observacoes gerais
  observacoes_gerais TEXT,
  -- Status
  status          VARCHAR(20) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'entregue')),
  professor_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  publicado_em    TIMESTAMPTZ,
  entregue_em     TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, ano_letivo, periodo)
);

CREATE INDEX IF NOT EXISTS idx_einfrel_aluno ON ed_infantil_relatorios(aluno_id);
CREATE INDEX IF NOT EXISTS idx_einfrel_ano ON ed_infantil_relatorios(ano_letivo, periodo);

COMMENT ON TABLE ed_infantil_relatorios IS
  'Relatorio descritivo semestral por campo de experiencia da BNCC para Ed. Infantil.';
