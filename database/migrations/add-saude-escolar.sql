-- ============================================================================
-- add-saude-escolar.sql
-- Data: 2026-05-31
-- F5 (lacunas): Saude Escolar — convenio MEC+MS (PSE) + Lei 13.666/2018.
--
-- Cobertura minima:
--   - Atendimentos (medico, odontologico, psicologico, social)
--   - Vacinas registradas (cartao de vacina)
--   - Restricoes alimentares/alergias (cruza com PNAE)
--   - Encaminhamentos para a rede SUS
--
-- Acesso: equipe da escola + admin/tecnico SEMED. Dados sensiveis sob LGPD.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Atendimentos de saude (PSE — multidisciplinar)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saude_atendimentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE RESTRICT,
  data            DATE NOT NULL,
  tipo            VARCHAR(40) NOT NULL CHECK (tipo IN (
    'medico', 'odontologico', 'psicologico', 'social',
    'enfermagem', 'nutricional', 'fonoaudiologo', 'fisioterapeutico'
  )),
  profissional    VARCHAR(150),
  conselho_classe VARCHAR(50),  -- CRM, CRO, CRP, etc.
  motivo          TEXT,
  procedimentos   TEXT,
  encaminhamento  TEXT,
  unidade_sus     VARCHAR(150),
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saude_atend_aluno ON saude_atendimentos(aluno_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_saude_atend_escola ON saude_atendimentos(escola_id, data DESC);
ALTER TABLE saude_atendimentos ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Cartao de vacina
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saude_vacinas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  vacina_nome      VARCHAR(80) NOT NULL,
  dose             VARCHAR(20),  -- 1a dose, 2a dose, reforco, etc.
  data_aplicacao   DATE NOT NULL,
  lote             VARCHAR(50),
  unidade_aplicacao VARCHAR(150),
  observacoes      TEXT,
  registrado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, vacina_nome, dose, data_aplicacao)
);
CREATE INDEX IF NOT EXISTS idx_saude_vacinas_aluno ON saude_vacinas(aluno_id);
ALTER TABLE saude_vacinas ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Restricoes alimentares / alergias — cruza com cardapio PNAE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saude_restricoes_alimentares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) NOT NULL CHECK (tipo IN (
    'alergia', 'intolerancia', 'doenca_cronica', 'religiosa', 'vegetariano', 'vegano'
  )),
  descricao       TEXT NOT NULL,
  laudo_url       TEXT,  -- foto/PDF do laudo (URL Supabase Storage)
  ativo           BOOLEAN NOT NULL DEFAULT true,
  inicio_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  fim_vigencia    DATE,
  observacoes     TEXT,
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saude_restr_aluno_ativo ON saude_restricoes_alimentares(aluno_id, ativo);
ALTER TABLE saude_restricoes_alimentares ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE saude_atendimentos IS
  'Atendimentos do Programa Saude na Escola (PSE). PII sensivel — LGPD art. 11.';
COMMENT ON TABLE saude_vacinas IS
  'Registro do cartao de vacinacao do aluno.';
COMMENT ON TABLE saude_restricoes_alimentares IS
  'Restricoes/alergias — exibido na tela do PNAE para preparar cardapio adequado.';

COMMIT;
