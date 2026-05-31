-- ============================================================================
-- MIGRATION: Status Page - Incidentes (Fase 4 SEMED)
-- Registro manual de incidentes operacionais e manutencoes planejadas.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS status_incidentes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN (
    'incidente',           -- problema nao planejado
    'manutencao_planejada', -- janela conhecida
    'degradacao',          -- servico funciona mas lento/parcial
    'comunicado'           -- aviso sem impacto operacional
  )),
  severidade      VARCHAR(20) NOT NULL DEFAULT 'media'
    CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),
  titulo          VARCHAR(255) NOT NULL,
  descricao       TEXT NOT NULL,
  -- Servicos afetados
  servicos_afetados TEXT[] DEFAULT '{}',
  -- ex: ['portal', 'api', 'banco', 'cache', 'email', 'mobile']
  -- Status do incidente
  status          VARCHAR(20) NOT NULL DEFAULT 'investigando'
    CHECK (status IN ('investigando', 'identificado', 'monitorando', 'resolvido')),
  inicio_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolucao_em    TIMESTAMPTZ,
  criado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_inc_status ON status_incidentes(status) WHERE status != 'resolvido';
CREATE INDEX IF NOT EXISTS idx_status_inc_inicio ON status_incidentes(inicio_em DESC);

-- Atualizacoes do incidente (timeline publica)
CREATE TABLE IF NOT EXISTS status_atualizacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id    UUID NOT NULL REFERENCES status_incidentes(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL,
  mensagem        TEXT NOT NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_status_atual_inc ON status_atualizacoes(incidente_id, criado_em DESC);

COMMENT ON TABLE status_incidentes IS
  'Incidentes operacionais e manutencoes para a Status Page publica.';

COMMIT;
