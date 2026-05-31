-- ============================================================================
-- MIGRATION: Notificacoes Disparos (Fase 4 SEMED)
-- Rastreia notificacoes enviadas e preferencias por usuario.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS notificacoes_disparos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  -- Tipo de evento que disparou a notificacao
  evento_tipo     VARCHAR(50) NOT NULL CHECK (evento_tipo IN (
    'nota_lancada',
    'falta_consecutiva',
    'comunicado_novo',
    'ficai_aberto',
    'ordem_servico_criada',
    'ordem_servico_concluida',
    'cardapio_publicado',
    'reuniao_marcada',
    'declaracao_emitida',
    'matricula_aprovada',
    'sistema'
  )),
  -- Canal pelo qual foi enviado
  canal           VARCHAR(20) NOT NULL CHECK (canal IN (
    'push', 'email', 'in_app', 'sms', 'whatsapp'
  )),
  titulo          VARCHAR(255) NOT NULL,
  corpo           TEXT NOT NULL,
  -- Dados do evento (ID do aluno, OS, etc - para deep link)
  dados           JSONB DEFAULT '{}'::jsonb,
  -- Status do envio
  status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'enviada', 'lida', 'erro', 'cancelada')),
  enviada_em      TIMESTAMPTZ,
  lida_em         TIMESTAMPTZ,
  erro_mensagem   TEXT,
  -- Provider externo (Firebase, Resend...)
  provider_id     VARCHAR(255),  -- message_id do provider
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificacoes_disparos(destinatario_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_notif_status ON notificacoes_disparos(status) WHERE status IN ('pendente', 'erro');
CREATE INDEX IF NOT EXISTS idx_notif_tipo ON notificacoes_disparos(evento_tipo, criada_em DESC);

-- Preferencias de notificacao por usuario
CREATE TABLE IF NOT EXISTS notificacoes_preferencias (
  usuario_id      UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  -- Quais eventos recebem (por canal)
  push_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  -- Eventos opt-out (JSON array de evento_tipo)
  eventos_silenciados TEXT[] DEFAULT '{}',
  -- Horario silencioso (nao envia push neste intervalo)
  silencio_inicio TIME,
  silencio_fim    TIME,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notificacoes_disparos IS
  'Log de notificacoes enviadas (push, email, in-app). Permite reenvio e auditoria.';

COMMENT ON TABLE notificacoes_preferencias IS
  'Preferencias de notificacao por usuario: quais canais e eventos receber.';

COMMIT;
