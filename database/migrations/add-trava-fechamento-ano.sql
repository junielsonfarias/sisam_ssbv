-- ============================================================================
-- add-trava-fechamento-ano.sql
-- Data: 2026-06-17
--
-- Trava de lançamento pós-fechamento (Plano Fase 1.3).
--
-- A aplicação já bloqueia o lançamento/alteração de notas quando o ano letivo
-- está com `anos_letivos.status = 'finalizado'` (checado em lancarNotas via
-- anoLetivoFinalizado(), nos endpoints admin e professor). Esta migration:
--   1. Registra QUANDO o ano foi finalizado (auditoria).
--   2. Adiciona uma trava no BANCO (defesa em profundidade): mesmo que algum
--      caminho não passe pela validação da aplicação, o INSERT/UPDATE em
--      notas_escolares é recusado para anos finalizados.
--
-- Idempotente. Aplicar no Supabase (banco fora do acesso MCP).
-- ============================================================================

BEGIN;

-- 1) Coluna de auditoria: quando o ano foi finalizado.
ALTER TABLE anos_letivos
  ADD COLUMN IF NOT EXISTS data_fechamento TIMESTAMP;

-- 2) Trava no banco — recusa lançamento de notas em ano finalizado.
CREATE OR REPLACE FUNCTION validar_lancamento_notas()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM anos_letivos
    WHERE ano = NEW.ano_letivo AND status = 'finalizado'
  ) THEN
    RAISE EXCEPTION 'Ano letivo % finalizado — lancamento de notas bloqueado', NEW.ano_letivo
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_lancamento_notas ON notas_escolares;
CREATE TRIGGER trg_validar_lancamento_notas
  BEFORE INSERT OR UPDATE ON notas_escolares
  FOR EACH ROW
  EXECUTE FUNCTION validar_lancamento_notas();

COMMIT;
