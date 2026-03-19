-- Migration: Tipos e Regras de Avaliacao (padrao INEP)
-- Data: 2026-03-18

BEGIN;

-- ============================================
-- Tabela: tipos_avaliacao
-- ============================================

CREATE TABLE IF NOT EXISTS tipos_avaliacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo_resultado VARCHAR(20) NOT NULL CHECK (tipo_resultado IN ('parecer', 'conceito', 'numerico', 'misto')),
    escala_conceitos JSONB,
    nota_minima DECIMAL(5,2) DEFAULT 0,
    nota_maxima DECIMAL(5,2) DEFAULT 10,
    permite_decimal BOOLEAN DEFAULT true,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tipos_avaliacao_codigo ON tipos_avaliacao(codigo);
CREATE INDEX IF NOT EXISTS idx_tipos_avaliacao_ativo ON tipos_avaliacao(ativo);

-- Seed: Tipos padrao
INSERT INTO tipos_avaliacao (codigo, nome, descricao, tipo_resultado, escala_conceitos, nota_minima, nota_maxima, permite_decimal)
VALUES
    ('PARECER_DESC', 'Parecer Descritivo', 'Avaliacao qualitativa por parecer do professor. Sem nota numerica.', 'parecer', NULL, 0, 0, false),
    ('CONCEITO', 'Avaliacao por Conceito', 'Avaliacao baseada em conceitos qualitativos com equivalencia numerica.', 'conceito',
        '[{"codigo":"E","nome":"Excelente","valor_numerico":10},{"codigo":"B","nome":"Bom","valor_numerico":8},{"codigo":"R","nome":"Regular","valor_numerico":6},{"codigo":"I","nome":"Insuficiente","valor_numerico":4}]'::jsonb,
        0, 10, false),
    ('NUMERICO_10', 'Nota Numerica (0-10)', 'Avaliacao por nota numerica na escala de 0 a 10.', 'numerico', NULL, 0, 10, true),
    ('NUMERICO_100', 'Nota Numerica (0-100)', 'Avaliacao por nota numerica na escala de 0 a 100.', 'numerico', NULL, 0, 100, true),
    ('MISTO', 'Avaliacao Mista', 'Combinacao de parecer descritivo com conceito ou nota.', 'misto', NULL, 0, 10, true)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- Tabela: regras_avaliacao
-- ============================================

CREATE TABLE IF NOT EXISTS regras_avaliacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    tipo_avaliacao_id UUID NOT NULL REFERENCES tipos_avaliacao(id),
    tipo_periodo VARCHAR(20) NOT NULL DEFAULT 'bimestral' CHECK (tipo_periodo IN ('anual', 'semestral', 'trimestral', 'bimestral')),
    qtd_periodos INTEGER NOT NULL DEFAULT 4,
    media_aprovacao DECIMAL(5,2) DEFAULT 6.00,
    media_recuperacao DECIMAL(5,2) DEFAULT 5.00,
    nota_maxima DECIMAL(5,2) DEFAULT 10.00,
    permite_recuperacao BOOLEAN DEFAULT true,
    recuperacao_por_periodo BOOLEAN DEFAULT false,
    max_dependencias INTEGER DEFAULT 0,
    formula_media VARCHAR(30) DEFAULT 'media_aritmetica' CHECK (formula_media IN ('media_aritmetica', 'media_ponderada', 'maior_nota', 'soma_dividida')),
    pesos_periodos JSONB,
    arredondamento VARCHAR(10) DEFAULT 'normal' CHECK (arredondamento IN ('normal', 'cima', 'baixo', 'nenhum')),
    casas_decimais INTEGER DEFAULT 1,
    aprovacao_automatica BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_regras_avaliacao_tipo ON regras_avaliacao(tipo_avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_regras_avaliacao_ativo ON regras_avaliacao(ativo);

-- Seed: Regras padrao
INSERT INTO regras_avaliacao (nome, descricao, tipo_avaliacao_id, tipo_periodo, qtd_periodos, media_aprovacao, media_recuperacao, nota_maxima, permite_recuperacao, recuperacao_por_periodo, max_dependencias, formula_media, pesos_periodos, arredondamento, casas_decimais, aprovacao_automatica)
VALUES
    (
        'Parecer Semestral (Creche ao 3o Ano)',
        'Avaliacao por parecer descritivo com 2 periodos semestrais. Aprovacao automatica.',
        (SELECT id FROM tipos_avaliacao WHERE codigo = 'PARECER_DESC'),
        'semestral', 2, NULL, NULL, NULL, false, false, 0, 'media_aritmetica',
        '[{"periodo":1,"peso":1},{"periodo":2,"peso":1}]'::jsonb,
        'nenhum', 0, true
    ),
    (
        'Conceito Bimestral (4o e 5o Ano)',
        'Avaliacao por conceito com 4 periodos bimestrais.',
        (SELECT id FROM tipos_avaliacao WHERE codigo = 'CONCEITO'),
        'bimestral', 4, 6.00, 5.00, 10.00, true, false, 0, 'media_aritmetica',
        '[{"periodo":1,"peso":1},{"periodo":2,"peso":1},{"periodo":3,"peso":1},{"periodo":4,"peso":1}]'::jsonb,
        'normal', 1, false
    ),
    (
        'Nota Bimestral (6o ao 9o Ano)',
        'Avaliacao por nota numerica com 4 periodos bimestrais.',
        (SELECT id FROM tipos_avaliacao WHERE codigo = 'NUMERICO_10'),
        'bimestral', 4, 6.00, 5.00, 10.00, true, false, 3, 'media_aritmetica',
        '[{"periodo":1,"peso":1},{"periodo":2,"peso":1},{"periodo":3,"peso":1},{"periodo":4,"peso":1}]'::jsonb,
        'normal', 1, false
    ),
    (
        'EJA Semestral',
        'Avaliacao por nota numerica com 2 periodos semestrais para EJA.',
        (SELECT id FROM tipos_avaliacao WHERE codigo = 'NUMERICO_10'),
        'semestral', 2, 5.00, 5.00, 10.00, true, false, 0, 'media_aritmetica',
        '[{"periodo":1,"peso":1},{"periodo":2,"peso":1}]'::jsonb,
        'normal', 1, false
    )
ON CONFLICT DO NOTHING;

-- ============================================
-- Adicionar colunas em series_escolares
-- ============================================

ALTER TABLE series_escolares ADD COLUMN IF NOT EXISTS tipo_avaliacao_id UUID REFERENCES tipos_avaliacao(id);
ALTER TABLE series_escolares ADD COLUMN IF NOT EXISTS regra_avaliacao_id UUID REFERENCES regras_avaliacao(id);

CREATE INDEX IF NOT EXISTS idx_series_escolares_tipo_avaliacao ON series_escolares(tipo_avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_series_escolares_regra_avaliacao ON series_escolares(regra_avaliacao_id);

-- ============================================
-- Vincular series aos tipos/regras padrao
-- ============================================

-- Creche, PRE1, PRE2, 1, 2, 3 -> Parecer Semestral
UPDATE series_escolares
SET tipo_avaliacao_id = (SELECT id FROM tipos_avaliacao WHERE codigo = 'PARECER_DESC'),
    regra_avaliacao_id = (SELECT id FROM regras_avaliacao WHERE nome = 'Parecer Semestral (Creche ao 3o Ano)' LIMIT 1),
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo IN ('CRE', 'PRE1', 'PRE2', '1', '2', '3')
  AND tipo_avaliacao_id IS NULL;

-- 4, 5 -> Conceito Bimestral
UPDATE series_escolares
SET tipo_avaliacao_id = (SELECT id FROM tipos_avaliacao WHERE codigo = 'CONCEITO'),
    regra_avaliacao_id = (SELECT id FROM regras_avaliacao WHERE nome = 'Conceito Bimestral (4o e 5o Ano)' LIMIT 1),
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo IN ('4', '5')
  AND tipo_avaliacao_id IS NULL;

-- 6, 7, 8, 9 -> Nota Bimestral
UPDATE series_escolares
SET tipo_avaliacao_id = (SELECT id FROM tipos_avaliacao WHERE codigo = 'NUMERICO_10'),
    regra_avaliacao_id = (SELECT id FROM regras_avaliacao WHERE nome = 'Nota Bimestral (6o ao 9o Ano)' LIMIT 1),
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo IN ('6', '7', '8', '9')
  AND tipo_avaliacao_id IS NULL;

-- EJA1-4 -> EJA Semestral
UPDATE series_escolares
SET tipo_avaliacao_id = (SELECT id FROM tipos_avaliacao WHERE codigo = 'NUMERICO_10'),
    regra_avaliacao_id = (SELECT id FROM regras_avaliacao WHERE nome = 'EJA Semestral' LIMIT 1),
    atualizado_em = CURRENT_TIMESTAMP
WHERE codigo IN ('EJA1', 'EJA2', 'EJA3', 'EJA4')
  AND tipo_avaliacao_id IS NULL;

COMMIT;
