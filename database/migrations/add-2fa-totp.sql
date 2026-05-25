-- ============================================================================
-- MIGRATION: 2FA TOTP (autenticação em dois fatores)
-- Data: 2026-05-25 (Fase 1 SEMED)
-- Objetivo: armazenar segredo TOTP por usuário e códigos de backup
--
-- Política: obrigatório para tipos 'administrador' e 'tecnico'
-- Opcional para os demais.
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios_2fa (
  usuario_id          UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  -- Segredo TOTP base32 (16-32 chars). Armazenado em texto plano —
  -- a confidencialidade vem do banco e do RLS. Para criptografia em repouso
  -- adicional, considerar pgcrypto em uma migration futura.
  secret              VARCHAR(128) NOT NULL,
  -- Códigos de backup (uso único). JSON array de hashes SHA-256.
  -- Ao gerar, mostramos os códigos em texto plano UMA vez; apenas o hash fica.
  backup_codes_hashes JSONB DEFAULT '[]'::jsonb,
  -- Marcado true depois que o usuário verifica pela primeira vez (não é só "secret criado")
  ativado             BOOLEAN NOT NULL DEFAULT FALSE,
  ativado_em          TIMESTAMPTZ,
  ultimo_uso_em       TIMESTAMPTZ,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_2fa_ativado
  ON usuarios_2fa(ativado)
  WHERE ativado = true;

COMMENT ON TABLE usuarios_2fa IS
  'Configuração de 2FA TOTP por usuário (Fase 1 SEMED). Obrigatório para administrador/tecnico.';

COMMENT ON COLUMN usuarios_2fa.backup_codes_hashes IS
  'Hashes SHA-256 dos códigos de backup. Códigos plain text são mostrados ao usuário UMA vez na geração.';
