-- ============================================================================
-- add-ficai-conselho-tutelar.sql
-- Data: 2026-05-31
-- F5 (lacunas): integracao FICAI -> Conselho Tutelar.
--
-- A FICAI (Ficha de Comunicacao de Aluno Infrequente) ja existe (tabelas
-- ficai_casos + ficai_acoes). Faltava a "ponta": apos esgotar busca ativa
-- na escola, encaminhar formalmente ao Conselho Tutelar e registrar
-- o retorno.
--
-- Lei: ECA art. 56 — comunicacao obrigatoria de evasao escolar.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Cadastro de Conselhos Tutelares do municipio
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conselhos_tutelares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(150) NOT NULL,
  telefone        VARCHAR(20),
  whatsapp        VARCHAR(20),
  email           VARCHAR(150),
  endereco        TEXT,
  area_cobertura  TEXT,  -- bairros/regioes atendidas
  observacoes     TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (nome)
);
ALTER TABLE conselhos_tutelares ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Encaminhamentos FICAI -> CT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ficai_encaminhamentos_ct (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficai_id               UUID NOT NULL REFERENCES ficai_casos(id) ON DELETE CASCADE,
  conselho_tutelar_id    UUID NOT NULL REFERENCES conselhos_tutelares(id) ON DELETE RESTRICT,
  data_envio             DATE NOT NULL DEFAULT CURRENT_DATE,
  meio_envio             VARCHAR(20) NOT NULL CHECK (meio_envio IN (
    'presencial', 'whatsapp', 'email', 'oficio', 'plataforma_externa'
  )),
  protocolo              VARCHAR(50),
  documento_url          TEXT,  -- PDF do oficio
  status                 VARCHAR(25) NOT NULL DEFAULT 'enviado' CHECK (status IN (
    'enviado', 'recebido', 'em_atendimento', 'concluido', 'sem_resposta', 'devolvido'
  )),
  retorno_recebido_em    DATE,
  retorno_parecer        TEXT,
  retorno_acao           TEXT,  -- "matricula reativada", "encaminhado MP", etc.
  responsavel_envio_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  observacoes            TEXT,
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ficai_enc_ficai ON ficai_encaminhamentos_ct(ficai_id);
CREATE INDEX IF NOT EXISTS idx_ficai_enc_ct ON ficai_encaminhamentos_ct(conselho_tutelar_id, status);
CREATE INDEX IF NOT EXISTS idx_ficai_enc_status ON ficai_encaminhamentos_ct(status, data_envio DESC);
ALTER TABLE ficai_encaminhamentos_ct ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE conselhos_tutelares IS
  'Conselhos Tutelares do municipio (cadastro institucional).';
COMMENT ON TABLE ficai_encaminhamentos_ct IS
  'Encaminhamento formal da FICAI ao CT. Fecha o ciclo apos busca ativa esgotada (ECA art. 56).';

COMMIT;
