-- ============================================================================
-- MIGRATION: Logo customizada por escola
-- Data: 2026-05-26
--
-- Permite que cada escola tenha sua propria logo (brasao, simbolo, etc.) que
-- aparece em documentos impressos como o diario de classe. URL relativa
-- (ex: /uploads/escolas/abc.png) ou absoluta.
-- ============================================================================

BEGIN;

ALTER TABLE escolas
  ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

COMMENT ON COLUMN escolas.logo_url IS
  'URL da logo da escola (relativa ou absoluta). Exibida em documentos como o diario de classe. NULL = sem logo, exibe so o nome em texto.';

-- Defesa em profundidade contra payloads excessivamente grandes (CHECK adicionado
-- depois via migration `escolas_logo_url_check_length` em 2026-05-26).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'escolas_logo_url_length_check'
  ) THEN
    ALTER TABLE escolas
      ADD CONSTRAINT escolas_logo_url_length_check
      CHECK (logo_url IS NULL OR length(logo_url) <= 500);
  END IF;
END $$;

COMMIT;
