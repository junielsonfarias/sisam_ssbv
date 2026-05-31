-- ============================================================================
-- fix-gerar-numero-os-race.sql
-- Data: 2026-05-31
-- Auditoria: BD-3 — race condition em gerar_numero_os.
--
-- Antes: COUNT(*)+1 sem lock — INSERTs concorrentes geravam o mesmo numero.
-- Agora: pg_advisory_xact_lock por ano (auto-liberado no COMMIT/ROLLBACK).
-- Tambem fixa search_path (BD-5).
--
-- Padrao do projeto: mesmo modelo de lib/gerar-codigo-aluno.ts (advisory
-- lock anti-race documentado em /novo-codigo-sequencial).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.gerar_numero_os()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;

  v_ano := to_char(NOW(), 'YYYY');

  -- Anti-race: serializa MAX+1 dentro da transacao via advisory lock por ano.
  PERFORM pg_advisory_xact_lock(hashtext('gerar_numero_os'), v_ano::int);

  SELECT COALESCE(MAX(SUBSTRING(numero FROM '\d+$')::INTEGER), 0) + 1
    INTO v_seq
    FROM ordens_servico
   WHERE numero LIKE 'OS-' || v_ano || '-%';

  NEW.numero := 'OS-' || v_ano || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.gerar_numero_os() IS
  'Gera numero sequencial OS-YYYY-NNNNNN. Anti-race via pg_advisory_xact_lock. BD-3 auditoria 31/05/2026.';

COMMIT;
