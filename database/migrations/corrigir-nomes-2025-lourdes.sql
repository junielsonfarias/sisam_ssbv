-- ============================================
-- CORREÇÃO: Unificar nomes dos alunos 2025
-- com a grafia correta de 2026
-- Não remove nenhum registro, apenas corrige o nome
-- ============================================

DO $$
DECLARE
  v_escola_id UUID;
  v_total INT := 0;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = '15560350' AND ativo = true;

  -- 1. CINTIA → CINTTIA
  UPDATE alunos SET nome = 'CINTTIA WANESSA SENA DOS SANTOS', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'CINTIA WANESSA SENA DOS SANTOS';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: CINTIA → CINTTIA WANESSA SENA DOS SANTOS'; END IF;

  -- 2. SAMILY → SAMILLY
  UPDATE alunos SET nome = 'SAMILLY DE OLIVEIRA ALFAIA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'SAMILY DE OLIVEIRA ALFAIA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: SAMILY → SAMILLY DE OLIVEIRA ALFAIA'; END IF;

  -- 3. ARAUJO → ARAÚJO
  UPDATE alunos SET nome = 'EMILLY GABRIELE DE ARAÚJO DA SILVA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'EMILLY GABRIELE DE ARAUJO DA SILVA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: EMILLY GABRIELE DE ARAUJO → ARAÚJO DA SILVA'; END IF;

  -- 4. MONIQUE → MÔNIQUE
  UPDATE alunos SET nome = 'MÔNIQUE GABRIELI BARBOSA DA SILVA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'MONIQUE GABRIELI BARBOSA DA SILVA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: MONIQUE → MÔNIQUE GABRIELI BARBOSA DA SILVA'; END IF;

  -- 5. SERRAO → SERRÃO / ARAUJO → ARAÚJO
  UPDATE alunos SET nome = 'JHENNIFE THAIS DE ARAUJO SERRÃO', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'JHENNIFE THAIS DE ARAUJO SERRAO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: JHENNIFE THAIS DE ARAUJO SERRAO → SERRÃO'; END IF;

  -- 6. JOAO VITOR FREITAS DO NASCIMENTO → JOÃO VITOR DO NASCIMENTO FREITAS
  UPDATE alunos SET nome = 'JOÃO VITOR DO NASCIMENTO FREITAS', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'JOAO VITOR FREITAS DO NASCIMENTO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: JOAO VITOR FREITAS DO NASCIMENTO → JOÃO VITOR DO NASCIMENTO FREITAS'; END IF;

  -- 7. KAUE → KAUÊ
  UPDATE alunos SET nome = 'KAUÊ PEREIRA TAVARES', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'KAUE PEREIRA TAVARES';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: KAUE → KAUÊ PEREIRA TAVARES'; END IF;

  -- 8. VITORIA → VITÓRIA (Elisa)
  UPDATE alunos SET nome = 'ELISA VITÓRIA MARQUES ESTUMANO', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'ELISA VITORIA MARQUES ESTUMANO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: ELISA VITORIA → VITÓRIA MARQUES ESTUMANO'; END IF;

  -- 9. VITORIA → VITÓRIA (Jhullya)
  UPDATE alunos SET nome = 'JHULLYA VITÓRIA GUERREIRO FERREIRA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'JHULLYA VITORIA GUERREIRO FERREIRA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: JHULLYA VITORIA → VITÓRIA GUERREIRO FERREIRA'; END IF;

  -- 10. PROGENIO → PROGÊNIO
  UPDATE alunos SET nome = 'WILIAN RENAN DA SILVA PROGÊNIO', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'WILIAN RENAN DA SILVA PROGENIO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: WILIAN RENAN DA SILVA PROGENIO → PROGÊNIO'; END IF;

  -- 11. BELEM → BELÉM (Wennda)
  UPDATE alunos SET nome = 'WENNDA GABRYELA SOARES BELÉM', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'WENNDA GABRYELA SOARES BELEM';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: WENNDA GABRYELA SOARES BELEM → BELÉM'; END IF;

  -- 12. VITORIA → VITÓRIA (Maria)
  UPDATE alunos SET nome = 'MARIA VITÓRIA AMARAL TRINDADE', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'MARIA VITORIA AMARAL TRINDADE';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: MARIA VITORIA → VITÓRIA AMARAL TRINDADE'; END IF;

  -- 13. SAMILY → SÂMILY
  UPDATE alunos SET nome = 'SÂMILY SOFIA VEIGA FERREIRA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'SAMILY SOFIA VEIGA FERREIRA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: SAMILY → SÂMILY SOFIA VEIGA FERREIRA'; END IF;

  -- 14. GONCALVES → GONÇALVES (Gustavo)
  UPDATE alunos SET nome = 'GUSTAVO GONÇALVES DA SILVA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'GUSTAVO GONCALVES DA SILVA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: GUSTAVO GONCALVES → GONÇALVES DA SILVA'; END IF;

  -- 15. JOAO → JOÃO (Victor Reis)
  UPDATE alunos SET nome = 'JOÃO VICTOR REIS BARBOSA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'JOAO VICTOR REIS BARBOSA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: JOAO → JOÃO VICTOR REIS BARBOSA'; END IF;

  -- 16. GONCALVES → GONÇALVES (Walace)
  UPDATE alunos SET nome = 'WALACE GONÇALVES DE MELO', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'WALACE GONCALVES DE MELO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: WALACE GONCALVES → GONÇALVES DE MELO'; END IF;

  -- 17. SERRAO → SERRÃO (Beatriz)
  UPDATE alunos SET nome = 'BEATRIZ DA SILVA SERRÃO', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'BEATRIZ DA SILVA SERRAO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: BEATRIZ DA SILVA SERRAO → SERRÃO'; END IF;

  -- 18. GONCALVES → GONÇALVES (Diego)
  UPDATE alunos SET nome = 'DIEGO GONÇALVES DE MELO', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'DIEGO GONCALVES DE MELO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: DIEGO GONCALVES → GONÇALVES DE MELO'; END IF;

  -- 19. BELEM → BELÉM (Reandro)
  UPDATE alunos SET nome = 'REANDRO BELÉM TRINDADE', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'REANDRO BELEM TRINDADE';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: REANDRO BELEM → BELÉM TRINDADE'; END IF;

  -- 20. PAIXAO → PAIXÃO
  UPDATE alunos SET nome = 'GEANDRA VIEIRA PAIXÃO', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'GEANDRA VIEIRA PAIXAO';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: GEANDRA VIEIRA PAIXAO → PAIXÃO'; END IF;

  -- 21. LEAO → LEÃO
  UPDATE alunos SET nome = 'NAUANY LEÃO SILVA', atualizado_em = CURRENT_TIMESTAMP
  WHERE escola_id = v_escola_id AND ano_letivo = '2025'
    AND UPPER(TRIM(nome)) = 'NAUANY LEAO SILVA';
  GET DIAGNOSTICS v_total = ROW_COUNT;
  IF v_total > 0 THEN RAISE NOTICE 'Corrigido: NAUANY LEAO → LEÃO SILVA'; END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO DE NOMES CONCLUÍDA';
  RAISE NOTICE '========================================';
END $$;

-- Verificação: conferir se ainda existem matches fuzzy pendentes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT
  ROUND(similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome)))::numeric, 2) as sim,
  a25.nome as nome_2025,
  a26.nome as nome_2026,
  a25.serie as serie_25,
  a26.serie as serie_26
FROM alunos a25
CROSS JOIN alunos a26
WHERE a25.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a26.escola_id = a25.escola_id
  AND a25.ano_letivo = '2025'
  AND a26.ano_letivo = '2026'
  AND a25.id != a26.id
  AND similarity(UPPER(TRIM(a25.nome)), UPPER(TRIM(a26.nome))) > 0.70
  AND UPPER(TRIM(a25.nome)) != UPPER(TRIM(a26.nome))
ORDER BY sim DESC;
