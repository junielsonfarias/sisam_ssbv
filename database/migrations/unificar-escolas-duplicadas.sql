-- ============================================
-- MIGRAÇÃO: Unificar Escolas Duplicadas
-- ============================================
-- Este script identifica e unifica escolas com nomes similares
-- que foram cadastradas com pequenas variações (pontos, espaços, etc.)
--
-- IMPORTANTE: Execute este script em etapas:
-- 1. Primeiro execute apenas a seção de ANÁLISE para ver quais escolas serão unificadas
-- 2. Revise os resultados
-- 3. Depois execute a seção de UNIFICAÇÃO

-- ============================================
-- FUNÇÃO AUXILIAR: Normalizar nome de escola
-- ============================================
CREATE OR REPLACE FUNCTION normalizar_nome_escola(nome VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN UPPER(TRIM(
    -- Remover pontos
    REGEXP_REPLACE(
      -- Remover múltiplos espaços
      REGEXP_REPLACE(nome, '\s+', ' ', 'g'),
      '\.', '', 'g'
    )
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- ETAPA 1: ANÁLISE - Identificar escolas duplicadas
-- ============================================
-- Execute esta query primeiro para ver quais escolas serão unificadas
-- 
-- Esta query agrupa escolas por nome normalizado e mostra:
-- - Quantas escolas em cada grupo
-- - Detalhes de cada escola (ID, nome, código, dados relacionados)
-- - Qual será mantida (mais antiga) e quais serão unificadas

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

-- ============================================
-- ETAPA 2: UNIFICAÇÃO - Unificar escolas duplicadas
-- ============================================
-- ATENÇÃO: Execute esta seção apenas após revisar a análise acima!
-- Esta seção irá:
-- 1. Identificar escolas duplicadas
-- 2. Manter a escola mais antiga de cada grupo
-- 3. Migrar todos os dados relacionados para a escola principal
-- 4. Atualizar referências em todas as tabelas relacionadas
-- 5. Desativar (não deletar) as escolas duplicadas

DO $$
DECLARE
  grupo_normalizado RECORD;
  escola_principal RECORD;
  escola_duplicada RECORD;
  total_migrados INTEGER := 0;
  escolas_unificadas INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INICIANDO UNIFICAÇÃO DE ESCOLAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Para cada grupo de escolas duplicadas
  FOR grupo_normalizado IN
    SELECT 
      normalizar_nome_escola(nome) as nome_normalizado,
      MIN(criado_em) as primeira_criacao
    FROM escolas
    GROUP BY normalizar_nome_escola(nome)
    HAVING COUNT(*) > 1
  LOOP
    -- Encontrar a escola principal (mais antiga)
    SELECT id, nome, codigo INTO escola_principal
    FROM escolas
    WHERE normalizar_nome_escola(nome) = grupo_normalizado.nome_normalizado
      AND criado_em = grupo_normalizado.primeira_criacao
    ORDER BY criado_em ASC
    LIMIT 1;
    
    RAISE NOTICE 'Processando grupo: "%"', grupo_normalizado.nome_normalizado;
    RAISE NOTICE 'Escola principal (mantida): ID=% | Nome="%"', escola_principal.id, escola_principal.nome;
    
    -- Processar cada escola duplicada no grupo
    FOR escola_duplicada IN
      SELECT id, nome, codigo
      FROM escolas
      WHERE normalizar_nome_escola(nome) = grupo_normalizado.nome_normalizado
        AND id != escola_principal.id
        AND ativo = true
    LOOP
      RAISE NOTICE '  Unificando: ID=% | Nome="%"', escola_duplicada.id, escola_duplicada.nome;
      
      -- Iniciar transação para esta escola
      BEGIN
        -- 1. Atualizar turmas
        UPDATE turmas
        SET escola_id = escola_principal.id,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE escola_id = escola_duplicada.id;
        
        GET DIAGNOSTICS total_migrados = ROW_COUNT;
        RAISE NOTICE '    - Turmas migradas: %', total_migrados;
        
        -- 2. Atualizar alunos
        UPDATE alunos
        SET escola_id = escola_principal.id,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE escola_id = escola_duplicada.id;
        
        GET DIAGNOSTICS total_migrados = ROW_COUNT;
        RAISE NOTICE '    - Alunos migrados: %', total_migrados;
        
        -- 3. Atualizar resultados_consolidados
        UPDATE resultados_consolidados
        SET escola_id = escola_principal.id,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE escola_id = escola_duplicada.id;
        
        GET DIAGNOSTICS total_migrados = ROW_COUNT;
        RAISE NOTICE '    - Resultados consolidados migrados: %', total_migrados;
        
        -- 4. Atualizar resultados_provas
        UPDATE resultados_provas
        SET escola_id = escola_principal.id,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE escola_id = escola_duplicada.id;
        
        GET DIAGNOSTICS total_migrados = ROW_COUNT;
        RAISE NOTICE '    - Resultados de provas migrados: %', total_migrados;
        
        -- 5. Atualizar usuarios (se houver)
        UPDATE usuarios
        SET escola_id = escola_principal.id,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE escola_id = escola_duplicada.id;
        
        GET DIAGNOSTICS total_migrados = ROW_COUNT;
        IF total_migrados > 0 THEN
          RAISE NOTICE '    - Usuários migrados: %', total_migrados;
        END IF;
        
        -- 6. Desativar escola duplicada (não deletar para manter histórico)
        UPDATE escolas
        SET ativo = false,
            atualizado_em = CURRENT_TIMESTAMP,
            codigo = codigo || '_UNIFICADA_' || EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE id = escola_duplicada.id;
        
        escolas_unificadas := escolas_unificadas + 1;
        
        RAISE NOTICE '    ✅ Escola unificada com sucesso';
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '    ❌ Erro ao unificar escola %: %', escola_duplicada.id, SQLERRM;
        -- Continuar com próxima escola
      END;
    END LOOP;
    
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'UNIFICAÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de escolas unificadas: %', escolas_unificadas;
  RAISE NOTICE '';
END $$;

-- ============================================
-- ETAPA 3: VERIFICAÇÃO - Verificar resultado
-- ============================================
-- Execute esta query para verificar quantas escolas duplicadas ainda existem

SELECT 
  normalizar_nome_escola(nome) as nome_normalizado,
  COUNT(*) as total_escolas,
  STRING_AGG(DISTINCT nome, ' | ') as nomes
FROM escolas
WHERE ativo = true
GROUP BY normalizar_nome_escola(nome)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Limpar função temporária (opcional - pode manter para uso futuro)
-- DROP FUNCTION IF EXISTS normalizar_nome_escola(VARCHAR);

