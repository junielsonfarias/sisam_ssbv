-- Migration: Campos do Censo INEP para tabela escolas
-- Data: 2026-03-18
-- Descrição: Adiciona campos exigidos pelo Censo Escolar INEP (identificação, infraestrutura, localização)

BEGIN;

-- ============================================
-- IDENTIFICAÇÃO
-- ============================================
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS codigo_inep VARCHAR(8);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS situacao_funcionamento VARCHAR(20) DEFAULT 'ativa'
    CHECK (situacao_funcionamento IN ('ativa', 'paralisada', 'extinta'));
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS dependencia_administrativa VARCHAR(20) DEFAULT 'municipal'
    CHECK (dependencia_administrativa IN ('municipal', 'estadual', 'federal', 'privada'));
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS categoria_escola VARCHAR(30) DEFAULT 'nao_se_aplica';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS localizacao VARCHAR(10) DEFAULT 'urbana'
    CHECK (localizacao IN ('urbana', 'rural'));
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS localizacao_diferenciada VARCHAR(30) DEFAULT 'nenhuma'
    CHECK (localizacao_diferenciada IN ('area_assentamento', 'terra_indigena', 'remanescente_quilombos', 'nenhuma'));
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS tipo_atendimento_escolarizacao VARCHAR(20) DEFAULT 'presencial';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS etapas_ensino TEXT[] DEFAULT '{}';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS modalidade_ensino VARCHAR(20) DEFAULT 'regular'
    CHECK (modalidade_ensino IN ('regular', 'especial', 'eja'));

-- ============================================
-- INFRAESTRUTURA (todos BOOLEAN DEFAULT false)
-- ============================================
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS agua_potavel BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS energia_eletrica BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS esgoto_sanitario BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS coleta_lixo BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS internet BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS banda_larga BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS quadra_esportiva BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS biblioteca BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS laboratorio_informatica BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS laboratorio_ciencias BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS acessibilidade_deficiente BOOLEAN DEFAULT false;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS alimentacao_escolar BOOLEAN DEFAULT false;

-- ============================================
-- LOCALIZAÇÃO
-- ============================================
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS municipio VARCHAR(100) DEFAULT 'Sao Sebastiao da Boa Vista';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS uf VARCHAR(2) DEFAULT 'PA';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS distrito VARCHAR(100);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS complemento TEXT;

-- ============================================
-- OUTROS
-- ============================================
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS telefone_ddd VARCHAR(3);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS telefone_numero VARCHAR(15);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS cnpj_mantenedora VARCHAR(18);
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS data_criacao DATE;

-- ============================================
-- ÍNDICES
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_escolas_codigo_inep
    ON escolas(codigo_inep) WHERE codigo_inep IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escolas_localizacao
    ON escolas(localizacao);

CREATE INDEX IF NOT EXISTS idx_escolas_situacao_funcionamento
    ON escolas(situacao_funcionamento);

COMMIT;
