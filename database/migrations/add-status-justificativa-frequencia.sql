-- ============================================
-- MIGRAÇÃO: Adicionar status e justificativa à frequência diária
-- Data: 2026-03-20
-- ============================================
-- Permite registrar faltas (status='ausente') e justificativas
-- para alunos que não realizaram presença facial/manual/qrcode.

ALTER TABLE frequencia_diaria
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'presente'
  CHECK (status IN ('presente', 'ausente'));

ALTER TABLE frequencia_diaria
  ADD COLUMN IF NOT EXISTS justificativa TEXT;

-- Índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_freq_diaria_status ON frequencia_diaria(status);

-- Verificação
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'frequencia_diaria' AND column_name = 'status') THEN
    RAISE NOTICE 'Coluna status adicionada com sucesso';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'frequencia_diaria' AND column_name = 'justificativa') THEN
    RAISE NOTICE 'Coluna justificativa adicionada com sucesso';
  END IF;
END $$;
