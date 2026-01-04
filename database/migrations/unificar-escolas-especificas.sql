-- ============================================
-- UNIFICAR ESCOLAS ESPECÍFICAS
-- ============================================
-- Este script unifica os seguintes pares de escolas:
-- 1. EMEF VER. ENGRÁCIO e EMEF VER. ENGRÁCIO P. DA SILVA
-- 2. EMEF NOSSA SRA DE LOURDES e EMEIF NSA SRA DE LOURDES
-- 3. EMEIF MANOEL R. PINHEIRO e EMEF MANOEL RAIMUNDO PINHEIRO
--
-- Para cada par, mantém a escola mais antiga e migra todos os dados

DO $$
DECLARE
  escola_principal RECORD;
  escola_duplicada RECORD;
  total_migrados INTEGER := 0;
  escolas_unificadas INTEGER := 0;
  grupos_escolas TEXT[][] := ARRAY[
    -- Par 1: EMEF VER. ENGRÁCIO
    ARRAY['EMEF VER. ENGRÁCIO', 'EMEF VER. ENGRÁCIO P. DA SILVA'],
    -- Par 2: EMEF NOSSA SRA DE LOURDES
    ARRAY['EMEF NOSSA SRA DE LOURDES', 'EMEIF NSA SRA DE LOURDES'],
    -- Par 3: EMEIF MANOEL R. PINHEIRO
    ARRAY['EMEIF MANOEL R. PINHEIRO', 'EMEF MANOEL RAIMUNDO PINHEIRO']
  ];
  par TEXT[];
  nome_principal TEXT;
  nome_duplicada TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'UNIFICANDO ESCOLAS ESPECÍFICAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Processar cada par de escolas
  FOREACH par SLICE 1 IN ARRAY grupos_escolas
  LOOP
    nome_principal := par[1];
    nome_duplicada := par[2];

    RAISE NOTICE 'Processando par:';
    RAISE NOTICE '  Principal: "%"', nome_principal;
    RAISE NOTICE '  Duplicada: "%"', nome_duplicada;
    RAISE NOTICE '';

    -- Buscar escola principal (mais antiga ou a primeira especificada)
    SELECT id, nome, codigo, criado_em INTO escola_principal
    FROM escolas
    WHERE UPPER(TRIM(nome)) = UPPER(TRIM(nome_principal))
      AND ativo = true
    ORDER BY criado_em ASC
    LIMIT 1;

    -- Se não encontrar pela primeira, tentar pela segunda (pode ser que a ordem esteja invertida)
    IF escola_principal.id IS NULL THEN
      SELECT id, nome, codigo, criado_em INTO escola_principal
      FROM escolas
      WHERE UPPER(TRIM(nome)) = UPPER(TRIM(nome_duplicada))
        AND ativo = true
      ORDER BY criado_em ASC
      LIMIT 1;
      
      -- Se encontrou, trocar as variáveis
      IF escola_principal.id IS NOT NULL THEN
        nome_duplicada := nome_principal;
        nome_principal := par[2];
      END IF;
    END IF;

    IF escola_principal.id IS NULL THEN
      RAISE WARNING '❌ Escola principal não encontrada: "%"', nome_principal;
      RAISE NOTICE '';
      CONTINUE;
    END IF;

    RAISE NOTICE '✅ Escola principal encontrada:';
    RAISE NOTICE '   ID: %', escola_principal.id;
    RAISE NOTICE '   Nome: "%"', escola_principal.nome;
    RAISE NOTICE '   Código: %', escola_principal.codigo;
    RAISE NOTICE '   Criado em: %', escola_principal.criado_em;

    -- Buscar escola duplicada
    SELECT id, nome, codigo, criado_em INTO escola_duplicada
    FROM escolas
    WHERE UPPER(TRIM(nome)) = UPPER(TRIM(nome_duplicada))
      AND id != escola_principal.id
      AND ativo = true
    LIMIT 1;

    IF escola_duplicada.id IS NULL THEN
      RAISE WARNING '⚠️ Escola duplicada não encontrada ou já unificada: "%"', nome_duplicada;
      RAISE NOTICE '';
      CONTINUE;
    END IF;

    RAISE NOTICE '❌ Escola duplicada encontrada:';
    RAISE NOTICE '   ID: %', escola_duplicada.id;
    RAISE NOTICE '   Nome: "%"', escola_duplicada.nome;
    RAISE NOTICE '   Código: %', escola_duplicada.codigo;
    RAISE NOTICE '   Criado em: %', escola_duplicada.criado_em;
    RAISE NOTICE '';

    -- Iniciar transação para esta escola
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

      -- 6. Desativar escola duplicada (não deletar para manter histórico)
      UPDATE escolas
      SET ativo = false,
          atualizado_em = CURRENT_TIMESTAMP,
          codigo = codigo || '_UNIFICADA_' || EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = escola_duplicada.id;

      escolas_unificadas := escolas_unificadas + 1;

      RAISE NOTICE '  ✅ Escola "%" unificada com sucesso!', escola_duplicada.nome;
      RAISE NOTICE '';

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '  ❌ Erro ao unificar escola %: %', escola_duplicada.id, SQLERRM;
      RAISE NOTICE '';
      -- Continuar com próximo par
    END;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'UNIFICAÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de escolas unificadas: %', escolas_unificadas;
  RAISE NOTICE '';
END $$;

-- ============================================
-- VERIFICAÇÃO: Confirmar que as escolas foram unificadas
-- ============================================
SELECT 
  'Escola Principal' as tipo,
  id,
  nome,
  codigo,
  ativo,
  criado_em
FROM escolas
WHERE UPPER(TRIM(nome)) IN (
  'EMEF VER. ENGRÁCIO',
  'EMEF VER. ENGRÁCIO P. DA SILVA',
  'EMEF NOSSA SRA DE LOURDES',
  'EMEIF NSA SRA DE LOURDES',
  'EMEIF MANOEL R. PINHEIRO',
  'EMEF MANOEL RAIMUNDO PINHEIRO'
)
ORDER BY nome;

