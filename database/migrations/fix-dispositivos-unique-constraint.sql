-- ============================================
-- MIGRACAO: Constraint UNIQUE em dispositivos_faciais
-- Data: 2026-03-17
-- ============================================
-- CONTEXTO: Evitar race condition no auto-registro de terminais web.
-- Garante que não existam dois dispositivos com mesmo nome na mesma escola.
-- ============================================

-- Remover duplicatas se existirem (manter o mais recente)
DELETE FROM dispositivos_faciais a
USING dispositivos_faciais b
WHERE a.escola_id = b.escola_id
  AND a.nome = b.nome
  AND a.criado_em < b.criado_em;

-- Criar constraint UNIQUE
ALTER TABLE dispositivos_faciais
  DROP CONSTRAINT IF EXISTS dispositivos_faciais_escola_id_nome_key;

ALTER TABLE dispositivos_faciais
  ADD CONSTRAINT dispositivos_faciais_escola_id_nome_key UNIQUE(escola_id, nome);

-- VERIFICACAO
DO $$
BEGIN
    RAISE NOTICE '=== FIX: UNIQUE constraint (escola_id, nome) em dispositivos_faciais ===';
END $$;
