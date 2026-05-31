-- ============================================================================
-- MIGRATION: Patrimonio - Inventario de bens (Fase 3 SEMED)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS patrimonio_bens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Numero de tombamento (etiqueta fisica)
  tombo           VARCHAR(30) UNIQUE NOT NULL,
  descricao       VARCHAR(500) NOT NULL,
  categoria       VARCHAR(50) NOT NULL CHECK (categoria IN (
    'mobiliario', 'eletronico', 'didatico', 'esportivo',
    'veiculo', 'imovel', 'equipamento_cozinha', 'eletrodomestico',
    'instrumento_musical', 'biblioteca', 'outro'
  )),
  marca           VARCHAR(100),
  modelo          VARCHAR(100),
  numero_serie    VARCHAR(100),
  valor_aquisicao NUMERIC(12,2),
  data_aquisicao  DATE,
  -- Origem (compra direta, doacao, transferencia entre orgaos)
  origem          VARCHAR(30) CHECK (origem IN ('compra', 'doacao', 'transferencia', 'cessao', 'outro')),
  documento_origem VARCHAR(255),  -- NF, termo de doacao
  -- Localizacao atual
  escola_id       UUID REFERENCES escolas(id) ON DELETE SET NULL,
  -- escola_id NULL = SEMED ou armazem central
  sala_localizacao VARCHAR(255),
  estado_conservacao VARCHAR(20) NOT NULL DEFAULT 'bom'
    CHECK (estado_conservacao IN ('novo', 'bom', 'regular', 'ruim', 'inservivel')),
  -- Status
  status          VARCHAR(20) NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'em_manutencao', 'extraviado', 'baixado')),
  observacoes     TEXT,
  -- Foto do bem (opcional)
  foto_url        VARCHAR(500),
  -- QR code é o proprio tombo (gerado em rota separada)
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patr_tombo ON patrimonio_bens(tombo);
CREATE INDEX IF NOT EXISTS idx_patr_escola ON patrimonio_bens(escola_id) WHERE escola_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patr_categoria ON patrimonio_bens(categoria);
CREATE INDEX IF NOT EXISTS idx_patr_status ON patrimonio_bens(status) WHERE status != 'ativo';

-- Movimentacoes (transferencias entre escolas, baixas)
CREATE TABLE IF NOT EXISTS patrimonio_movimentacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bem_id          UUID NOT NULL REFERENCES patrimonio_bens(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) NOT NULL CHECK (tipo IN (
    'transferencia', 'manutencao_envio', 'manutencao_retorno',
    'baixa', 'reativacao', 'mudanca_estado_conservacao'
  )),
  escola_origem_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
  escola_destino_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
  sala_origem     VARCHAR(255),
  sala_destino    VARCHAR(255),
  estado_anterior VARCHAR(20),
  estado_novo     VARCHAR(20),
  motivo          TEXT NOT NULL,
  -- Termo formal (PDF assinado, etc.)
  documento_url   VARCHAR(500),
  realizado_em    DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patr_mov_bem ON patrimonio_movimentacoes(bem_id, realizado_em DESC);

COMMENT ON TABLE patrimonio_bens IS 'Inventario de bens patrimoniais por escola/SEMED.';
COMMENT ON TABLE patrimonio_movimentacoes IS 'Historico de movimentacoes (transferencias, manutencao, baixa).';

COMMIT;
