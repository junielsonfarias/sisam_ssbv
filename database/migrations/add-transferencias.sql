-- ============================================
-- MIGRACAO: Gestão de Transferências
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- Adiciona campos de rastreamento de transferência ao historico_situacao:
-- tipo de transferência (dentro/fora do município), escola destino/origem,
-- e tipo de movimentação (saída/entrada).
--
-- IMPACTO:
-- - Novos campos nullable em historico_situacao (compatível com dados existentes)
-- - Novos índices para queries do painel de transferências
-- ============================================

-- ============================================
-- ETAPA 1: Adicionar campos de transferência
-- ============================================

ALTER TABLE historico_situacao ADD COLUMN IF NOT EXISTS tipo_transferencia VARCHAR(20)
  CHECK (tipo_transferencia IN ('dentro_municipio', 'fora_municipio'));

ALTER TABLE historico_situacao ADD COLUMN IF NOT EXISTS escola_destino_id UUID REFERENCES escolas(id);
ALTER TABLE historico_situacao ADD COLUMN IF NOT EXISTS escola_destino_nome VARCHAR(255);

ALTER TABLE historico_situacao ADD COLUMN IF NOT EXISTS escola_origem_id UUID REFERENCES escolas(id);
ALTER TABLE historico_situacao ADD COLUMN IF NOT EXISTS escola_origem_nome VARCHAR(255);

ALTER TABLE historico_situacao ADD COLUMN IF NOT EXISTS tipo_movimentacao VARCHAR(20)
  CHECK (tipo_movimentacao IN ('saida', 'entrada'));

-- ============================================
-- ETAPA 2: Índices para painel de transferências
-- ============================================

CREATE INDEX IF NOT EXISTS idx_hist_sit_tipo_mov ON historico_situacao(tipo_movimentacao);
CREATE INDEX IF NOT EXISTS idx_hist_sit_tipo_transf ON historico_situacao(tipo_transferencia);
CREATE INDEX IF NOT EXISTS idx_hist_sit_escola_destino ON historico_situacao(escola_destino_id);
CREATE INDEX IF NOT EXISTS idx_hist_sit_escola_origem ON historico_situacao(escola_origem_id);

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'historico_situacao'
      AND column_name IN ('tipo_transferencia', 'escola_destino_id', 'escola_destino_nome',
                          'escola_origem_id', 'escola_origem_nome', 'tipo_movimentacao');

    RAISE NOTICE '=== MIGRACAO TRANSFERENCIAS CONCLUIDA ===';
    RAISE NOTICE 'Novas colunas encontradas: % (esperado: 6)', col_count;
END $$;
