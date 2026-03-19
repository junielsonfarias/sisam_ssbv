-- Migration: Atualizar regras de avaliacao para media ponderada
-- Data: 2026-03-19
-- Formula: ((1a Av x 2) + (2a Av x 3) + (3a Av x 2) + (4a Av x 3)) / 10
-- Recuperacao: 1 por periodo, substitui a nota se for maior

BEGIN;

-- Atualizar regra "Conceito Bimestral (4o e 5o Ano)" para media ponderada
UPDATE regras_avaliacao
SET formula_media = 'media_ponderada',
    recuperacao_por_periodo = true,
    pesos_periodos = '[{"periodo":1,"peso":2},{"periodo":2,"peso":3},{"periodo":3,"peso":2},{"periodo":4,"peso":3}]'::jsonb,
    atualizado_em = CURRENT_TIMESTAMP
WHERE nome = 'Conceito Bimestral (4o e 5o Ano)';

-- Atualizar regra "Nota Bimestral (6o ao 9o Ano)" para media ponderada
UPDATE regras_avaliacao
SET formula_media = 'media_ponderada',
    recuperacao_por_periodo = true,
    pesos_periodos = '[{"periodo":1,"peso":2},{"periodo":2,"peso":3},{"periodo":3,"peso":2},{"periodo":4,"peso":3}]'::jsonb,
    atualizado_em = CURRENT_TIMESTAMP
WHERE nome = 'Nota Bimestral (6o ao 9o Ano)';

-- EJA Semestral: 2 periodos, pesos iguais, com recuperacao por periodo
UPDATE regras_avaliacao
SET recuperacao_por_periodo = true,
    pesos_periodos = '[{"periodo":1,"peso":1},{"periodo":2,"peso":1}]'::jsonb,
    atualizado_em = CURRENT_TIMESTAMP
WHERE nome = 'EJA Semestral';

COMMIT;
