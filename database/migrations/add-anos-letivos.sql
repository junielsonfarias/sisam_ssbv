-- ============================================
-- MIGRACAO: Gestão de Anos Letivos
-- Data: 2026-03-14
-- ============================================

CREATE TABLE IF NOT EXISTS anos_letivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano VARCHAR(4) NOT NULL UNIQUE CHECK (ano ~ '^\d{4}$'),
  status VARCHAR(20) NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'ativo', 'finalizado')),
  data_inicio DATE,
  data_fim DATE,
  dias_letivos_total INTEGER DEFAULT 200,
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger de atualização
CREATE OR REPLACE FUNCTION atualizar_timestamp_anos_letivos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_anos_letivos ON anos_letivos;
CREATE TRIGGER trigger_atualizar_anos_letivos
  BEFORE UPDATE ON anos_letivos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_anos_letivos();

-- Adicionar dias_letivos nos periodos_letivos se não existir
ALTER TABLE periodos_letivos ADD COLUMN IF NOT EXISTS dias_letivos INTEGER DEFAULT 50;

-- Inserir anos existentes baseado nos dados atuais
INSERT INTO anos_letivos (ano, status)
SELECT DISTINCT ano_letivo, 'finalizado'
FROM periodos_letivos
WHERE ano_letivo IS NOT NULL AND ano_letivo ~ '^\d{4}$'
ON CONFLICT (ano) DO NOTHING;

-- Marcar ano atual como ativo
UPDATE anos_letivos SET status = 'ativo'
WHERE ano = EXTRACT(YEAR FROM CURRENT_DATE)::text
  AND status != 'ativo';

-- ============================================
-- VERIFICACAO FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Migração Anos Letivos concluída ===';
  RAISE NOTICE 'Tabela criada: anos_letivos';
  RAISE NOTICE 'Coluna adicionada: periodos_letivos.dias_letivos';
END $$;
