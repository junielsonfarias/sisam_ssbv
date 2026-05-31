-- ============================================================================
-- MIGRATION: Solicitações LGPD (titular dos dados — Lei 13.709/2018)
-- Data: 2026-05-25 (Fase 1 SEMED)
-- Objetivo: armazenar solicitações de exportação, portabilidade e exclusão.
--
-- Art. 18: o titular pode solicitar acesso, portabilidade e eliminação dos
-- dados pessoais tratados. Esta tabela rastreia o fluxo dessas solicitações.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS lgpd_solicitacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('exportar', 'portabilidade', 'exclusao')),
  status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'em_processamento', 'concluida', 'cancelada', 'negada')),
  -- Texto livre opcional do solicitante
  motivo          TEXT,
  -- Data prevista para execução (exclusão: 15 dias de carência)
  prevista_para   TIMESTAMPTZ,
  -- Quando foi efetivamente concluída
  concluida_em    TIMESTAMPTZ,
  -- Quem aprovou/processou (apenas para exclusão e portabilidade)
  processado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Detalhes adicionais (URL do arquivo gerado, motivo de negação, etc.)
  detalhes        JSONB,
  ip_solicitacao  VARCHAR(45),
  user_agent      TEXT,
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_usuario_id
  ON lgpd_solicitacoes(usuario_id);

CREATE INDEX IF NOT EXISTS idx_lgpd_status
  ON lgpd_solicitacoes(status)
  WHERE status IN ('pendente', 'em_processamento');

CREATE INDEX IF NOT EXISTS idx_lgpd_tipo
  ON lgpd_solicitacoes(tipo);

COMMENT ON TABLE lgpd_solicitacoes IS
  'Solicitações LGPD do titular: exportação (art. 18 II), portabilidade (art. 18 V) e exclusão (art. 18 VI).';

COMMENT ON COLUMN lgpd_solicitacoes.prevista_para IS
  'Data prevista para execução. Para exclusão, default = NOW() + 15 dias (carência de reversão).';

COMMIT;
