-- ============================================
-- ETAPA 2: ANÁLISE - Identificar escolas duplicadas
-- ============================================
-- Execute esta parte para ver quais escolas serão unificadas
-- Revise os resultados antes de executar a unificação

DO $$
DECLARE
  grupos_duplicados RECORD;
  escola_detalhes RECORD;
  total_alunos INTEGER;
  total_turmas INTEGER;
  total_resultados INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ANÁLISE DE ESCOLAS DUPLICADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Criar tabela temporária para análise
  CREATE TEMP TABLE IF NOT EXISTS escolas_normalizadas AS
  SELECT 
    id,
    nome,
    codigo,
    polo_id,
    criado_em,
    normalizar_nome_escola(nome) as nome_normalizado
  FROM escolas;
  
  -- Criar índice para performance
  CREATE INDEX IF NOT EXISTS idx_temp_nome_normalizado ON escolas_normalizadas(nome_normalizado);
  
  RAISE NOTICE 'Grupos de escolas duplicadas encontrados:';
  RAISE NOTICE '';
  
  -- Iterar sobre grupos com mais de uma escola
  FOR grupos_duplicados IN
    SELECT 
      nome_normalizado,
      COUNT(*) as total_escolas,
      MIN(criado_em) as primeira_criacao
    FROM escolas_normalizadas
    GROUP BY nome_normalizado
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, nome_normalizado
  LOOP
    RAISE NOTICE '🔸 Nome Normalizado: "%"', grupos_duplicados.nome_normalizado;
    RAISE NOTICE '   Total de escolas no grupo: %', grupos_duplicados.total_escolas;
    RAISE NOTICE '';
    
    -- Mostrar detalhes de cada escola no grupo
    FOR escola_detalhes IN
      SELECT 
        e.id,
        e.nome,
        e.codigo,
        e.criado_em,
        CASE WHEN e.criado_em = grupos_duplicados.primeira_criacao 
          THEN '✅ (PRINCIPAL - será mantida)'
          ELSE '❌ (será unificada)'
        END as status
      FROM escolas e
      WHERE normalizar_nome_escola(e.nome) = grupos_duplicados.nome_normalizado
      ORDER BY e.criado_em ASC
    LOOP
      -- Contar dados relacionados
      SELECT COUNT(*) INTO total_alunos FROM alunos WHERE escola_id = escola_detalhes.id;
      SELECT COUNT(*) INTO total_turmas FROM turmas WHERE escola_id = escola_detalhes.id;
      SELECT COUNT(*) INTO total_resultados FROM resultados_consolidados WHERE escola_id = escola_detalhes.id;
      
      RAISE NOTICE '   %', escola_detalhes.status;
      RAISE NOTICE '   ID: %', escola_detalhes.id;
      RAISE NOTICE '   Nome: "%"', escola_detalhes.nome;
      RAISE NOTICE '   Código: %', escola_detalhes.codigo;
      RAISE NOTICE '   Criado em: %', escola_detalhes.criado_em;
      RAISE NOTICE '   Alunos: % | Turmas: % | Resultados: %', total_alunos, total_turmas, total_resultados;
      RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '';
  END LOOP;
  
  DROP TABLE IF EXISTS escolas_normalizadas;
END $$;

