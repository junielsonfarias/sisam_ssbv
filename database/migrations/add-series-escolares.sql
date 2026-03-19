-- Migration: Séries Escolares - Gestão de séries/etapas de ensino
-- Data: 2026-03-18

BEGIN;

-- Tabela principal de séries escolares
CREATE TABLE IF NOT EXISTS series_escolares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    etapa VARCHAR(30) NOT NULL,
    ordem INTEGER NOT NULL,
    media_aprovacao DECIMAL(5,2) DEFAULT 6.00,
    media_recuperacao DECIMAL(5,2) DEFAULT 5.00,
    nota_maxima DECIMAL(5,2) DEFAULT 10.00,
    max_dependencias INTEGER DEFAULT 0,
    formula_nota_final VARCHAR(20) DEFAULT 'media_aritmetica',
    permite_recuperacao BOOLEAN DEFAULT true,
    idade_minima INTEGER,
    idade_maxima INTEGER,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de junção séries x disciplinas
CREATE TABLE IF NOT EXISTS series_disciplinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serie_id UUID NOT NULL REFERENCES series_escolares(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES disciplinas_escolares(id) ON DELETE CASCADE,
    obrigatoria BOOLEAN DEFAULT true,
    carga_horaria_semanal INTEGER DEFAULT 4,
    ativo BOOLEAN DEFAULT true,
    UNIQUE(serie_id, disciplina_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_series_escolares_etapa ON series_escolares(etapa);
CREATE INDEX IF NOT EXISTS idx_series_escolares_ordem ON series_escolares(ordem);
CREATE INDEX IF NOT EXISTS idx_series_escolares_ativo ON series_escolares(ativo);
CREATE INDEX IF NOT EXISTS idx_series_disciplinas_serie ON series_disciplinas(serie_id);
CREATE INDEX IF NOT EXISTS idx_series_disciplinas_disciplina ON series_disciplinas(disciplina_id);

-- Seed: Educação Infantil
INSERT INTO series_escolares (codigo, nome, etapa, ordem, media_aprovacao, media_recuperacao, nota_maxima, max_dependencias, permite_recuperacao, idade_minima, idade_maxima)
VALUES
    ('CRE', 'Creche', 'educacao_infantil', 1, NULL, NULL, NULL, 0, false, 0, 3),
    ('PRE1', 'Pré-Escola I', 'educacao_infantil', 2, NULL, NULL, NULL, 0, false, 4, 4),
    ('PRE2', 'Pré-Escola II', 'educacao_infantil', 3, NULL, NULL, NULL, 0, false, 5, 5)
ON CONFLICT (codigo) DO NOTHING;

-- Seed: Fundamental Anos Iniciais
INSERT INTO series_escolares (codigo, nome, etapa, ordem, media_aprovacao, media_recuperacao, nota_maxima, max_dependencias, permite_recuperacao, idade_minima, idade_maxima)
VALUES
    ('1', '1º Ano', 'fundamental_anos_iniciais', 4, 6.00, 5.00, 10.00, 0, true, 6, 6),
    ('2', '2º Ano', 'fundamental_anos_iniciais', 5, 6.00, 5.00, 10.00, 0, true, 7, 7),
    ('3', '3º Ano', 'fundamental_anos_iniciais', 6, 6.00, 5.00, 10.00, 0, true, 8, 8),
    ('4', '4º Ano', 'fundamental_anos_iniciais', 7, 6.00, 5.00, 10.00, 0, true, 9, 9),
    ('5', '5º Ano', 'fundamental_anos_iniciais', 8, 6.00, 5.00, 10.00, 0, true, 10, 10)
ON CONFLICT (codigo) DO NOTHING;

-- Seed: Fundamental Anos Finais
INSERT INTO series_escolares (codigo, nome, etapa, ordem, media_aprovacao, media_recuperacao, nota_maxima, max_dependencias, permite_recuperacao, idade_minima, idade_maxima)
VALUES
    ('6', '6º Ano', 'fundamental_anos_finais', 9, 6.00, 5.00, 10.00, 3, true, 11, 11),
    ('7', '7º Ano', 'fundamental_anos_finais', 10, 6.00, 5.00, 10.00, 3, true, 12, 12),
    ('8', '8º Ano', 'fundamental_anos_finais', 11, 6.00, 5.00, 10.00, 3, true, 13, 13),
    ('9', '9º Ano', 'fundamental_anos_finais', 12, 6.00, 5.00, 10.00, 3, true, 14, 14)
ON CONFLICT (codigo) DO NOTHING;

-- Seed: EJA
INSERT INTO series_escolares (codigo, nome, etapa, ordem, media_aprovacao, media_recuperacao, nota_maxima, max_dependencias, permite_recuperacao, idade_minima, idade_maxima)
VALUES
    ('EJA1', 'EJA 1ª Etapa', 'eja', 13, 5.00, 5.00, 10.00, 0, true, NULL, NULL),
    ('EJA2', 'EJA 2ª Etapa', 'eja', 14, 5.00, 5.00, 10.00, 0, true, NULL, NULL),
    ('EJA3', 'EJA 3ª Etapa', 'eja', 15, 5.00, 5.00, 10.00, 0, true, NULL, NULL),
    ('EJA4', 'EJA 4ª Etapa', 'eja', 16, 5.00, 5.00, 10.00, 0, true, NULL, NULL)
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
