-- ============================================
-- ETAPA 3: UNIFICAÇÃO - Unificar escolas duplicadas
-- ============================================
-- ATENÇÃO: Execute esta parte apenas após revisar a análise da ETAPA 2!
-- Esta parte irá:
-- 1. Manter a escola mais antiga de cada grupo
-- 2. Migrar todos os dados relacionados para a escola principal
-- 3. Desativar as escolas duplicadas (não deletar para manter histórico)

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

