-- Migration: Séries completas e configuração por escola
-- Data: 2026-03-18
-- Descrição: Adiciona campos de aprovação/nota à configuracao_series, seed de séries faltantes,
--            cria tabela series_escola e auto-popula a partir das turmas existentes

BEGIN;

-- ============================================
-- NOVOS CAMPOS EM configuracao_series
-- ============================================
ALTER TABLE configuracao_series ADD COLUMN IF NOT EXISTS media_aprovacao DECIMAL(5,2) DEFAULT 6.00;
ALTER TABLE configuracao_series ADD COLUMN IF NOT EXISTS media_recuperacao DECIMAL(5,2) DEFAULT 5.00;
ALTER TABLE configuracao_series ADD COLUMN IF NOT EXISTS nota_maxima DECIMAL(5,2) DEFAULT 10.00;
ALTER TABLE configuracao_series ADD COLUMN IF NOT EXISTS max_dependencias INTEGER DEFAULT 0;
ALTER TABLE configuracao_series ADD COLUMN IF NOT EXISTS formula_nota_final VARCHAR(20) DEFAULT 'media_aritmetica'
    CHECK (formula_nota_final IN ('media_aritmetica', 'media_ponderada', 'soma'));

-- ============================================
-- SEED DE SÉRIES FALTANTES
-- ============================================

-- 1o Ano - anos iniciais
INSERT INTO configuracao_series (serie, nome_serie, tipo_ensino, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tem_producao_textual, media_aprovacao, max_dependencias)
VALUES ('1', '1º Ano', 'anos_iniciais', true, true, false, false, false, 6.0, 0)
ON CONFLICT (serie) DO NOTHING;

-- 4o Ano - anos iniciais
INSERT INTO configuracao_series (serie, nome_serie, tipo_ensino, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tem_producao_textual, media_aprovacao, max_dependencias)
VALUES ('4', '4º Ano', 'anos_iniciais', true, true, false, false, false, 6.0, 0)
ON CONFLICT (serie) DO NOTHING;

-- 6o Ano - anos finais
INSERT INTO configuracao_series (serie, nome_serie, tipo_ensino, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tem_producao_textual, media_aprovacao, max_dependencias)
VALUES ('6', '6º Ano', 'anos_finais', true, true, true, true, false, 6.0, 3)
ON CONFLICT (serie) DO NOTHING;

-- 7o Ano - anos finais
INSERT INTO configuracao_series (serie, nome_serie, tipo_ensino, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tem_producao_textual, media_aprovacao, max_dependencias)
VALUES ('7', '7º Ano', 'anos_finais', true, true, true, true, false, 6.0, 3)
ON CONFLICT (serie) DO NOTHING;

-- ============================================
-- ATUALIZAR SÉRIES EXISTENTES COM DEFAULTS
-- ============================================
UPDATE configuracao_series
SET media_aprovacao = COALESCE(media_aprovacao, 6.0),
    max_dependencias = COALESCE(max_dependencias, 0)
WHERE tipo_ensino = 'anos_iniciais';

UPDATE configuracao_series
SET media_aprovacao = COALESCE(media_aprovacao, 6.0),
    max_dependencias = COALESCE(max_dependencias, 3)
WHERE tipo_ensino = 'anos_finais';

-- ============================================
-- TABELA series_escola
-- ============================================
CREATE TABLE IF NOT EXISTS series_escola (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    serie VARCHAR(50) NOT NULL,
    ano_letivo VARCHAR(10) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(escola_id, serie, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_series_escola_escola ON series_escola(escola_id);
CREATE INDEX IF NOT EXISTS idx_series_escola_ano ON series_escola(ano_letivo);

-- ============================================
-- AUTO-POPULAR A PARTIR DAS TURMAS EXISTENTES
-- ============================================
INSERT INTO series_escola (escola_id, serie, ano_letivo)
SELECT DISTINCT t.escola_id, REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g'), t.ano_letivo
FROM turmas t
WHERE t.ativo = true AND t.serie IS NOT NULL
ON CONFLICT (escola_id, serie, ano_letivo) DO NOTHING;

COMMIT;
