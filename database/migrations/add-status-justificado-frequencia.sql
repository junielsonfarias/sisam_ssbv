-- ============================================
-- MIGRATION: Aceitar status='justificado' em frequencia_diaria
-- Data: 2026-05-29
-- ============================================
-- O CHECK constraint original (add-status-justificativa-frequencia.sql,
-- 2026-03-20) permitia apenas 'presente' e 'ausente'. Com a introducao
-- do botao FJ (Falta Justificada) no portal do professor, precisamos
-- aceitar 'justificado' tambem.

ALTER TABLE frequencia_diaria
  DROP CONSTRAINT IF EXISTS frequencia_diaria_status_check;

ALTER TABLE frequencia_diaria
  ADD CONSTRAINT frequencia_diaria_status_check
  CHECK (status IN ('presente', 'ausente', 'justificado'));

-- Verificacao
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'frequencia_diaria'::regclass
     AND conname = 'frequencia_diaria_status_check';
  RAISE NOTICE 'Novo CHECK: %', v_def;
END $$;
