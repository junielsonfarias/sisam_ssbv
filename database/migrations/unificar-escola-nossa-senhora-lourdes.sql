-- ============================================
-- UNIFICAR ESCOLA NOSSA SENHORA DE LOURDES
-- ============================================
-- A escola "EMEF NOSSA SRA DE LOURDES" (código: EMEF_NOSSA_SRA_DE_LOURDES)
-- já existia no sistema com dados de 2025.
-- A migração de matrículas 2026 criou uma duplicata:
-- "EMEI F NOSSA SENHORA DE LOURDES" (código: 15560350)
--
-- Este script:
-- 1. Mantém a escola ORIGINAL como principal (preserva aluno_id de 2025)
-- 2. Migra turmas, alunos e resultados da duplicata para a principal
-- 3. Atualiza o código INEP e nome oficial
-- 4. Desativa a duplicata
-- ============================================

DO $$
DECLARE
  v_escola_principal_id UUID;
  v_escola_duplicada_id UUID;
  v_total INT;
  v_total_turmas INT;
  v_total_alunos INT;
  v_total_rc INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'UNIFICANDO: NOSSA SENHORA DE LOURDES';
  RAISE NOTICE '========================================';

  -- Buscar escola principal (a original, com dados de 2025)
  SELECT id INTO v_escola_principal_id
  FROM escolas
  WHERE UPPER(TRIM(nome)) LIKE '%NOSSA S%LOURDES%'
    AND codigo = 'EMEF_NOSSA_SRA_DE_LOURDES'
    AND ativo = true
  LIMIT 1;

  -- Buscar escola duplicada (criada pela migração 2026)
  SELECT id INTO v_escola_duplicada_id
  FROM escolas
  WHERE codigo = '15560350'
    AND ativo = true
  LIMIT 1;

  -- Validações
  IF v_escola_principal_id IS NULL THEN
    -- Tentar buscar por nome parcial
    SELECT id INTO v_escola_principal_id
    FROM escolas
    WHERE UPPER(TRIM(nome)) LIKE '%NOSSA S%LOURDES%'
      AND id != COALESCE(v_escola_duplicada_id, '00000000-0000-0000-0000-000000000000')
      AND ativo = true
    ORDER BY criado_em ASC
    LIMIT 1;
  END IF;

  IF v_escola_principal_id IS NULL THEN
    RAISE EXCEPTION 'Escola principal (EMEF NOSSA SRA DE LOURDES) não encontrada!';
  END IF;

  IF v_escola_duplicada_id IS NULL THEN
    RAISE NOTICE 'Escola duplicada (15560350) não encontrada. Pode já ter sido unificada.';
    RETURN;
  END IF;

  IF v_escola_principal_id = v_escola_duplicada_id THEN
    RAISE NOTICE 'São a mesma escola! Nada a fazer.';
    RETURN;
  END IF;

  RAISE NOTICE 'Escola principal ID: %', v_escola_principal_id;
  RAISE NOTICE 'Escola duplicada ID: %', v_escola_duplicada_id;

  -- ============================================
  -- ETAPA 1: Migrar turmas da duplicata
  -- Cuidado com UNIQUE(escola_id, codigo, ano_letivo)
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Migrando turmas ---';

  -- Verificar conflitos de turma (mesmo codigo + ano_letivo nas duas escolas)
  -- Se existir conflito, atualizar os alunos da turma duplicada para a turma principal
  FOR v_total IN
    SELECT 1 FROM turmas t_dup
    INNER JOIN turmas t_princ
      ON t_princ.escola_id = v_escola_principal_id
      AND t_princ.codigo = t_dup.codigo
      AND t_princ.ano_letivo = t_dup.ano_letivo
    WHERE t_dup.escola_id = v_escola_duplicada_id
  LOOP
    -- Para turmas que existem em ambas escolas,
    -- mover alunos da turma duplicada para a turma principal correspondente
    UPDATE alunos a
    SET turma_id = t_princ.id,
        escola_id = v_escola_principal_id,
        atualizado_em = CURRENT_TIMESTAMP
    FROM turmas t_dup
    INNER JOIN turmas t_princ
      ON t_princ.escola_id = v_escola_principal_id
      AND t_princ.codigo = t_dup.codigo
      AND t_princ.ano_letivo = t_dup.ano_letivo
    WHERE t_dup.escola_id = v_escola_duplicada_id
      AND a.turma_id = t_dup.id
      AND a.escola_id = v_escola_duplicada_id;

    EXIT; -- Executar apenas uma vez
  END LOOP;

  -- Mover resultados_consolidados vinculados a turmas da duplicada
  UPDATE resultados_consolidados rc
  SET turma_id = t_princ.id,
      escola_id = v_escola_principal_id,
      atualizado_em = CURRENT_TIMESTAMP
  FROM turmas t_dup
  INNER JOIN turmas t_princ
    ON t_princ.escola_id = v_escola_principal_id
    AND t_princ.codigo = t_dup.codigo
    AND t_princ.ano_letivo = t_dup.ano_letivo
  WHERE t_dup.escola_id = v_escola_duplicada_id
    AND rc.turma_id = t_dup.id
    AND rc.escola_id = v_escola_duplicada_id;

  -- Remover turmas duplicadas que já existem na principal
  DELETE FROM turmas t_dup
  USING turmas t_princ
  WHERE t_dup.escola_id = v_escola_duplicada_id
    AND t_princ.escola_id = v_escola_principal_id
    AND t_princ.codigo = t_dup.codigo
    AND t_princ.ano_letivo = t_dup.ano_letivo;

  -- Mover turmas restantes (que não existiam na principal)
  UPDATE turmas
  SET escola_id = v_escola_principal_id,
      atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_duplicada_id;

  GET DIAGNOSTICS v_total_turmas = ROW_COUNT;
  RAISE NOTICE 'Turmas migradas (novas): %', v_total_turmas;

  -- ============================================
  -- ETAPA 2: Migrar alunos restantes
  -- Cuidado com idx_alunos_nome_escola_ano_unique
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Migrando alunos ---';

  -- Para alunos que já existem na escola principal (mesmo nome + ano),
  -- atualizar o registro existente com dados novos da duplicata
  UPDATE alunos a_princ
  SET turma_id = COALESCE(a_dup.turma_id, a_princ.turma_id),
      serie = COALESCE(a_dup.serie, a_princ.serie),
      ano_letivo = COALESCE(a_dup.ano_letivo, a_princ.ano_letivo),
      data_nascimento = COALESCE(a_dup.data_nascimento, a_princ.data_nascimento),
      data_matricula = COALESCE(a_dup.data_matricula, a_princ.data_matricula),
      responsavel = COALESCE(a_dup.responsavel, a_princ.responsavel),
      telefone_responsavel = COALESCE(a_dup.telefone_responsavel, a_princ.telefone_responsavel),
      endereco = COALESCE(a_dup.endereco, a_princ.endereco),
      pcd = COALESCE(a_dup.pcd, a_princ.pcd),
      situacao = COALESCE(a_dup.situacao, a_princ.situacao),
      ativo = true,
      atualizado_em = CURRENT_TIMESTAMP
  FROM alunos a_dup
  WHERE a_dup.escola_id = v_escola_duplicada_id
    AND a_princ.escola_id = v_escola_principal_id
    AND UPPER(TRIM(a_dup.nome)) = UPPER(TRIM(a_princ.nome))
    AND a_dup.ano_letivo = a_princ.ano_letivo;

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RAISE NOTICE 'Alunos atualizados (já existiam): %', v_total;

  -- Migrar resultados_consolidados dos alunos duplicados para os alunos principais
  UPDATE resultados_consolidados rc
  SET aluno_id = a_princ.id,
      escola_id = v_escola_principal_id,
      turma_id = COALESCE(a_princ.turma_id, rc.turma_id),
      atualizado_em = CURRENT_TIMESTAMP
  FROM alunos a_dup
  INNER JOIN alunos a_princ
    ON a_princ.escola_id = v_escola_principal_id
    AND UPPER(TRIM(a_princ.nome)) = UPPER(TRIM(a_dup.nome))
    AND a_princ.ano_letivo = a_dup.ano_letivo
  WHERE a_dup.escola_id = v_escola_duplicada_id
    AND rc.aluno_id = a_dup.id
    AND NOT EXISTS (
      SELECT 1 FROM resultados_consolidados rc2
      WHERE rc2.aluno_id = a_princ.id AND rc2.avaliacao_id = rc.avaliacao_id
    );

  -- Deletar resultados órfãos da duplicata (conflitos)
  DELETE FROM resultados_consolidados
  WHERE escola_id = v_escola_duplicada_id;

  -- Deletar alunos duplicados que já foram mesclados
  DELETE FROM alunos a_dup
  USING alunos a_princ
  WHERE a_dup.escola_id = v_escola_duplicada_id
    AND a_princ.escola_id = v_escola_principal_id
    AND UPPER(TRIM(a_dup.nome)) = UPPER(TRIM(a_princ.nome));

  -- Mover alunos restantes (novos, que não existiam na principal)
  UPDATE alunos
  SET escola_id = v_escola_principal_id,
      atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_duplicada_id;

  GET DIAGNOSTICS v_total_alunos = ROW_COUNT;
  RAISE NOTICE 'Alunos migrados (novos): %', v_total_alunos;

  -- ============================================
  -- ETAPA 3: Migrar demais tabelas vinculadas
  -- ============================================
  UPDATE resultados_provas
  SET escola_id = v_escola_principal_id,
      atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_duplicada_id;

  UPDATE usuarios
  SET escola_id = v_escola_principal_id,
      atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_duplicada_id;

  -- Tabelas de reconhecimento facial (se houver)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispositivos_faciais') THEN
    UPDATE dispositivos_faciais
    SET escola_id = v_escola_principal_id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE escola_id = v_escola_duplicada_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'frequencia_diaria') THEN
    UPDATE frequencia_diaria
    SET escola_id = v_escola_principal_id
    WHERE escola_id = v_escola_duplicada_id;
  END IF;

  -- ============================================
  -- ETAPA 4: Desativar escola duplicada PRIMEIRO
  --          (liberar o código '15560350' para a principal)
  -- ============================================
  UPDATE escolas
  SET ativo = false,
      codigo = 'LOURDES_UNIFICADA_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
      atualizado_em = CURRENT_TIMESTAMP
  WHERE id = v_escola_duplicada_id;

  RAISE NOTICE '';
  RAISE NOTICE 'Escola duplicada desativada (código liberado).';

  -- ============================================
  -- ETAPA 5: Atualizar escola principal com dados corretos
  -- ============================================
  UPDATE escolas
  SET nome = 'EMEI F NOSSA SENHORA DE LOURDES',
      codigo = '15560350',
      endereco = 'Rua Cirino Gomes S/N - São Sebastião da Boa Vista - PA',
      atualizado_em = CURRENT_TIMESTAMP
  WHERE id = v_escola_principal_id;

  RAISE NOTICE '';
  RAISE NOTICE 'Escola principal atualizada:';
  RAISE NOTICE '  Nome: EMEI F NOSSA SENHORA DE LOURDES';
  RAISE NOTICE '  Código INEP: 15560350';

  -- ============================================
  -- VERIFICAÇÃO FINAL
  -- ============================================
  SELECT COUNT(*) INTO v_total_turmas
  FROM turmas WHERE escola_id = v_escola_principal_id AND ano_letivo = '2026';

  SELECT COUNT(*) INTO v_total_alunos
  FROM alunos WHERE escola_id = v_escola_principal_id AND ano_letivo = '2026';

  SELECT COUNT(*) INTO v_total_rc
  FROM resultados_consolidados WHERE escola_id = v_escola_principal_id AND ano_letivo = '2026';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'UNIFICAÇÃO CONCLUÍDA COM SUCESSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Escola ID: %', v_escola_principal_id;
  RAISE NOTICE 'Turmas 2026: %', v_total_turmas;
  RAISE NOTICE 'Alunos 2026: %', v_total_alunos;
  RAISE NOTICE 'Resultados consolidados 2026: %', v_total_rc;
  RAISE NOTICE '========================================';
END $$;
