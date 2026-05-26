-- ============================================================================
-- MIGRATION: Logo customizada por escola
-- Data: 2026-05-26
--
-- Permite que cada escola tenha sua propria logo (brasao, simbolo, etc.) que
-- aparece em documentos impressos como o diario de classe. URL relativa
-- (ex: /uploads/escolas/abc.png) ou absoluta.
-- ============================================================================

ALTER TABLE escolas
  ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

COMMENT ON COLUMN escolas.logo_url IS
  'URL da logo da escola (relativa ou absoluta). Exibida em documentos como o diario de classe. NULL = sem logo, exibe so o nome em texto.';
