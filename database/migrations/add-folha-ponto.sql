-- ============================================================================
-- add-folha-ponto.sql
-- Data: 2026-05-31
-- F5 (lacunas): Folha de pagamento + Ponto eletronico para servidores escolares.
--
-- Cobertura minima:
--   - Registro de ponto (entrada/saida/intervalo)
--   - Folha mensal (provento/desconto/liquido)
--   - Eventos da folha (discriminacao linha-a-linha)
--
-- Integra com tabela `servidores` (RH escolar) que ja existe.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Ponto eletronico
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ponto_registros (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id              UUID NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  escola_id                UUID REFERENCES escolas(id) ON DELETE SET NULL,
  data                     DATE NOT NULL,
  hora_entrada             TIME,
  hora_saida               TIME,
  hora_intervalo_inicio    TIME,
  hora_intervalo_fim       TIME,
  tipo                     VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (tipo IN (
    'normal', 'falta', 'falta_justificada', 'ferias', 'licenca', 'feriado', 'home_office'
  )),
  justificativa            TEXT,
  comprovante_url          TEXT,  -- atestado, declaracao, etc.
  origem_registro          VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (origem_registro IN (
    'manual', 'web', 'app', 'biometria', 'facial', 'qr'
  )),
  validado_por             UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  validado_em              TIMESTAMPTZ,
  observacoes              TEXT,
  criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (servidor_id, data)
);
CREATE INDEX IF NOT EXISTS idx_ponto_servidor_data ON ponto_registros(servidor_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_ponto_escola_data ON ponto_registros(escola_id, data DESC);
ALTER TABLE ponto_registros ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Folha de pagamento — cabecalho mensal
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS folha_pagamento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id     UUID NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  competencia_mes SMALLINT NOT NULL CHECK (competencia_mes BETWEEN 1 AND 12),
  competencia_ano SMALLINT NOT NULL CHECK (competencia_ano BETWEEN 2020 AND 2100),
  salario_base    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_proventos NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_descontos NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_liquido   NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho', 'fechada', 'paga', 'cancelada'
  )),
  data_pagamento  DATE,
  observacoes     TEXT,
  fechado_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fechado_em      TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (servidor_id, competencia_mes, competencia_ano)
);
CREATE INDEX IF NOT EXISTS idx_folha_comp ON folha_pagamento(competencia_ano DESC, competencia_mes DESC);
CREATE INDEX IF NOT EXISTS idx_folha_servidor ON folha_pagamento(servidor_id);
ALTER TABLE folha_pagamento ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Folha — eventos discriminados (proventos e descontos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS folha_eventos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folha_id      UUID NOT NULL REFERENCES folha_pagamento(id) ON DELETE CASCADE,
  tipo          VARCHAR(15) NOT NULL CHECK (tipo IN ('provento', 'desconto')),
  codigo        VARCHAR(30) NOT NULL,
  descricao     VARCHAR(150) NOT NULL,
  referencia    VARCHAR(50),  -- ex: "30 dias", "5%", "30h"
  valor         NUMERIC(12,2) NOT NULL,
  ordem         SMALLINT DEFAULT 0,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_folha_eventos_folha ON folha_eventos(folha_id, ordem);
ALTER TABLE folha_eventos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ponto_registros IS
  'Registro diario de ponto eletronico — entrada/saida/intervalo. UNIQUE(servidor, data).';
COMMENT ON TABLE folha_pagamento IS
  'Folha mensal por servidor. Eventos discriminados em folha_eventos.';
COMMENT ON TABLE folha_eventos IS
  'Linhas de provento/desconto na folha mensal. Soma das linhas = total_*.';

COMMIT;
