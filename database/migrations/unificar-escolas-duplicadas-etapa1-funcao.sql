-- ============================================
-- ETAPA 1: Criar função auxiliar
-- ============================================
-- Execute esta parte primeiro
-- Esta função normaliza nomes de escolas para comparação

CREATE OR REPLACE FUNCTION normalizar_nome_escola(nome VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN UPPER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(nome, '\s+', ' ', 'g'),
      '\.', '', 'g'
    )
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

