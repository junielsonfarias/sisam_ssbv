-- ============================================================================
-- add-refresh-tokens.sql
-- Data: 2026-05-31
-- Auditoria: V8 ideal — refresh-token rotativo.
--
-- Access token JWT: 15 minutos (cookie httpOnly path=/)
-- Refresh token: 7 dias, armazenado por hash, rotacionado a cada uso.
-- Detecção de reuso: se um refresh já usado for tentado de novo, revoga
-- TODA a "família" daquele login (parent_jti chain) — sinal de roubo.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  jti              UUID PRIMARY KEY,
  usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash       VARCHAR(128) NOT NULL,
  family_id        UUID NOT NULL,
  parent_jti       UUID REFERENCES refresh_tokens(jti) ON DELETE SET NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  revoked_reason   VARCHAR(50),
  ip_address       VARCHAR(45),
  user_agent       TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario
  ON refresh_tokens(usuario_id, revoked_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
  ON refresh_tokens(family_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires
  ON refresh_tokens(expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE refresh_tokens IS
  'Refresh tokens para renovacao de access JWT. Rotacao + deteccao de reuso (V8 ideal, 31/05/2026).';
COMMENT ON COLUMN refresh_tokens.token_hash IS
  'SHA-256 do token assinado. Token bruto nunca persistido — somente cookie do cliente.';
COMMENT ON COLUMN refresh_tokens.family_id IS
  'Identifica todos os tokens originados do mesmo login. Reuso de qualquer um revoga a familia.';
COMMENT ON COLUMN refresh_tokens.parent_jti IS
  'Token anterior na cadeia de rotacao. Forma chain para deteccao de reuso.';
COMMENT ON COLUMN refresh_tokens.revoked_reason IS
  'Motivo: used_rotation | reuse_detected | logout | password_changed | admin_revoke';

COMMIT;
