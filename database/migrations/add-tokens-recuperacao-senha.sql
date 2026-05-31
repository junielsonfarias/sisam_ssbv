-- ============================================================================
-- MIGRATION: Tokens de Recuperação de Senha
-- Data: 2026-05-25 (Fase 1 SEMED)
-- Objetivo: armazenar tokens temporários para fluxo "esqueci minha senha"
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tokens_recuperacao_senha (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  -- Hash SHA-256 do token (não armazenamos o token em texto plano)
  token_hash       VARCHAR(64) NOT NULL UNIQUE,
  -- Tempo de expiração (default: 1 hora)
  expira_em        TIMESTAMPTZ NOT NULL,
  -- Marcado quando usado para impedir reuso
  usado_em         TIMESTAMPTZ,
  -- IP e user agent de origem da SOLICITAÇÃO (para auditoria)
  ip_solicitacao   VARCHAR(45),
  user_agent       TEXT,
  -- IP e user agent do USO efetivo (quando o token é redimido)
  ip_uso           VARCHAR(45),
  user_agent_uso   TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_recup_token_hash
  ON tokens_recuperacao_senha(token_hash);

CREATE INDEX IF NOT EXISTS idx_tokens_recup_usuario_id
  ON tokens_recuperacao_senha(usuario_id);

CREATE INDEX IF NOT EXISTS idx_tokens_recup_expira_em
  ON tokens_recuperacao_senha(expira_em)
  WHERE usado_em IS NULL;

COMMENT ON TABLE tokens_recuperacao_senha IS
  'Tokens temporários para recuperação de senha (Fase 1 SEMED). Hash do token armazenado, nunca o token em si.';

COMMENT ON COLUMN tokens_recuperacao_senha.token_hash IS
  'SHA-256 do token enviado por e-mail. Comparado com hash do token recebido para validar.';

COMMIT;
