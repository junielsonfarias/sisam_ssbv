-- ============================================================================
-- MIGRATION: PDDE - Programa Dinheiro Direto na Escola (Fase 3 - basico)
-- Base legal: Resolucao FNDE 06/2012
-- ============================================================================

-- Tipos de verba PDDE (basicas e adicionais)
BEGIN;

CREATE TABLE IF NOT EXISTS pdde_tipos_verba (
  id              VARCHAR(30) PRIMARY KEY,
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT,
  -- Categorias FNDE
  natureza        VARCHAR(20) NOT NULL CHECK (natureza IN ('custeio', 'capital'))
);

INSERT INTO pdde_tipos_verba (id, nome, descricao, natureza) VALUES
  ('PDDE_BASICO',         'PDDE Basico',                 'Recurso anual para manutencao e melhorias', 'custeio'),
  ('PDDE_EDUCACAO_BASICA','PDDE Educacao Basica',        'Acoes pedagogicas e administrativas',       'custeio'),
  ('PDDE_QUALIDADE',      'PDDE Qualidade',              'Programas de melhoria de qualidade',        'custeio'),
  ('PDDE_ESTRUTURA',      'PDDE Estrutura',              'Reformas e adequacoes predias',             'capital'),
  ('PDDE_INTEGRAL',       'PDDE Mais Educacao',          'Atividades complementares',                 'custeio'),
  ('PDDE_PAR',            'PAR (Plano de Acoes Articuladas)', 'Recursos PAR',                         'custeio'),
  ('OUTRO',               'Outro recurso',               'Verba nao classificada acima',              'custeio')
ON CONFLICT (id) DO NOTHING;

-- Orcamentos recebidos pela escola
CREATE TABLE IF NOT EXISTS pdde_orcamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  ano_letivo      VARCHAR(4) NOT NULL,
  tipo_verba_id   VARCHAR(30) NOT NULL REFERENCES pdde_tipos_verba(id),
  valor_recebido  NUMERIC(12,2) NOT NULL CHECK (valor_recebido >= 0),
  data_credito    DATE NOT NULL,
  conta_bancaria  VARCHAR(50),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdde_orc_escola ON pdde_orcamentos(escola_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_pdde_orc_tipo ON pdde_orcamentos(tipo_verba_id);

-- Despesas executadas
CREATE TABLE IF NOT EXISTS pdde_despesas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id    UUID NOT NULL REFERENCES pdde_orcamentos(id) ON DELETE CASCADE,
  data_despesa    DATE NOT NULL,
  descricao       VARCHAR(500) NOT NULL,
  fornecedor      VARCHAR(255),
  fornecedor_cnpj VARCHAR(20),
  valor           NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  -- Categoria do item (referencia tabela elementos despesa FNDE)
  categoria       VARCHAR(50),
  -- Documento fiscal
  numero_nota     VARCHAR(50),
  data_nota       DATE,
  nota_url        VARCHAR(500),  -- upload posterior
  -- Forma de pagamento
  forma_pagamento VARCHAR(30) CHECK (forma_pagamento IN (
    'transferencia', 'cheque', 'cartao_debito', 'cartao_credito', 'pix', 'boleto'
  )),
  status          VARCHAR(20) NOT NULL DEFAULT 'registrada'
    CHECK (status IN ('registrada', 'paga', 'cancelada')),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdde_desp_orc ON pdde_despesas(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_pdde_desp_data ON pdde_despesas(data_despesa DESC);

-- View de saldos por orcamento
CREATE OR REPLACE VIEW pdde_saldos AS
SELECT
  o.id AS orcamento_id,
  o.escola_id,
  o.ano_letivo,
  o.tipo_verba_id,
  tv.nome AS verba_nome,
  tv.natureza,
  o.valor_recebido,
  COALESCE(SUM(CASE WHEN d.status != 'cancelada' THEN d.valor ELSE 0 END), 0) AS valor_executado,
  o.valor_recebido - COALESCE(SUM(CASE WHEN d.status != 'cancelada' THEN d.valor ELSE 0 END), 0) AS saldo_atual
FROM pdde_orcamentos o
INNER JOIN pdde_tipos_verba tv ON tv.id = o.tipo_verba_id
LEFT JOIN pdde_despesas d ON d.orcamento_id = o.id
GROUP BY o.id, o.escola_id, o.ano_letivo, o.tipo_verba_id, tv.nome, tv.natureza, o.valor_recebido;

COMMENT ON TABLE pdde_orcamentos IS 'Verbas PDDE recebidas pela escola.';
COMMENT ON TABLE pdde_despesas IS 'Despesas executadas com recursos PDDE.';
COMMENT ON VIEW pdde_saldos IS 'Saldo atualizado por orcamento (recebido - executado).';

COMMIT;
