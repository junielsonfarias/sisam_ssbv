-- Migration: Popular disciplinas por serie + campos avaliacao em notas
-- Data: 2026-03-19

BEGIN;

-- ============================================
-- PARTE 1: Popular series_disciplinas
-- ============================================

-- Educacao Infantil (Creche, Pre I, Pre II) — sem disciplinas formais
-- Avaliacao apenas por parecer descritivo geral

-- 1o ao 5o Ano — 8 disciplinas (sem Ingles)
INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 6
        WHEN 'MAT' THEN 6
        WHEN 'CIE' THEN 2
        WHEN 'HIS' THEN 2
        WHEN 'GEO' THEN 2
        WHEN 'ART' THEN 1
        WHEN 'EDF' THEN 2
        WHEN 'REL' THEN 1
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('1', '2', '3', '4', '5')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
    obrigatoria = EXCLUDED.obrigatoria,
    carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
    ativo = true;

-- 6o ao 9o Ano — 9 disciplinas (com Ingles)
INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 5
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 3
        WHEN 'HIS' THEN 3
        WHEN 'GEO' THEN 3
        WHEN 'ART' THEN 1
        WHEN 'EDF' THEN 2
        WHEN 'REL' THEN 1
        WHEN 'ING' THEN 2
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('6', '7', '8', '9')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL', 'ING')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
    obrigatoria = EXCLUDED.obrigatoria,
    carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
    ativo = true;

-- EJA 1-4 — 5 disciplinas basicas
INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 5
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 3
        WHEN 'HIS' THEN 3
        WHEN 'GEO' THEN 3
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('EJA1', 'EJA2', 'EJA3', 'EJA4')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
    obrigatoria = EXCLUDED.obrigatoria,
    carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
    ativo = true;

-- ============================================
-- PARTE 2: Adicionar campos de avaliacao em notas_escolares
-- ============================================

-- Parecer descritivo (texto livre do professor)
ALTER TABLE notas_escolares ADD COLUMN IF NOT EXISTS parecer_descritivo TEXT;

-- Conceito (E, B, R, I)
ALTER TABLE notas_escolares ADD COLUMN IF NOT EXISTS conceito VARCHAR(5);

-- Referencia ao tipo de avaliacao utilizado
ALTER TABLE notas_escolares ADD COLUMN IF NOT EXISTS tipo_avaliacao_id UUID REFERENCES tipos_avaliacao(id);

-- Index para consultas por tipo
CREATE INDEX IF NOT EXISTS idx_notas_tipo_avaliacao ON notas_escolares(tipo_avaliacao_id);

COMMIT;
