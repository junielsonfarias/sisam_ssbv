-- ============================================
-- UNIFICAR ESCOLAS: EMEF VER. ENGRÁCIO
-- ============================================
-- Este script unifica:
-- - EMEF VER. ENGRÁCIO P. DA SILVA
-- - EMEF VER. ENGRÁCIO
--
-- Mantém a escola mais antiga e migra todos os dados
-- Após a unificação, exclui a escola duplicada

DO $$
DECLARE
  escola_principal RECORD;
  escola_duplicada RECORD;
  total_migrados INTEGER := 0;
  escola_excluida BOOLEAN := false;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'UNIFICANDO ESCOLAS: EMEF VER. ENGRÁCIO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Buscar ambas as escolas
  SELECT id, nome, codigo, criado_em INTO escola_principal
  FROM escolas
  WHERE UPPER(TRIM(nome)) = UPPER(TRIM('EMEF VER. ENGRÁCIO'))
    AND ativo = true
  ORDER BY criado_em ASC
  LIMIT 1;

  SELECT id, nome, codigo, criado_em INTO escola_duplicada
  FROM escolas
  WHERE UPPER(TRIM(nome)) = UPPER(TRIM('EMEF VER. ENGRÁCIO P. DA SILVA'))
    AND ativo = true
  LIMIT 1;

  -- Se não encontrou na ordem esperada, tentar inverter
  IF escola_principal.id IS NULL AND escola_duplicada.id IS NOT NULL THEN
    -- A escola com nome mais longo pode ser a mais antiga
    SELECT id, nome, codigo, criado_em INTO escola_principal
    FROM escolas
    WHERE UPPER(TRIM(nome)) = UPPER(TRIM('EMEF VER. ENGRÁCIO P. DA SILVA'))
      AND ativo = true
    ORDER BY criado_em ASC
    LIMIT 1;

    SELECT id, nome, codigo, criado_em INTO escola_duplicada
    FROM escolas
    WHERE UPPER(TRIM(nome)) = UPPER(TRIM('EMEF VER. ENGRÁCIO'))
      AND id != escola_principal.id
      AND ativo = true
    LIMIT 1;
  END IF;

  -- Verificar se encontrou as escolas
  IF escola_principal.id IS NULL THEN
    RAISE WARNING '❌ Escola principal não encontrada: "EMEF VER. ENGRÁCIO"';
    RETURN;
  END IF;

  IF escola_duplicada.id IS NULL THEN
    RAISE WARNING '⚠️  Escola duplicada não encontrada: "EMEF VER. ENGRÁCIO P. DA SILVA"';
    RAISE NOTICE '   Possivelmente já foi unificada anteriormente.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Escola principal encontrada:';
  RAISE NOTICE '   ID: %', escola_principal.id;
  RAISE NOTICE '   Nome: "%"', escola_principal.nome;
  RAISE NOTICE '   Código: %', escola_principal.codigo;
  RAISE NOTICE '   Criado em: %', escola_principal.criado_em;
  RAISE NOTICE '';

  RAISE NOTICE '❌ Escola duplicada encontrada:';
  RAISE NOTICE '   ID: %', escola_duplicada.id;
  RAISE NOTICE '   Nome: "%"', escola_duplicada.nome;
  RAISE NOTICE '   Código: %', escola_duplicada.codigo;
  RAISE NOTICE '   Criado em: %', escola_duplicada.criado_em;
  RAISE NOTICE '';

  -- Iniciar transação
  BEGIN
    RAISE NOTICE '  Migrando dados...';

    -- 1. Atualizar turmas
    UPDATE turmas
    SET escola_id = escola_principal.id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE escola_id = escola_duplicada.id;

    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '    ✅ Turmas migradas: %', total_migrados;

    -- 2. Atualizar alunos
    UPDATE alunos
    SET escola_id = escola_principal.id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE escola_id = escola_duplicada.id;

    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '    ✅ Alunos migrados: %', total_migrados;

    -- 3. Atualizar resultados_consolidados
    UPDATE resultados_consolidados
    SET escola_id = escola_principal.id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE escola_id = escola_duplicada.id;

    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '    ✅ Resultados consolidados migrados: %', total_migrados;

    -- 4. Atualizar resultados_provas
    UPDATE resultados_provas
    SET escola_id = escola_principal.id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE escola_id = escola_duplicada.id;

    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    RAISE NOTICE '    ✅ Resultados de provas migrados: %', total_migrados;

    -- 5. Atualizar usuarios (se houver)
    UPDATE usuarios
    SET escola_id = escola_principal.id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE escola_id = escola_duplicada.id;

    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    IF total_migrados > 0 THEN
      RAISE NOTICE '    ✅ Usuários migrados: %', total_migrados;
    END IF;

    -- 6. Verificar se ainda há vínculos antes de excluir
    RAISE NOTICE '';
    RAISE NOTICE '  Verificando vínculos restantes...';
    
    SELECT COUNT(*) INTO total_migrados FROM alunos WHERE escola_id = escola_duplicada.id;
    IF total_migrados > 0 THEN
      RAISE WARNING '    ⚠️  Ainda há % alunos vinculados', total_migrados;
    END IF;

    SELECT COUNT(*) INTO total_migrados FROM turmas WHERE escola_id = escola_duplicada.id;
    IF total_migrados > 0 THEN
      RAISE WARNING '    ⚠️  Ainda há % turmas vinculadas', total_migrados;
    END IF;

    SELECT COUNT(*) INTO total_migrados FROM resultados_consolidados WHERE escola_id = escola_duplicada.id;
    IF total_migrados > 0 THEN
      RAISE WARNING '    ⚠️  Ainda há % resultados consolidados vinculados', total_migrados;
    END IF;

    SELECT COUNT(*) INTO total_migrados FROM resultados_provas WHERE escola_id = escola_duplicada.id;
    IF total_migrados > 0 THEN
      RAISE WARNING '    ⚠️  Ainda há % resultados de provas vinculados', total_migrados;
    END IF;

    SELECT COUNT(*) INTO total_migrados FROM usuarios WHERE escola_id = escola_duplicada.id;
    IF total_migrados > 0 THEN
      RAISE WARNING '    ⚠️  Ainda há % usuários vinculados', total_migrados;
    END IF;

    -- 7. Excluir a escola duplicada
    RAISE NOTICE '';
    RAISE NOTICE '  Excluindo escola duplicada...';
    
    DELETE FROM escolas WHERE id = escola_duplicada.id;
    
    GET DIAGNOSTICS total_migrados = ROW_COUNT;
    IF total_migrados > 0 THEN
      escola_excluida := true;
      RAISE NOTICE '    ✅ Escola "%" excluída com sucesso!', escola_duplicada.nome;
    ELSE
      RAISE WARNING '    ⚠️  Não foi possível excluir a escola (pode ter vínculos restantes)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UNIFICAÇÃO CONCLUÍDA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Escola principal mantida: "%"', escola_principal.nome;
    IF escola_excluida THEN
      RAISE NOTICE '✅ Escola duplicada excluída: "%"', escola_duplicada.nome;
    ELSE
      RAISE NOTICE '⚠️  Escola duplicada NÃO foi excluída (verifique vínculos)';
    END IF;
    RAISE NOTICE '';

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Erro ao unificar escolas: %', SQLERRM;
    RAISE NOTICE '   A transação foi revertida. Nenhuma alteração foi aplicada.';
    RETURN;
  END;
END $$;

-- ============================================
-- VERIFICAÇÃO: Confirmar que a unificação foi concluída
-- ============================================
SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Unificação concluída - Apenas 1 escola encontrada'
    WHEN COUNT(*) = 0 THEN '⚠️  Nenhuma das escolas encontrada'
    ELSE '⚠️  Ainda existem ' || COUNT(*) || ' escolas - Verifique!'
  END as status,
  STRING_AGG(nome, ' | ') as escolas_encontradas
FROM escolas
WHERE UPPER(TRIM(nome)) IN (
  'EMEF VER. ENGRÁCIO',
  'EMEF VER. ENGRÁCIO P. DA SILVA'
)
AND ativo = true;

