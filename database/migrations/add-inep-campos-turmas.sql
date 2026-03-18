-- Migration: Campos do Censo INEP para tabela turmas
-- Data: 2026-03-18
-- Descrição: Adiciona campos de turno, tipo de atendimento, modalidade e horários exigidos pelo Censo INEP

BEGIN;

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS turno VARCHAR(20)
    CHECK (turno IN ('matutino', 'vespertino', 'noturno', 'integral'));

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS tipo_atendimento VARCHAR(30) DEFAULT 'escolarizacao';

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS modalidade VARCHAR(20) DEFAULT 'regular';

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS etapa_ensino VARCHAR(50);

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS tipo_mediacao VARCHAR(20) DEFAULT 'presencial';

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS hora_inicio TIME;

ALTER TABLE turmas ADD COLUMN IF NOT EXISTS hora_fim TIME;

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_turmas_turno ON turmas(turno);
CREATE INDEX IF NOT EXISTS idx_turmas_modalidade ON turmas(modalidade);

COMMIT;
