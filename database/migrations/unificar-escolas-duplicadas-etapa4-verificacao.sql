-- ============================================
-- ETAPA 4: VERIFICAÇÃO - Verificar resultado
-- ============================================
-- Execute esta query para verificar se ainda existem escolas duplicadas

SELECT 
  normalizar_nome_escola(nome) as nome_normalizado,
  COUNT(*) as total_escolas,
  STRING_AGG(DISTINCT nome, ' | ') as nomes
FROM escolas
WHERE ativo = true
GROUP BY normalizar_nome_escola(nome)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Se não retornar nenhuma linha, significa que não há mais duplicatas! ✅

