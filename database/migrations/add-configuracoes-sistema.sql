-- ============================================================================
-- MIGRATION: configuracoes_sistema (key-value para flags globais)
-- Data: 2026-05-25
-- Objetivo: armazenar flags/parametros globais do sistema editaveis em runtime
--           pelo admin (ex: 2FA habilitado, manutencao, limites, etc.)
--
-- Padrao: chave string, valor JSONB (aceita boolean, number, string, object).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  chave           VARCHAR(100) PRIMARY KEY,
  valor           JSONB NOT NULL,
  descricao       TEXT,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

COMMENT ON TABLE configuracoes_sistema IS
  'Configuracoes globais do sistema (flags, parametros) alteraveis pelo admin sem deploy.';

COMMENT ON COLUMN configuracoes_sistema.valor IS
  'Valor em JSONB. Para flags booleanas use true/false. Para textos use string JSON.';

-- Seed inicial: 2FA desabilitado por padrao (dev)
INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES (
  'dois_fatores_habilitado',
  'false'::jsonb,
  'Quando true, exige 2FA no login para usuarios que ativaram. Quando false, 2FA e pulado globalmente (modo dev/manutencao).'
)
ON CONFLICT (chave) DO NOTHING;

COMMIT;
