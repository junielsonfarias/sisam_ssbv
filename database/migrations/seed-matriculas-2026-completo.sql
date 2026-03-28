-- =============================================================================
-- MIGRAÇÃO COMPLETA: Matrículas 2026 - 16 Escolas - Educatec / SEMED SSBV
-- Gerado automaticamente em 2026-03-28
-- =============================================================================
-- Este script:
--   1. Cria o polo SSBV (se não existir)
--   2. Cria 5 novas escolas
--   3. Cria todas as turmas para 2026
--   4. Insere/atualiza alunos via função upsert com match por CPF ou nome+nascimento
--   5. Para N.S. Lourdes: complementa os 206 alunos já existentes no seed anterior
-- =============================================================================

BEGIN;

-- ============================================================
-- 1. POLO
-- ============================================================
INSERT INTO polos (nome, codigo, descricao)
VALUES (
  'São Sebastião da Boa Vista',
  'SSBV',
  'Polo de São Sebastião da Boa Vista - PA'
)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 2. FUNÇÃO UPSERT v2 (match por CPF ou nome+nascimento)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_upsert_aluno_2026_v2(
  p_nome TEXT,
  p_escola_id UUID,
  p_turma_id UUID,
  p_serie TEXT,
  p_data_nascimento DATE,
  p_cpf TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_aluno_id UUID;
  v_cpf_normalizado TEXT;
  v_nome_normalizado TEXT;
  v_resultado TEXT;
BEGIN
  v_nome_normalizado := UPPER(TRIM(p_nome));
  v_cpf_normalizado := NULLIF(REGEXP_REPLACE(COALESCE(p_cpf, ''), '[^0-9]', '', 'g'), '');

  -- 1) Tentar match por CPF (mais confiável)
  IF v_cpf_normalizado IS NOT NULL AND LENGTH(v_cpf_normalizado) = 11 THEN
    SELECT id INTO v_aluno_id
    FROM alunos
    WHERE cpf = v_cpf_normalizado
    LIMIT 1;
  END IF;

  -- 2) Se não achou por CPF, tentar nome + data_nascimento + escola
  IF v_aluno_id IS NULL THEN
    SELECT id INTO v_aluno_id
    FROM alunos
    WHERE escola_id = p_escola_id
      AND UPPER(TRIM(nome)) = v_nome_normalizado
      AND (p_data_nascimento IS NULL OR data_nascimento = p_data_nascimento OR data_nascimento IS NULL)
    ORDER BY
      CASE WHEN data_nascimento = p_data_nascimento THEN 0 ELSE 1 END,
      criado_em DESC
    LIMIT 1;
  END IF;

  -- 3) Fallback: nome + escola (qualquer ano, sem comparar nascimento)
  IF v_aluno_id IS NULL THEN
    SELECT id INTO v_aluno_id
    FROM alunos
    WHERE escola_id = p_escola_id
      AND UPPER(TRIM(nome)) = v_nome_normalizado
    ORDER BY criado_em DESC
    LIMIT 1;
  END IF;

  IF v_aluno_id IS NOT NULL THEN
    -- ATUALIZAR aluno existente para 2026
    UPDATE alunos SET
      turma_id = p_turma_id,
      serie = p_serie,
      ano_letivo = '2026',
      data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
      cpf = COALESCE(v_cpf_normalizado, cpf),
      situacao = 'cursando',
      ativo = true,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = v_aluno_id;
    v_resultado := 'ATUALIZADO';
  ELSE
    -- INSERIR novo aluno (com tratamento de duplicata)
    BEGIN
      INSERT INTO alunos (
        nome, escola_id, turma_id, serie, ano_letivo,
        data_nascimento, cpf, situacao, ativo, data_matricula
      ) VALUES (
        p_nome, p_escola_id, p_turma_id, p_serie, '2026',
        p_data_nascimento, v_cpf_normalizado, 'cursando', true, CURRENT_DATE
      );
      v_resultado := 'INSERIDO';
    EXCEPTION WHEN unique_violation THEN
      -- Aluno já existe (nome+escola+ano) - atualizar
      UPDATE alunos SET
        turma_id = p_turma_id,
        serie = p_serie,
        data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
        cpf = COALESCE(v_cpf_normalizado, cpf),
        situacao = 'cursando',
        ativo = true,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE escola_id = p_escola_id
        AND UPPER(TRIM(nome)) = v_nome_normalizado
        AND ano_letivo = '2026';
      v_resultado := 'ATUALIZADO (conflict)';
    END;
  END IF;

  RAISE NOTICE '[%] %', v_resultado, p_nome;
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. ESCOLAS NOVAS (5)
-- ============================================================
INSERT INTO escolas (nome, codigo, polo_id, codigo_inep)
VALUES (
  'EMEIF BELOS PRAZERES',
  'EMEIF_BELOS_PRAZERES',
  (SELECT id FROM polos WHERE codigo = 'SSBV' LIMIT 1),
  '15572242'
)
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO escolas (nome, codigo, polo_id, codigo_inep)
VALUES (
  'EMEIF LOURIVAL CAMARAO',
  'EMEIF_LOURIVAL_CAMARÃO',
  (SELECT id FROM polos WHERE codigo = 'SSBV' LIMIT 1),
  '15518930'
)
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO escolas (nome, codigo, polo_id, codigo_inep)
VALUES (
  'EMEIF OS INTELIGENTES',
  'EMEIF_OS_INTELIGENTES',
  (SELECT id FROM polos WHERE codigo = 'SSBV' LIMIT 1),
  '15028453'
)
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO escolas (nome, codigo, polo_id, codigo_inep)
VALUES (
  'EMEIF PORTO ALEGRE',
  'EMEIF_PORTO_ALEGRE',
  (SELECT id FROM polos WHERE codigo = 'SSBV' LIMIT 1),
  '15028097'
)
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO escolas (nome, codigo, polo_id, codigo_inep)
VALUES (
  'EMEIF SAO SEBASTIAO',
  'EMEIF_SÃO_SEBASTIÃO',
  (SELECT id FROM polos WHERE codigo = 'SSBV' LIMIT 1),
  '15028305'
)
ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome;

-- ============================================================
-- 1. EMEIF BELOS PRAZERES (codigo: EMEIF_BELOS_PRAZERES)
--    6 turmas, 60 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_BELOS_PRAZERES';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('FMM901', 'Multi-série - Manhã', v_escola_id, '1', '2026', 'matutino', 35, true),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35, false),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35, false),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35, false),
    ('ESPERANCA', 'Multi-série - Manhã', v_escola_id, 'PRE2', '2026', 'matutino', 35, true)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_fmm901 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f9t901 UUID;
  v_turma_esperanca UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_BELOS_PRAZERES';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_esperanca FROM turmas WHERE codigo = 'ESPERANCA' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('GABRIELLY COSTA NASCIMENTO', v_escola_id, v_turma_iump01, 'CRE', '2022-05-22', '10371297257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI RAMOS CORDEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2021-10-17', '10122066205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO FERNANDES CORDEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2022-03-09', '10569761280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOICE KELLY CORDEIRO FIGUEIREDO', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-29', '10575085274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELLY RAMOS CORDEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2022-02-11', '10648667278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIRIAM CORDEIRO E SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-04-27', '09782820270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JESSICA CORDEIRO FIQUEIREDO', v_escola_id, v_turma_iump01, 'PRE2', '2020-09-24', '10055791212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIANE CORDEIRO E CORDEIRO', v_escola_id, v_turma_iump01, 'PRE2', '2020-06-22', '10009919201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM901) - 22 alunos
  v_result := fn_upsert_aluno_2026_v2('ELIASAR CORDEIRO E SILVA', v_escola_id, v_turma_fmm901, '1', '2019-10-06', '08718064280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELMA CORDEIRO FIQUEIREDO', v_escola_id, v_turma_fmm901, '1', '2019-07-25', '08569396252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATHIAS CORDEIRO FREITAS', v_escola_id, v_turma_fmm901, '1', '2019-09-03', '09917682210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO ARTHUR RAMOS CORDEIRO', v_escola_id, v_turma_fmm901, '1', '2020-01-23', '09373095242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SOFHIA RAMOS CORDEIRO', v_escola_id, v_turma_fmm901, '1', '2019-08-15', '09299471266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALEXSANDRO RODRIGUES CATARINO', v_escola_id, v_turma_fmm901, '2', '2019-03-02', '08292618260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATAS CORDEIRO FIQUEIREDO', v_escola_id, v_turma_fmm901, '2', '2019-02-08', '08116162233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AGATHA SOPHIA SILVA DO NASCIMENTO', v_escola_id, v_turma_fmm901, '3', '2017-07-08', '08791420229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE DA SILVA RODRIGUES', v_escola_id, v_turma_fmm901, '3', '2017-11-30', '10600559297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANTHONY HENRIQUE CORDEIRO DA CONCEIÇÃO', v_escola_id, v_turma_fmm901, '3', '2018-03-13', '07216651286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIABER ABRAAO CORDEIRO DA SILVA', v_escola_id, v_turma_fmm901, '3', '2017-07-28', '09079582220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAIANE CORDEIRO CORDEIRO', v_escola_id, v_turma_fmm901, '3', '2018-01-03', '08237734262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCELO CORDEIRO E CORDEIRO', v_escola_id, v_turma_fmm901, '3', '2018-01-07', '07424675206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO PAULO RAMOS CORDEIRO', v_escola_id, v_turma_fmm901, '3', '2017-09-17', '07440980255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ERICK PATRICK CORDEIRO E SILVA', v_escola_id, v_turma_fmm901, '4', '2016-05-01', '09644034201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL CORDEIRO DE PAULA', v_escola_id, v_turma_fmm901, '4', '2016-12-10', '07417053203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BEATRIZ CORDEIRO DE PAULA', v_escola_id, v_turma_fmm901, '5', '2015-04-23', '09014293259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIAS CORDEIRO DA SILVA', v_escola_id, v_turma_fmm901, '5', '2015-09-07', '09079518212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GRASIELLY ALEXANDRE SOARES', v_escola_id, v_turma_fmm901, '5', '2015-12-02', '09116941292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELLY CORDEIRO E CORDEIRO', v_escola_id, v_turma_fmm901, '5', '2015-09-23', '08243116206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA CLARA CORDEIRO E CORDEIRO', v_escola_id, v_turma_fmm901, '5', '2016-01-29', '07424718290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VILMA DE SOUZA DA COSTA', v_escola_id, v_turma_fmm901, '5', '2015-05-14', '08910473282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('CARLIANE CORDEIRO SOUZA', v_escola_id, v_turma_f6t901, '6', '2013-06-21', '08974088290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DÉBORA FERNANDA SANTANA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-11-18', '08826800219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELANO CORDEIRO DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-04-21', '09079478245');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMERSON DOS ANJOS DOS SANTOS', v_escola_id, v_turma_f6t901, '6', '2014-12-19', '08063547209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVENNY LETICIA DA SILVA GOIS', v_escola_id, v_turma_f6t901, '6', '2014-06-16', '09011243200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAURO CORDEIRO SOUZA', v_escola_id, v_turma_f6t901, '6', '2011-03-08', '08974072297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MILENA CORDEIRO E CORDEIRO', v_escola_id, v_turma_f6t901, '6', '2014-04-20', '07424705202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MILENE DA SILVA RODRIGUÊS', v_escola_id, v_turma_f6t901, '6', '2002-07-03', '08154063204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 5 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA ALICE CORDEIRO DA SILVA', v_escola_id, v_turma_f7t901, '7', '2012-04-18', '06495936265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADSON DE JESUS CARDOSO DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-04-12', '10314061231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS CORDEIRO DA SILVA', v_escola_id, v_turma_f7t901, '7', '2010-12-25', '06495891229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO EDUARDO PALHETA LIMA', v_escola_id, v_turma_f7t901, '7', '2013-09-26', '09023659244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YNGRID VITÓRIA DOS SANTOS GOMES', v_escola_id, v_turma_f7t901, '7', '2014-12-21', '09116746244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('ESTER DOS SANTOS E SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-06-22', '08293463252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVENY SANTANA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-09-24', '08826792283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FÁBRICIO CORDEIRO DA SILVA', v_escola_id, v_turma_f9t901, '9', '2012-06-01', '08823469201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO CORDEIRO DE PAULA', v_escola_id, v_turma_f9t901, '9', '2011-10-19', '09014261217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAMILLY E SILVA DA CONCEIÇÃO', v_escola_id, v_turma_f9t901, '9', '2011-05-28', '08862250274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MILENA DA SILVA FREITAS', v_escola_id, v_turma_f9t901, '9', '2010-07-07', '08197939225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SANDRA OLIVEIRA CORDEIRO', v_escola_id, v_turma_f9t901, '9', '1993-01-09', '02449797238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TÁCIO CORDEIRO CORDEIRO', v_escola_id, v_turma_f9t901, '9', '2011-08-19', '09081110292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (ESPERANCA) - 9 alunos
  v_result := fn_upsert_aluno_2026_v2('HÍTALO MURILO PINHEIRO SILVA', v_escola_id, v_turma_esperanca, 'PRE2', '2021-07-12', '09850202297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO HENRIQUE SANTANA SILVA', v_escola_id, v_turma_esperanca, 'PRE2', '2001-07-11', '09836657290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SOFIA CORDEIRO DA SILVA', v_escola_id, v_turma_esperanca, '1', '2019-11-29', '10839891202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TALIA CORDEIRO SOUZA', v_escola_id, v_turma_esperanca, '1', '2020-02-10', '10835011275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ADRIANA CORDEIRO DA SILVA', v_escola_id, v_turma_esperanca, '2', '2017-10-27', '06495863284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISA BEATRIZ SANTANA SILVA', v_escola_id, v_turma_esperanca, '3', '2017-06-01', '08826806250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIANA CORDEIRO SOUZA', v_escola_id, v_turma_esperanca, '3', '2017-10-27', '08612778212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUIZ CORDEIRO DA SILVA', v_escola_id, v_turma_esperanca, '4', '2015-08-23', '06495922205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANOELA CORDEIRO SOUZA', v_escola_id, v_turma_esperanca, '5', '2015-04-13', '08974112264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF BELOS PRAZERES: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 2. EMEIF CASTANHAL (codigo: EMEIF_CASTANHAL)
--    7 turmas, 63 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_CASTANHAL';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('FMM901', 'Multi-série - Manhã', v_escola_id, '1', '2026', 'matutino', 35, true),
    ('F3M901', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35, false),
    ('FMM902', 'Multi-série - Manhã', v_escola_id, '4', '2026', 'matutino', 35, true),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35, false),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35, false),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_fmm901 UUID;
  v_turma_f3m901 UUID;
  v_turma_fmm902 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_CASTANHAL';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm902 FROM turmas WHERE codigo = 'FMM902' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('ALINE SOFIA AMARAL DAMASCENO', v_escola_id, v_turma_iump01, 'CRE', '2022-05-22', '10531065219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR FERREIRA PEREIRA', v_escola_id, v_turma_iump01, 'CRE', '2023-01-10', '10687698235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ITALO GABRIEL MACHADO ANDRADE', v_escola_id, v_turma_iump01, 'CRE', '2022-10-20', '10544014200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KALEBE DE MORAES MACIEL', v_escola_id, v_turma_iump01, 'CRE', '2022-06-11', '10373811225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LIVIA SOFIA BARBOSA MAIA', v_escola_id, v_turma_iump01, 'CRE', '2022-09-28', '10497911264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROMULO KAUÊ PINHEIRO PEREIRA', v_escola_id, v_turma_iump01, 'CRE', '2022-07-30', '10467621250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORENA BEATRIZ PEREIRA PEREIRA', v_escola_id, v_turma_iump01, 'PRE1', '2021-05-19', '09818623223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WESLEY PEREIRA DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2022-01-19', '10276370279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALANA GABRIELA TADEU PINTO', v_escola_id, v_turma_iump01, 'PRE2', '2020-08-31', '10230570267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY GABRIELLY PEREIRA TEIXEIRA PRÉ Il', v_escola_id, v_turma_iump01, 'PRE1', '2021-02-21', '09618390233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELLA PEREIRA DA SILVA', v_escola_id, v_turma_iump01, 'PRE2', '2020-06-04', '09313780283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RONY CARDOSO DA SILVA', v_escola_id, v_turma_iump01, 'PRE2', '2021-01-11', '09924539257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMILY DOS SANTOS VALE', v_escola_id, v_turma_iump01, 'PRE2', '2020-06-30', '09257882284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM901) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('AYLLA MARIA E SILVA FARIAS', v_escola_id, v_turma_fmm901, '1', '2019-11-12', '08732885210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNO RANGEL DA COSTA GOMES', v_escola_id, v_turma_fmm901, '1', '2019-07-05', '08701352288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVERTON TRINDADE PEREIRA', v_escola_id, v_turma_fmm901, '1', '2019-12-21', '09215807209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENIFER FERREIRA PEREIRA', v_escola_id, v_turma_fmm901, '1', '2019-11-26', '08788530221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORENA SILVA ANDRADE', v_escola_id, v_turma_fmm901, '1', '2019-09-25', '09134631240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA EDUARDA PEREIRA COSTA', v_escola_id, v_turma_fmm901, '1', '2019-10-07', '08772888288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAYSA GABRIELLY SILVA LIMA', v_escola_id, v_turma_fmm901, '1', '2020-01-28', '09126782243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALAN GABRIEL TADEU PINTO', v_escola_id, v_turma_fmm901, '2', '2018-09-29', '08424733274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSON SILVA DA SILVA', v_escola_id, v_turma_fmm901, '2', '2018-10-27', '05604690201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILY GABRIELE DO AMARAL DAMACENO', v_escola_id, v_turma_fmm901, '2', '2018-12-05', '08287565200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUA GOMES DA COSTA', v_escola_id, v_turma_fmm901, '2', '2018-11-16', '07917202259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RONEI CARDOSO DA SILVA', v_escola_id, v_turma_fmm901, '2', '2018-08-04', '07669367345');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M901) - 9 alunos
  v_result := fn_upsert_aluno_2026_v2('CRISTIANE DE MELO PEREIRA', v_escola_id, v_turma_f3m901, '3', '2017-04-04', '08872193222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAFNNY LORRANE DA SILVA ANDRADE', v_escola_id, v_turma_f3m901, '3', '2017-05-29', '10422915270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('INGRIDY NAYANY E SILVA LIMA', v_escola_id, v_turma_f3m901, '3', '2017-08-14', '09520208232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUAN VINÍCIUS MARTINS RODRIGUES', v_escola_id, v_turma_f3m901, '3', '2018-02-07', '07132911252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MURILO DA SILVA DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2018-01-04', '07153084240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PABLO SILVA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-10-10', '10399258205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO CÁSIO NUNES TADEU', v_escola_id, v_turma_f3m901, '3', '2017-11-19', '07113824250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO SILVA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-10-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TÁLIA DE MORAES MACIEL', v_escola_id, v_turma_f3m901, '3', '2018-03-05', '07288569217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM902) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('ALAN VITOR DA COSTA COELHO', v_escola_id, v_turma_fmm902, '4', '2016-03-17', '08903935241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL DA SILVA TEIXEIRA', v_escola_id, v_turma_fmm902, '4', '2006-02-16', '08861375278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GLEIDSON LIMA ANDRADE', v_escola_id, v_turma_fmm902, '4', '2016-07-15', '09143274293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUANE GOMES DA COSTA', v_escola_id, v_turma_fmm902, '4', '2016-04-16', '71153794241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALDIEMISON DE LIMA SILVA', v_escola_id, v_turma_fmm902, '4', '2016-11-06', '09613367225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR MONTEIRO MAGALHÃES', v_escola_id, v_turma_fmm902, '5', '2016-02-24', '05527347218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMANUEL JÚNIOR GOMES PEREIRA', v_escola_id, v_turma_fmm902, '5', '2014-10-28', '08122958206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HENRIQUE TADEU LOBATO', v_escola_id, v_turma_fmm902, '5', '2016-03-20', '10186361297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO ROBSON NUNES TADEU', v_escola_id, v_turma_fmm902, '5', '2015-11-15', '09513454274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO VITOR DO AMARAL DAMASCENO', v_escola_id, v_turma_fmm902, '5', '2014-07-08', '09067602248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MILIELSON DE LIMA DA COSTA', v_escola_id, v_turma_fmm902, '5', '2015-02-27', '08969241221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALTER DE LIMA DA SILVA', v_escola_id, v_turma_fmm902, '5', '2015-01-14', '08992115261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 7 alunos
  v_result := fn_upsert_aluno_2026_v2('ANITA DE MELO PEREIRA', v_escola_id, v_turma_f6t901, '6', '2014-05-27', '08872158230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO VITOR DOS SANTOS DA SILVA', v_escola_id, v_turma_f6t901, '6', '2015-04-15', '08973429256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSIELE DO AMARAL DAMASCENO', v_escola_id, v_turma_f6t901, '6', '1009-12-16', '09037626254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAILANY GOMES DA COSTA', v_escola_id, v_turma_f6t901, '6', '2014-09-05', '04790771261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAQUEL SIQUEIRA DA SILVA', v_escola_id, v_turma_f6t901, '6', '2015-01-04', '10122892224');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIQUELME TADEU LOBATO', v_escola_id, v_turma_f6t901, '6', '2014-04-20', '08960120260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMILI LIMA ANDRADE', v_escola_id, v_turma_f6t901, '6', '2014-10-14', '09143271278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 5 alunos
  v_result := fn_upsert_aluno_2026_v2('DALESSANDRO DE MELO PEREIRA', v_escola_id, v_turma_f7t901, '7', '2012-04-21', '08872110203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL DA ROSA CARDOSO', v_escola_id, v_turma_f7t901, '7', '2014-02-16', '09016679278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELISON DO AMARAL DAMACENO', v_escola_id, v_turma_f7t901, '7', '2012-07-27', '09067584240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO ANDREI PEREIRA COSTA', v_escola_id, v_turma_f7t901, '7', '2013-07-11', '08868690217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALDICLEIA DE LIMA DA SILVA', v_escola_id, v_turma_f7t901, '7', '2012-11-19', '08992089244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 5 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA CLARA MARQUES COELHO', v_escola_id, v_turma_f8t901, '8', '2012-11-05', '08903892259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTUR TADEU LOBATO', v_escola_id, v_turma_f8t901, '8', '2012-05-15', '08960069213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MERCI DARLISSON DE LIMA DA COSTA', v_escola_id, v_turma_f8t901, '8', '2012-08-31', '08969225293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAQUELE CORRÊA TADEU', v_escola_id, v_turma_f8t901, '8', '2008-04-14', '02344888241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELISON PEREIRA DA SILVA', v_escola_id, v_turma_f8t901, '8', '2011-05-14', '08811979200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF CASTANHAL: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 3. EMEB EMMANOEL (codigo: EMEB_EMMANOEL_LOBATO)
--    11 turmas, 290 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEB_EMMANOEL_LOBATO';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('I1MP01', 'Pré I - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35, false),
    ('I2MP01', 'Pré II - Manhã', v_escola_id, 'PRE2', '2026', 'matutino', 35, false),
    ('F1M901', '1º Ano - Manhã', v_escola_id, '1', '2026', 'matutino', 35, false),
    ('F1M902', '1º Ano - Manhã', v_escola_id, '1', '2026', 'matutino', 35, false),
    ('F3M902', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35, false),
    ('F5M901', '5º Ano - Manhã', v_escola_id, '5', '2026', 'matutino', 35, false),
    ('F5M902', '5º Ano - Manhã', v_escola_id, '5', '2026', 'matutino', 35, false),
    ('F6M901', 'Multi-série - Manhã', v_escola_id, '6', '2026', 'matutino', 35, true),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35, false),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35, false),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_i1mp01 UUID;
  v_turma_i2mp01 UUID;
  v_turma_f1m901 UUID;
  v_turma_f1m902 UUID;
  v_turma_f3m902 UUID;
  v_turma_f5m901 UUID;
  v_turma_f5m902 UUID;
  v_turma_f6m901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEB_EMMANOEL_LOBATO';
  SELECT id INTO v_turma_i1mp01 FROM turmas WHERE codigo = 'I1MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_i2mp01 FROM turmas WHERE codigo = 'I2MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1m901 FROM turmas WHERE codigo = 'F1M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1m902 FROM turmas WHERE codigo = 'F1M902' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m902 FROM turmas WHERE codigo = 'F3M902' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5m901 FROM turmas WHERE codigo = 'F5M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5m902 FROM turmas WHERE codigo = 'F5M902' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6m901 FROM turmas WHERE codigo = 'F6M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Pré I - Manhã (I1MP01) - 29 alunos
  v_result := fn_upsert_aluno_2026_v2('ALINE JORGE PEREIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-23', '10192368257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARLESSON KAUAN DA SILVA VALE', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-07-28', '10314446290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BIANCA DIAS NUNES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-14', '10145093271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAMILA DE SOUZA RAMOS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-04-30', '09719384239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAFNY SOFIA MELO LIMA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-01', '10726998265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI DOS REIS RODRIGUES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-17', '10207748276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOÁ NUNES DOS SANTOS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-06-05', '09834924252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO COSTA BEZERRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-03', '10023035242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO GABRIEL FUSCO COUTINHO', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-02-28', '10289179297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELYN MARCELA DA COSTA DA SILVA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-09-20', '10045799261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HEITOR DOS SANTOS MONTEIRO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-14', '10090805208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HEITOR SOUZA BARBOSA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-03-31', '10262404257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISAAC SOUZA BARBOSA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-03-31', '10262382261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHEMILLY LUISA BARBOSA MACHADO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-04', '10151636290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO LUCAS DE LIMA DA SILVA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-01-13', '10184760240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAYO DE LIMA NUNES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-03', '09748051226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY JOLIE GOMES MACIEL', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-06-14', '09969612247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA NCOLLY RODRIGUES BRITO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-01', '10078980208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA SOFIA CABRAL DE SOUZA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-06-27', '09893650267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOISES MARTINS MACIEL', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-07-02', '09835050201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NATASHA SOUZA DA COSTA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-12', '10839795238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO MURILO MARINHO DE MIRANDA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-26', '10069719209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PIETRO OLIVEIRA DA COSTA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-04', '10165105275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAELLY RAMOS COSTA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-15', '10081957238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENZO DE LIMA VEIGA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-05', '10264076214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICHARLLYSON EMANUEL BATISTA DE SOUZA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-01-27', '10310345286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAMARA KELY DA SILVA TEIXEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-20', '10151602204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WEVERTON MARINHO DA SILVA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-22', '10160789273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIN CRISTINA DE MELO DE LIMA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-09-13', '10154815233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Pré II - Manhã (I2MP01) - 28 alunos
  v_result := fn_upsert_aluno_2026_v2('ADSON RAFAEL DA SILVA DE SOUZA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-04-20', '09482224256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AGATHA ARIELLY PINHO DA SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-01-25', '09792999264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALCIANY RAMOS FREITAS', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-20', '09442115260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANGELINA STELLA DE PAULA GOMES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-05-12', '09205452203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTUR FELIPE COELHO DE OLIVEIRA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-02', '09608859271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLLA YOHANNA DO E.S. CORDEIRO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-12-15', '09520521216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LORENZO MARINHO RODRIGUES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-05-13', '09433176227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY SOFIA RODRIGUES DE SOUZA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-04-05', '09451190201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTHER DE SOUSA VILARINHO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-11', '09918738235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELLYN VITÓRIA CORDEIRORODRIGUES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-17', '09407021262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVERTON CABRAL DE SOUZA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-08-25', '09408638204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EZEQUIAS DA SILVA DA SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-05', '09751448204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISIS DANIELA DE SOUZA BARRETO', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-08', '09893631203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHON ALYSSON DE CASTRO MORAES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-05-07', '09203609202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARISSA DOS ANJOS RODRIGUES', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-30', '10582272203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARISSA VITÓRIA TADEU DE LIMA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-16', '09815092235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LOURENZO RODRIGUES FARIAS', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-06-08', '09404844209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUAN ICARO DOS ANJOS DE SOUZA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-09', '09468813240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARAYSA RAMOS DA SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-20', '09451249290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARLO DE SOUZA RAMOS', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-12-30', '09763029260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAYARA DA CONCEIÇÃO AMARA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-17', '09460890270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NÍCOLAS SOARES GOMES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-05', '11308463260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RHANA GABRIELA DE MELO DE SOUSA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-01', '09739814239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RHIANA DA SILVA DE SOUZA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-01', '09771306227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RHUAN GABRIEL RODRIGUES DOS ANJOS', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-11-17', '09495840295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICHARLISON JUNIOR FERREIRA LEAL', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-12-25', '10160277299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VITOR PEREIRA FERREIRA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-22', '09639596205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ZAQUEU JÙNIOR FARIAS SENA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-04-29', '09700192202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 1º Ano - Manhã (F1M901) - 21 alunos
  v_result := fn_upsert_aluno_2026_v2('AILON FREITAS MARINHO', v_escola_id, v_turma_f1m901, '1', '2019-07-19', '08578217250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE AMORAS FERREIRA', v_escola_id, v_turma_f1m901, '1', '2019-10-13', '08669730286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA BEATRIZ VALES JORGE', v_escola_id, v_turma_f1m901, '1', '2019-05-07', '08403672284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNA GABRIELLA MARTINS MORAES', v_escola_id, v_turma_f1m901, '1', '2019-12-11', '08812253202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BEATRIZ DE SOUZA RAMOS', v_escola_id, v_turma_f1m901, '1', '2019-11-11', '09382818286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDNO NETO DOS ANJOS PINHO', v_escola_id, v_turma_f1m901, '1', '2019-11-10', '09049846211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENDERSON RAMOS DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-07-27', '08560258280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ERICK DAVI DOS SANTOS DE SOUZA', v_escola_id, v_turma_f1m901, '1', '2019-11-05', '08718151256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HEITOR GAEL REIS RAMOS', v_escola_id, v_turma_f1m901, '1', '2019-12-13', '09220203294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IASMIN COELHO DE PINHO', v_escola_id, v_turma_f1m901, '1', '2020-01-19', '09364092236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHON WARLESON PINHEIRO DE SOUZA', v_escola_id, v_turma_f1m901, '1', '2020-02-12', '09486839298');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUÊ JUNIOR NUNES RAMOS', v_escola_id, v_turma_f1m901, '1', '2020-01-29', '09148181200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORRANA NUNES DE SOUZA', v_escola_id, v_turma_f1m901, '1', '2019-08-21', '08646002241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORRANE NUNES DE SOUZA', v_escola_id, v_turma_f1m901, '1', '2019-08-21', '08645989204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ EDUARDO NUNES RODRIGUES', v_escola_id, v_turma_f1m901, '1', '2020-02-21', '09147149299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUNA LOYSE RAMOS DOS SANTOS', v_escola_id, v_turma_f1m901, '1', '2019-11-11', '08727463214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA HELOÁ REIS RAMOS', v_escola_id, v_turma_f1m901, '1', '2019-12-13', '09220185296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA RAIMUNDA DOS ANJOS RODRIGUES', v_escola_id, v_turma_f1m901, '1', '2020-02-21', '09515383226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RILARY MAYARA FERNANDES DA COSTA', v_escola_id, v_turma_f1m901, '1', '2020-01-17', '09132196229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TALISSON ALVES CAVALCANTE', v_escola_id, v_turma_f1m901, '1', '2020-02-20', '09086467202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM DE LIMA RAMOS', v_escola_id, v_turma_f1m901, '1', '2019-10-08', '09353324211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 1º Ano - Manhã (F1M902) - 21 alunos
  v_result := fn_upsert_aluno_2026_v2('ALYSSON BRUNO SOUZA DA CONCEIÇÃO', v_escola_id, v_turma_f1m902, '1', '2019-10-17', '08743854230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNY LARISSA DOS ANJOS ANDRADE', v_escola_id, v_turma_f1m902, '1', '2019-07-31', '09053435220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('APOLIANA CLARICE BARBOSA DE SOUZA', v_escola_id, v_turma_f1m902, '1', '2020-02-28', '09505426283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANILO NUNES DE MELO', v_escola_id, v_turma_f1m902, '1', '2020-03-11', '09433110200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DIANE DE SOUZA RAMOS', v_escola_id, v_turma_f1m902, '1', '2019-09-27', '09763003202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO LEVY DE MELO FERREIRA', v_escola_id, v_turma_f1m902, '1', '2019-09-05', '08590623254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO DE LIMA RODRIGUES', v_escola_id, v_turma_f1m902, '1', '2019-10-31', '08674329294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HENDERSON BATISTA DE SOUZA', v_escola_id, v_turma_f1m902, '1', '2019-11-29', '08851391270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISMAEL NOVAES DA SILVA', v_escola_id, v_turma_f1m902, '1', '2020-03-27', '09294157288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADE GABRIELLA TEIXEIRA DA SILVA', v_escola_id, v_turma_f1m902, '1', '2020-02-22', '09271865278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATAN MOISÉS GOMES RODRIGUES', v_escola_id, v_turma_f1m902, '1', '2020-02-09', '09432846270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUANE MARINHO DA SILVA', v_escola_id, v_turma_f1m902, '1', '2019-06-28', '08648889294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAURA BEATRIZ ALVES FREIRE', v_escola_id, v_turma_f1m902, '1', '2019-09-02', '08588277271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEANDRO DA SILVA CASTRO', v_escola_id, v_turma_f1m902, '1', '2019-07-31', '08532793223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUAN LUCAS DE LIMA DA SILVA', v_escola_id, v_turma_f1m902, '1', '2019-09-06', '09233465209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA HELLENA DA COSTA FIUZA', v_escola_id, v_turma_f1m902, '1', '2020-03-16', '09323859230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA ISABELLE DOS ANJOS SOARES', v_escola_id, v_turma_f1m902, '1', '2020-02-02', '09103801209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAX GABRIEL GLÓRIA MACIEL', v_escola_id, v_turma_f1m902, '1', '2020-03-03', '09113202294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIANA NAUANY MACHADO BARBO SA', v_escola_id, v_turma_f1m902, '1', '2019-05-31', '10115261230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAYLA MARIA NUNES E NUNES', v_escola_id, v_turma_f1m902, '1', '2019-10-30', '10577237209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIN VITÓRIA DA SILVA RODRIGUES', v_escola_id, v_turma_f1m902, '1', '2020-01-31', '09100557269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M902) - 19 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRINEY RAMOS FREITAS', v_escola_id, v_turma_f3m902, '3', '2018-01-25', '07310392205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA BEATRIZ PINHEIRO DE SOUZA', v_escola_id, v_turma_f3m902, '3', '2017-07-13', '08938472248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA FLÁVIA COELHO DE PINHO', v_escola_id, v_turma_f3m902, '3', '2017-09-21', '10103816283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRÉ JÚNIOR LOBATO DA COSTA', v_escola_id, v_turma_f3m902, '3', '2017-09-10', '09134443240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CALEBE DA SILVA SILVA', v_escola_id, v_turma_f3m902, '3', '2017-10-20', '07557642260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DALISON NUNES DE MELO', v_escola_id, v_turma_f3m902, '3', '2017-10-10', '08934369256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDA KAROLINE SOUZA DE SOUZA', v_escola_id, v_turma_f3m902, '3', '2017-10-07', '10617360243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIAS DA SIVA DA SILVA', v_escola_id, v_turma_f3m902, '3', '2016-09-15', '09617015285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVERTON DANIEL MELO MACIEL', v_escola_id, v_turma_f3m902, '3', '2018-03-03', '07333787222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL RAMOS DA SILVA', v_escola_id, v_turma_f3m902, '3', '2016-07-23', '71323420290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISABELA DE LIMA DE SOUZA', v_escola_id, v_turma_f3m902, '3', '2017-08-02', '08930601278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAILTON WILLIAN DE SOUZA TEIXEIRA', v_escola_id, v_turma_f3m902, '3', '2018-03-14', '07318663208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUÊ DE LIMA NUNES', v_escola_id, v_turma_f3m902, '3', '2017-09-21', '09553644260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARA LOHANY NUNES DA CONCEIÇÃO', v_escola_id, v_turma_f3m902, '3', '2018-03-08', '07467224273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEO VYCTOR DE MELO FERREIRA', v_escola_id, v_turma_f3m902, '3', '2016-09-30', '08578641221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS DE CASTRO DE SOUZA', v_escola_id, v_turma_f3m902, '3', '2015-02-01', '08847350280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA VITÓRIA DA SILVA TEIXEIRA', v_escola_id, v_turma_f3m902, '3', '2017-10-21', '07477359210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIZAEL SOARES GOMES', v_escola_id, v_turma_f3m902, '3', '2017-12-11', '08674751296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALQUIRIA CABRAL DE SOUZA AEE', v_escola_id, v_turma_f3m902, '3', '2016-09-27', '08703440214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Manhã (F5M901) - 21 alunos
  v_result := fn_upsert_aluno_2026_v2('ALESSON ENDRYO VALES BARBOZA', v_escola_id, v_turma_f5m901, '5', '2015-09-08', '05358737278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSON JORGE PEREIRA', v_escola_id, v_turma_f5m901, '5', '2016-03-07', '10251918203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANANDA SOPHIA MARINHO RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2015-08-26', '08867219200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNA BARRETO SOARES', v_escola_id, v_turma_f5m901, '5', '2015-07-21', '09484468209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVID MILLER MARINHO MIRANDA', v_escola_id, v_turma_f5m901, '5', '2015-05-10', '08958340223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMELLY VILHENA RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2015-04-29', '08978445217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTEFANY NUNES E NUNES', v_escola_id, v_turma_f5m901, '5', '2015-12-03', '08983728280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FELIPE CASTRO DE SOUZA', v_escola_id, v_turma_f5m901, '5', '2012-08-31', '08847344204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO DOS ANJOS MACIEL', v_escola_id, v_turma_f5m901, '5', '2015-12-27', '08922724226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISABELLE DE SOUZA MORAES', v_escola_id, v_turma_f5m901, '5', '2014-08-16', '09014476256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHON LUCAS BARBOSA MACHADO', v_escola_id, v_turma_f5m901, '5', '2015-07-27', '09506941262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSIMAR NUNES RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2013-06-08', '08986119200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ DA SILVA SILVA', v_escola_id, v_turma_f5m901, '5', '2016-01-06', '08959660264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIS WALLACE MARINHO DE OLIVEIRA', v_escola_id, v_turma_f5m901, '5', '2015-05-29', '08887726299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MELRY DE LIMA RAMOS', v_escola_id, v_turma_f5m901, '5', '2016-01-17', '08967930283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIQUEIAS NUNES RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2011-02-10', '09035947223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAIAN FREITAS DE ALMEIDA', v_escola_id, v_turma_f5m901, '5', '2013-08-14', '08946349255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICKELMI NUNES CASTRO', v_escola_id, v_turma_f5m901, '5', '2015-06-12', '08889265299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TÂMILLY DE JESUS NUNES MACHADO', v_escola_id, v_turma_f5m901, '5', '2015-07-07', '08923476277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VERA ELINEUZA MARINHO DA COSTA', v_escola_id, v_turma_f5m901, '5', '2015-04-08', '09036468205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WESLEY JUNIOR FURTADO MARINHO', v_escola_id, v_turma_f5m901, '5', '2013-01-24', '08958455209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Manhã (F5M902) - 20 alunos
  v_result := fn_upsert_aluno_2026_v2('ALEX WESLEY DA CONCEIÇÃO AMARAL', v_escola_id, v_turma_f5m902, '5', '2014-06-20', '08889706252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA KEVILLY PINHEIRO DE SOUZA', v_escola_id, v_turma_f5m902, '5', '2015-12-21', '08938418200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANGÉLICA ARIANE MACHADO VILENA', v_escola_id, v_turma_f5m902, '5', '2015-12-14', '09601386254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNY VITÓRIA DE MELO PEREIRA', v_escola_id, v_turma_f5m902, '5', '2015-07-29', '08003119227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIELE GOMES GLÓRIA', v_escola_id, v_turma_f5m902, '5', '2013-03-02', '08943440219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLEI JÚNIOR BARRETO DE PINHO', v_escola_id, v_turma_f5m902, '5', '2015-04-16', '10168572257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISON MELO DA SILVA', v_escola_id, v_turma_f5m902, '5', '2016-02-26', '05633438264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTEFANY CABRAL DE SOUZA', v_escola_id, v_turma_f5m902, '5', '2013-07-11', '08890474211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EZIEL CORDEIRO RODRIGUES', v_escola_id, v_turma_f5m902, '5', '2012-11-15', '08870546250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HIAGO DE CASTRO RAMOS', v_escola_id, v_turma_f5m902, '5', '2015-10-30', '05570846280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAMILE MARTINS MACIEL', v_escola_id, v_turma_f5m902, '5', '2015-10-28', '09716503229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOCYEL DA SILVA DE CASTRO', v_escola_id, v_turma_f5m902, '5', '2016-01-20', '08851534217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEIANE COSTA SANTOS', v_escola_id, v_turma_f5m902, '5', '2015-12-29', '07038147293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELA DE MELO DE LIMA', v_escola_id, v_turma_f5m902, '5', '2015-12-21', '08978038255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIKAELA SOARES GOMES', v_escola_id, v_turma_f5m902, '5', '2014-09-21', '08887889244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO JORGE ALVES NUNES', v_escola_id, v_turma_f5m902, '5', '2015-02-24', '08900862227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIANA SOPHIA DOS REIS DA SILVA', v_escola_id, v_turma_f5m902, '5', '2015-10-31', '06481454255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RITA DE CÁSSIA JORGE SARMENTO', v_escola_id, v_turma_f5m902, '5', '2013-11-28', '71133363296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TIAGO MONTEIRO MARINHO', v_escola_id, v_turma_f5m902, '5', '2015-04-02', '08923643270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VINICIUS PEREIRA FERREIRA', v_escola_id, v_turma_f5m902, '5', '2015-05-13', '08868793296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (F6M901) - 41 alunos
  v_result := fn_upsert_aluno_2026_v2('ALESSANDRO JORGE PEREIRA', v_escola_id, v_turma_f6m901, '6', '2014-08-01', '05364117278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE GOMES FERREIRA', v_escola_id, v_turma_f6m901, '6', '2011-11-21', '08977067227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRESSA ELOÁ DOS ANJOS PINHO', v_escola_id, v_turma_f6m901, '6', '2015-02-01', '08937286246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARLESSON GOMES FERREIRA', v_escola_id, v_turma_f6m901, '6', '2011-11-21', '08977123232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUCCAS RAMOS DOS SANTOS', v_escola_id, v_turma_f6m901, '6', '2014-10-09', '04425653211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DOUGLAS SOUZA RAMOS', v_escola_id, v_turma_f6m901, '6', '2015-03-25', '08922504293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ERLANDES CABRAL DE SOUZA', v_escola_id, v_turma_f6m901, '6', '2012-02-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO RAMOS DE LIMA', v_escola_id, v_turma_f6m901, '6', '2013-03-23', '08924138243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HÉLTER OSCAR DA SILVA NUNES', v_escola_id, v_turma_f6m901, '6', '2015-03-04', '04959571276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IAGO DA SILVA DA COSTA', v_escola_id, v_turma_f6m901, '6', '2013-01-30', '08827610219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IGOR MARINHO DA SILVA', v_escola_id, v_turma_f6m901, '6', '2014-10-13', '08879407228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISTEFANY PANTOJA DA COSTA', v_escola_id, v_turma_f6m901, '6', '2015-02-15', '08884142261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JANAINA NUNES SOBRAL', v_escola_id, v_turma_f6m901, '6', '2013-09-22', '08871454260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAB E NUNES RODRIGUES', v_escola_id, v_turma_f6m901, '6', '2012-05-31', '09054342269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KELVIN MONTEIRO MARINHO', v_escola_id, v_turma_f6m901, '6', '2013-09-20', '08923594202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ MOISÉS MARINHO MONTEIRO', v_escola_id, v_turma_f6m901, '6', '2014-08-14', '08958216212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA EDUARDA MARINHO MARINHO', v_escola_id, v_turma_f6m901, '6', '2015-02-17', '08934934220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAYAN RAMOS E RAMOS', v_escola_id, v_turma_f6m901, '6', '2015-02-13', '08931239270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAEL DE JESUS TADEU MONTEIRO', v_escola_id, v_turma_f6m901, '6', '2013-01-11', '09037650201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAELA SUELEM DA SILVA ALVES', v_escola_id, v_turma_f6m901, '6', '2014-07-31', '08923874248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAYNARA RAMOS DA SILVA', v_escola_id, v_turma_f6m901, '6', '2014-06-18', '09603626228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALEX GONÇALVES FURTADO', v_escola_id, v_turma_f6m901, '6', '2014-05-11', '08419168297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICIA KEVILYN MARINHO CARVALHO', v_escola_id, v_turma_f6m901, '6', '2014-08-13', '08920143269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOSHENRIQUE CORDEIRO RODRIGUES', v_escola_id, v_turma_f6m901, '6', '2015-01-18', '08870581241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUIZ NUNES MORAES', v_escola_id, v_turma_f6m901, '6', '2015-02-05', '05420027283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELANO MACHADO AMARAL', v_escola_id, v_turma_f6m901, '6', '2014-08-12', '08894178226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL MELO DE SOUSA', v_escola_id, v_turma_f6m901, '6', '2014-07-23', '05266385243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIELE VITÓRIA GONÇALVES DE PINHO', v_escola_id, v_turma_f6m901, '6', '2013-07-10', '09000942225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IAN DOS ANJOS FUSCO', v_escola_id, v_turma_f6m901, '6', '2014-11-15', '08822303288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('INGRID DA SILVA RODRIGUES', v_escola_id, v_turma_f6m901, '6', '2014-06-05', '08937190214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISRAELY TAVARES FREITAS', v_escola_id, v_turma_f6m901, '6', '2010-06-26', '09087512228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAMILLY RAMOS NOVAES', v_escola_id, v_turma_f6m901, '6', '2014-06-11', '08939852281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHÉSSICA LUANNY CASTRO DE MELO', v_escola_id, v_turma_f6m901, '6', '2015-03-19', '08904838258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONY RAY FERREIRA DE SOUZA', v_escola_id, v_turma_f6m901, '6', '2013-12-08', '09856238293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUAN CHRISTIAN FERREIRA DE SOUZA', v_escola_id, v_turma_f6m901, '6', '2014-06-22', '08898691203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ OTÁVIO COELHO DE OLIVEIRA', v_escola_id, v_turma_f6m901, '6', '2015-01-01', '08919463220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO HENRIQUE DOS REIS JORGE', v_escola_id, v_turma_f6m901, '6', '2015-02-03', '08956562210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO COSTA SOARES', v_escola_id, v_turma_f6m901, '6', '2015-01-23', '09073878292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RANDERSON BATISTA DE SOUZA', v_escola_id, v_turma_f6m901, '6', '2015-03-03', '08851345244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THALLES TEIXEIRA NUNES', v_escola_id, v_turma_f6m901, '6', '2014-07-01', '08943674201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLIAN DE LIMA DE SOUZA', v_escola_id, v_turma_f6m901, '6', '2014-02-08', '08930545262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 32 alunos
  v_result := fn_upsert_aluno_2026_v2('AILA VITÓRIA DE MELO PEREIRA', v_escola_id, v_turma_f7t901, '7', '2013-05-17', '08003111242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA BEATRIZ MAGALHÃES DE SOUZA', v_escola_id, v_turma_f7t901, '7', '2013-08-19', '09046087271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRÉ RAMOS DA SILVA', v_escola_id, v_turma_f7t901, '7', '2014-03-02', '08861808212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAMILA BEATRIZ DOS ANJOS MACIEL', v_escola_id, v_turma_f7t901, '7', '2013-12-09', '08867044214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIEL CABRAL DE SOUZA', v_escola_id, v_turma_f7t901, '7', '2010-06-29', '08890453214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIEL VICTOR DOS SANTOS DE LIMA', v_escola_id, v_turma_f7t901, '7', '2008-08-27', '08969806261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDO MARINHO NUNES', v_escola_id, v_turma_f7t901, '7', '2013-04-10', '08870388247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELIN MELO MACIEL', v_escola_id, v_turma_f7t901, '7', '2014-01-10', '08930102271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FABSON DA COSTA DIAS', v_escola_id, v_turma_f7t901, '7', '2013-10-16', '08921371265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FLAVIA RODRIGUES DOS REIS', v_escola_id, v_turma_f7t901, '7', '2013-12-23', '08883957288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIELA DA SILVA MARINHO', v_escola_id, v_turma_f7t901, '7', '2014-01-29', '05546208201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEYSIANE DE SOUZA FUSCO AEE', v_escola_id, v_turma_f7t901, '7', '2014-03-15', '08854040258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENNYFFER RAYSSA LIMA GONÇALVES', v_escola_id, v_turma_f7t901, '7', '2014-02-23', '08926566200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAB CONCEIÇÃO FERREIRA', v_escola_id, v_turma_f7t901, '7', '2013-10-27', '08926411265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAB DA SILVA RAMOS', v_escola_id, v_turma_f7t901, '7', '2008-03-26', '08929778253');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAN FERREIRA DE SOUZA', v_escola_id, v_turma_f7t901, '7', '2012-07-09', '08906303211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO PEDRO FURTADO DE SOUZA', v_escola_id, v_turma_f7t901, '7', '2001-11-11', '09735553279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSEPH RAMOS DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2012-03-23', '08764806286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAEL MARINHO LOBATO', v_escola_id, v_turma_f7t901, '7', '2013-06-28', '08852674276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KASSIANE NUNES RAMOS', v_escola_id, v_turma_f7t901, '7', '2012-11-05', '08928367255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAYLANNE FREIRE ALVES', v_escola_id, v_turma_f7t901, '7', '2013-05-03', '08887819203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAIANE RODRIGUES DE SOUZA', v_escola_id, v_turma_f7t901, '7', '2011-06-08', '08872691257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA APARECIDA GONÇALVES FURTADO', v_escola_id, v_turma_f7t901, '7', '2012-08-30', '08419153265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA DE NAZARÉ DA SILVA TEIXEIRA', v_escola_id, v_turma_f7t901, '7', '2014-02-22', '08876624201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULA CRISTINA GONÇALVES FUSCO', v_escola_id, v_turma_f7t901, '7', '2014-02-20', '08851164290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO SÉRGIO DOS REIS JORGE', v_escola_id, v_turma_f7t901, '7', '2013-12-31', '08956522260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIHANNA PANTOJA MARINHO', v_escola_id, v_turma_f7t901, '7', '2013-09-30', '08935744220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RONALD DA COSTA CORRÊA', v_escola_id, v_turma_f7t901, '7', '2013-09-26', '08848341233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUAN PYETRO DE MELO FERREIRA', v_escola_id, v_turma_f7t901, '7', '2012-04-29', '05529673279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAEMILI NUNES TADEU', v_escola_id, v_turma_f7t901, '7', '2013-11-27', '08960318299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VICTOR DIAS DOS REIS', v_escola_id, v_turma_f7t901, '7', '2013-06-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM MARINHO DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-05-14', '08879374206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 26 alunos
  v_result := fn_upsert_aluno_2026_v2('ABRAÃO VITOR FARIAS RODRIGUES', v_escola_id, v_turma_f8t901, '8', '2012-06-29', '08888793267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA CRISTINA DA COSTA MARINHO', v_escola_id, v_turma_f8t901, '8', '2013-04-07', '09036437237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLEBESON RAMOS DA SILVA = AEE', v_escola_id, v_turma_f8t901, '8', '2012-10-01', '07685775271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEIVID VICTOR GONÇALVES DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2012-12-17', '08929935290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISSANDRA DE SOUZA FUSCO', v_escola_id, v_turma_f8t901, '8', '2012-09-21', '08854018244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVERTON GLÓRIA MIRANDA', v_escola_id, v_turma_f8t901, '8', '2013-03-04', '08983192267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EZIEL MARTINS SOARES', v_escola_id, v_turma_f8t901, '8', '2011-11-01', '08890606223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FELIPE MARINHO DA SILVA', v_escola_id, v_turma_f8t901, '8', '2011-11-01', '08883491226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO DE MELO DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2008-11-16', '09007977202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HANNAH SOPHIA MARINHO FERREIRA', v_escola_id, v_turma_f8t901, '8', '2011-01-25', '04947255242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HILLARY DE PINHO NUNES', v_escola_id, v_turma_f8t901, '8', '2012-08-30', '08980846282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISABELLY RODRIGUES NOVAES', v_escola_id, v_turma_f8t901, '8', '2006-02-26', '09812124250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELSON NUNES RODRIGUES', v_escola_id, v_turma_f8t901, '8', '2010-08-19', '08986102226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ CARLOS FREITAS DE ALMEIDA', v_escola_id, v_turma_f8t901, '8', '2010-10-19', '08946317213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ FURTADO DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2008-10-16', '08881363232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAMILLA DE MELO DE LIMA', v_escola_id, v_turma_f8t901, '8', '2011-12-09', '08978014232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEONARDO MONTEIRO MARINHO', v_escola_id, v_turma_f8t901, '8', '2011-10-02', '08923544299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIANO DE SOUZA GOMES', v_escola_id, v_turma_f8t901, '8', '2010-03-03', '08892537229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUÍS FERNANDES DA SILVA ALVES', v_escola_id, v_turma_f8t901, '8', '2012-05-06', '08923844250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ GUSTAVO DE SOUZA FERREIRA', v_escola_id, v_turma_f8t901, '8', '2012-04-20', '08898272227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA DE NAZARÉ NUNES MACHADO', v_escola_id, v_turma_f8t901, '8', '2012-04-27', '08923406228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATEUS MELO MACIEL', v_escola_id, v_turma_f8t901, '8', '2012-09-11', '08880228242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAEL NUNES RODRIGUES', v_escola_id, v_turma_f8t901, '8', '2011-04-19', '09032475266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYANE DA COSTA BRABO', v_escola_id, v_turma_f8t901, '8', '2012-12-24', '08978111270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELLINGTON RAMOS MARINHO', v_escola_id, v_turma_f8t901, '8', '2010-03-29', '09035868277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELLYNGTHON DOS ANJOS MARINHO', v_escola_id, v_turma_f8t901, '8', '2012-05-17', '08900679295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 32 alunos
  v_result := fn_upsert_aluno_2026_v2('ALEX SANTANA TEIXEIRA', v_escola_id, v_turma_f9t901, '9', '2010-12-08', '08847888220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE FURTADO DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-08-31', '08854376248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR NUNES MACIEL', v_escola_id, v_turma_f9t901, '9', '2011-08-12', '08845307280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNA GONÇALVES FURTADO', v_escola_id, v_turma_f9t901, '9', '2011-04-15', '08419138207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNO FELIPE DE SOUZA FERREIRA', v_escola_id, v_turma_f9t901, '9', '2011-01-11', '08898234210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLARICE RAFAELI PANTOJA MARINHO', v_escola_id, v_turma_f9t901, '9', '2011-07-23', '08935703206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELLY MARINHO DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-10-01', '08879332201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIELY DA CONCEIÇÃO AMARAL', v_escola_id, v_turma_f9t901, '9', '2011-12-10', '08889629240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEAN MARINHO DE OLIVEIRA', v_escola_id, v_turma_f9t901, '9', '2011-09-26', '08937819244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HAILA LOBATO FERREIRA', v_escola_id, v_turma_f9t901, '9', '2011-08-08', '08192923207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELANA GONÇALVES FUSCO', v_escola_id, v_turma_f9t901, '9', '2012-01-04', '08851151202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELLANDHA MACHADO AMARAL', v_escola_id, v_turma_f9t901, '9', '2011-06-17', '08894169235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ VITOR RAMOS NUNES', v_escola_id, v_turma_f9t901, '9', '2010-03-21', '08895702212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSIMAR DA SILVA CASTRO', v_escola_id, v_turma_f9t901, '9', '2010-11-26', '08851494240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ DA SILVA CASTRO', v_escola_id, v_turma_f9t901, '9', '2009-03-03', '08851466203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIANY FREIRE DO ESPIRITO SANTO', v_escola_id, v_turma_f9t901, '9', '2012-02-25', '09082614200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIVALDO CORDEIRO MACIEL', v_escola_id, v_turma_f9t901, '9', '2007-05-11', '08861902235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MADSON BARBOSA DE SOUZA', v_escola_id, v_turma_f9t901, '9', '2010-09-28', '08853936274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELA GLÓRIA MIRANDA', v_escola_id, v_turma_f9t901, '9', '2012-02-04', '08983138211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCOS VINICIOS DE MELO DE LIMA', v_escola_id, v_turma_f9t901, '9', '2009-08-17', '08977982286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA CLARA TEIXEIRA COSTA', v_escola_id, v_turma_f9t901, '9', '2011-09-20', '08935931250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAX MILLER NUNES DOS ANJOS', v_escola_id, v_turma_f9t901, '9', '2009-10-31', '08925415208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NADSON RAMOS E RAMOS', v_escola_id, v_turma_f9t901, '9', '2011-08-24', '08931191219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAILSON BATISTA DE SOUZA', v_escola_id, v_turma_f9t901, '9', '2011-10-18', '08851315256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYAN RAMOS DE LIMA', v_escola_id, v_turma_f9t901, '9', '2010-02-01', '08931865201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENAN VINICIUS VILHENA SOARES', v_escola_id, v_turma_f9t901, '9', '2011-09-22', '08978749275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICHARLY VINICIUS MARINHO DACOSTA', v_escola_id, v_turma_f9t901, '9', '2011-09-18', '08978293280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROSE DE CASTRO DE SOUZA', v_escola_id, v_turma_f9t901, '9', '2011-02-27', '08847336295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMILY CORDEIRO RODRIGUES', v_escola_id, v_turma_f9t901, '9', '2011-02-02', '08870498263');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SILVANO MARINHO DA SILVA', v_escola_id, v_turma_f9t901, '9', '2010-03-28', '09083481263');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALDINEI TADEU DO VALE', v_escola_id, v_turma_f9t901, '9', '2010-02-18', '08871057260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALNICLEI SANTANA TEIXEIRA', v_escola_id, v_turma_f9t901, '9', '2009-04-30', '08847868203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEB EMMANOEL: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 4. EMEIF INDEPENDENCIA (codigo: EMEIF_INDEPENDÊNCIA)
--    6 turmas, 114 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_INDEPENDÊNCIA';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('FMM901', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('F3M901', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35, false),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35, false),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35, false),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35, false),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_fmm901 UUID;
  v_turma_f3m901 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_INDEPENDÊNCIA';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (FMM901) - 56 alunos
  v_result := fn_upsert_aluno_2026_v2('ELIAS LIMA GOMES', v_escola_id, v_turma_fmm901, 'CRE', '2022-04-08', '10413256227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MICAEL SANTOS RODRIGUES', v_escola_id, v_turma_fmm901, 'CRE', '2022-04-20', '10653632223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIQUEIAS SANTOS RODRIGUES', v_escola_id, v_turma_fmm901, 'CRE', '2022-11-24', '10643612262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WEMILLY LUARA ANDRADE GOMES', v_escola_id, v_turma_fmm901, 'CRE', '2022-12-15', '10679389237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSANDRA DA SILVA LIMA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-11-01', '10708298206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTOFF BAIA PEREIRA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-05-07', '09785682226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEYVISON KAUÊ DA COSTA PANTOJA', v_escola_id, v_turma_fmm901, 'PRE1', '2022-03-31', '10371179211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL GOMES MATOS', v_escola_id, v_turma_fmm901, 'PRE1', '2021-12-22', '10360017258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GAEL MARTINS DA SILVA', v_escola_id, v_turma_fmm901, 'PRE1', '2022-02-19', '10510703259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HADASSA LAIANA RODRIGUES DE LIMA', v_escola_id, v_turma_fmm901, 'PRE1', '2022-02-05', '10371121213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WANDRIA DAIELE COSTA DA COSTA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-08-27', '10298951207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WEVELLY MILENA MATOS PEREIRA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-09-08', '10708098290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILY SAMILY LIMA DA COSTA', v_escola_id, v_turma_fmm901, 'PRE2', '2020-10-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FELIPE DE LIMA SENA', v_escola_id, v_turma_fmm901, 'PRE2', '2020-08-13', '09521913266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENNIFER RUANA DA SILVA DO CARMO', v_escola_id, v_turma_fmm901, 'PRE2', '2020-08-08', '09389201209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAQUIM GOMES MATOSI', v_escola_id, v_turma_fmm901, 'PRE1', '2020-06-14', '10360011217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMELLY DANDARA FERREIRAPEREIRAI', v_escola_id, v_turma_fmm901, 'PRE1', '2020-11-06', '09760119218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIELA DOS SANTOS LIMA', v_escola_id, v_turma_fmm901, 'PRE2', '2020-09-15', '09482409205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PIETRO LORENZO TAVARES DIASI', v_escola_id, v_turma_fmm901, 'PRE1', '2020-12-28', '09762133200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VICENTE MARTINS DA SILVAI', v_escola_id, v_turma_fmm901, 'PRE1', '2020-04-19', '09440261250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÁGHATA MANUELLY BRITO CASTRO', v_escola_id, v_turma_fmm901, '1', '2019-10-14', '08678296216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALIANDRA DA SILVA LIMA', v_escola_id, v_turma_fmm901, '1', '2019-12-14', '09346289201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALYSSON MATHEUS BAIA PEREIRA', v_escola_id, v_turma_fmm901, '1', '2018-07-27', '07557325290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANTHONY DAVI RODRIGUES DA COSTA', v_escola_id, v_turma_fmm901, '1', '2020-03-28', '09293955229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ERIQUE KAUAN DO NASCIMENTO VALE', v_escola_id, v_turma_fmm901, '1', '2020-02-07', '09038162294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTER RAMOS PEREIRA', v_escola_id, v_turma_fmm901, '1', '2019-05-20', '09064049246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ITALO BRITO RODRIGUES', v_escola_id, v_turma_fmm901, '1', '2019-04-16', '08625650228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO DEIVESON DE SOUZA DA SILV A', v_escola_id, v_turma_fmm901, '1', '2019-09-10', '08743736203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS SANTOS RAMOS', v_escola_id, v_turma_fmm901, '1', '2020-02-15', '09112857254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUNNA PEREIRA LIMA', v_escola_id, v_turma_fmm901, '1', '2020-02-23', '10069653275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIANE GOMES ANDRADE', v_escola_id, v_turma_fmm901, '2', '2018-09-11', '08395792255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI ANDRADE LIMA', v_escola_id, v_turma_fmm901, '2', '2019-03-01', '08809626230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO GAEL DA SILVA DE SOUZA', v_escola_id, v_turma_fmm901, '2', '2019-02-16', '08625560237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JANAINA DO NASCIMENTO DA SILVA', v_escola_id, v_turma_fmm901, '2', '2018-11-04', '07890272243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIANE DOS SANTOS LIMA', v_escola_id, v_turma_fmm901, '2', '2018-08-04', '08513638226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAILISON MACHADO ANDRADE', v_escola_id, v_turma_fmm901, '2', '2018-09-12', '07879552219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WERICK TAVARES CAMPO', v_escola_id, v_turma_fmm901, '2', '2019-02-17', '08637507298');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRÉ CLEMENTE RODRIGUES SANTOS', v_escola_id, v_turma_fmm901, '4', '2017-01-22', '09024415233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CASSIANE TAVARES GOMES', v_escola_id, v_turma_fmm901, '4', '2017-03-04', '09026409257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOANY DIAS DA COSTA', v_escola_id, v_turma_fmm901, '4', '2016-11-05', '09690046217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZABEL GOMES DA COSTA', v_escola_id, v_turma_fmm901, '4', '2016-04-21', '09643267295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ RYAN DA SILVA DO CARMO', v_escola_id, v_turma_fmm901, '4', '2016-10-08', '08743688209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ DE SOUZA PEREIRA', v_escola_id, v_turma_fmm901, '4', '2016-04-28', '09100506273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAILANE MONTEIRO DE CASTRO', v_escola_id, v_turma_fmm901, '4', '2016-09-07', '09561017202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAURA SAMILLY SANTOS RAMOS', v_escola_id, v_turma_fmm901, '4', '2016-08-18', '09619316207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIANO ALVES DOS SANTOS', v_escola_id, v_turma_fmm901, '4', '2016-11-03', '10196885213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANASSÉS LIMA LIMA', v_escola_id, v_turma_fmm901, '4', '2017-01-22', '09005148250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATHEUS CASTRO DA SILVA', v_escola_id, v_turma_fmm901, '4', '2016-06-08', '08946762292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYARA CASTRO NOGUEIRA', v_escola_id, v_turma_fmm901, '4', '2016-11-03', '09016382267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIAN DOS SANTOS RODRIGUES', v_escola_id, v_turma_fmm901, '4', '2015-04-28', '09050814204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALEXSANDRO PINHEIRO ALVES', v_escola_id, v_turma_fmm901, '5', '2016-03-04', '10168498260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALIANE ANDRADE LIMA', v_escola_id, v_turma_fmm901, '5', '2015-08-01', '09037958257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO RAIKA RAMOS PINHEIRO', v_escola_id, v_turma_fmm901, '5', '2015-07-24', '08853227206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY THAIS DE FREITAS DO NASCIMENTO', v_escola_id, v_turma_fmm901, '5', '2015-05-25', '09014656238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCIEL PINHEIRO ALVES', v_escola_id, v_turma_fmm901, '5', '2014-07-24', '10168493209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROBERT MAIAN RAMOS DE SOUZA', v_escola_id, v_turma_fmm901, '5', '2014-12-18', '10679971211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M901) - 15 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIA PEREIRA GOMES', v_escola_id, v_turma_f3m901, '3', '2016-10-20', '08268955228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AKYSSA RODRIGUES DA COSTA', v_escola_id, v_turma_f3m901, '3', '2017-04-20', '08182543274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALINE DA SILVA DE LIMA', v_escola_id, v_turma_f3m901, '3', '2017-11-21', '09346276223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIELA CEMILY DA COSTA PANTOJA', v_escola_id, v_turma_f3m901, '3', '2017-11-08', '10223474207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DIERLEY ANDRADE LIMA', v_escola_id, v_turma_f3m901, '3', '2017-06-05', '09037975267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMISON DIEGO DE LIMA E LIMA', v_escola_id, v_turma_f3m901, '3', '2017-09-23', '07416816254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KYARA DE FREITAS DO NASCIMENTO', v_escola_id, v_turma_f3m901, '3', '2017-05-11', '07114913214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ FERNANDO DE OLIVEIRA LIMA', v_escola_id, v_turma_f3m901, '3', '2017-05-14', '09081238256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MICAELY DOS SANTOS RODRIGUES /AEE', v_escola_id, v_turma_f3m901, '3', '2017-10-20', '08505199260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOISÉS DIEGO DO NASCIMENTO PEREIRA', v_escola_id, v_turma_f3m901, '3', '2017-05-20', '08715291227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAEL PINHEIRO ALVES', v_escola_id, v_turma_f3m901, '3', '2018-02-04', '10168501236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIANA DOS SANTOS RODRIGUES', v_escola_id, v_turma_f3m901, '3', '2012-11-28', '05568395284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RISIA DIAS RAMOS AEE = LAUDO', v_escola_id, v_turma_f3m901, '3', '2018-02-24', '07098186292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALNEI MARTINS DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-04-08', '08958135212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACE JUNIOR DE MATOS PEREIRA', v_escola_id, v_turma_f3m901, '3', '2017-10-21', '08221240257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('ITALO GOMES DA COSTA', v_escola_id, v_turma_f6t901, '6', '2014-11-06', '09053198261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIANE LIMA RODRIGUES', v_escola_id, v_turma_f6t901, '6', '2015-01-28', '08990830214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAREN SOPHIA PEREIRA RAMOS', v_escola_id, v_turma_f6t901, '6', '2014-08-31', '09705773203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA CLARA FURTADO DIAS', v_escola_id, v_turma_f6t901, '6', '2014-06-23', '08963459209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA VITÓRIA DE SOUZA PEREIRA', v_escola_id, v_turma_f6t901, '6', '2014-05-31', '09100487201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARILDO DOS SANTOS LIMA', v_escola_id, v_turma_f6t901, '6', '2015-02-09', '09005734221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAXWEL LIMA E LIMA', v_escola_id, v_turma_f6t901, '6', '2014-12-13', '09005135271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIAKSA DIAS RAMOS', v_escola_id, v_turma_f6t901, '6', '2014-08-14', '08898577257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 10 alunos
  v_result := fn_upsert_aluno_2026_v2('DÉBORA CRISTINA RODRIGUÊS SANTOS', v_escola_id, v_turma_f7t901, '7', '2013-06-17', '09024390222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDA FERREIRA RAMOS', v_escola_id, v_turma_f7t901, '7', '2013-09-19', '08999289273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOIZA RAMOS PEREIRA', v_escola_id, v_turma_f7t901, '7', '2013-04-17', '09063707282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAILSON RODRIGUES BELÉM', v_escola_id, v_turma_f7t901, '7', '2013-05-24', '08221942286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JESUS DE NAZARÉ DE OLIVEIRA LIMA', v_escola_id, v_turma_f7t901, '7', '2013-10-30', '09081214233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIANY SANTOS OLIVEIRA', v_escola_id, v_turma_f7t901, '7', '2013-08-09', '08969152202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAIMUNDO NETO DO SILVA DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2012-04-27', '09069847264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENATO DOS SANTOS RODRIGUES', v_escola_id, v_turma_f7t901, '7', '2010-08-06', '09050784208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VANDERSON MARTINS DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-09-25', '08958081295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELLITON NASCIMENTO DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2013-09-19', '09873986286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 10 alunos
  v_result := fn_upsert_aluno_2026_v2('ABNER DIAS RAMOS', v_escola_id, v_turma_f8t901, '8', '2012-06-28', '08898539240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALESSANDRA ANDRADE LIMA', v_escola_id, v_turma_f8t901, '8', '2013-08-20', '09037943225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA KEURY VILHENA DOS SANTOS', v_escola_id, v_turma_f8t901, '8', '2011-12-09', '09024494273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANANDA TAVARES GOMES', v_escola_id, v_turma_f8t901, '8', '2013-01-12', '09026402244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIZA DA SILVA OLIVEIRA', v_escola_id, v_turma_f8t901, '8', '2013-02-13', '09016652230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY RAIARA RAMOS PINHEIRO', v_escola_id, v_turma_f8t901, '8', '2012-09-30', '08853217235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELITON LIMA RODRIGUES', v_escola_id, v_turma_f8t901, '8', '2013-04-11', '08990801206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ VITOR DA CONCEIÇÂO.PEREIRA', v_escola_id, v_turma_f8t901, '8', '2012-10-01', '09016122273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAYLER DE FREITAS DO NASCIMENTO', v_escola_id, v_turma_f8t901, '8', '2012-12-21', '09014613261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIELSON DOS SANTOS LIMA', v_escola_id, v_turma_f8t901, '8', '2012-06-28', '09005727284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 15 alunos
  v_result := fn_upsert_aluno_2026_v2('BRUNA CARLA PEREIRA RAMOS', v_escola_id, v_turma_f9t901, '9', '2012-01-25', '08101025286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDIVANDRO VIANA GOMES', v_escola_id, v_turma_f9t901, '9', '2010-08-20', '09748082296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDO FERREIRA RAMOS', v_escola_id, v_turma_f9t901, '9', '2011-09-01', '08999278239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GRAZIELE DE SENA RAMOS', v_escola_id, v_turma_f9t901, '9', '2011-12-28', '09026549261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAIANE RODRIGUÊS BELÉM', v_escola_id, v_turma_f9t901, '9', '2012-02-29', '07793357248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEFFERSON ALVES DE LIMA', v_escola_id, v_turma_f9t901, '9', '2011-05-02', '09043739243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATAS SANTOS OLIVEIRA', v_escola_id, v_turma_f9t901, '9', '2011-02-23', '08969142240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOEL FURTADO DIAS', v_escola_id, v_turma_f9t901, '9', '2012-04-09', '08963440290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAILANE DE AZEVEDO SILVA', v_escola_id, v_turma_f9t901, '9', '2011-08-17', '09023975243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYANE BEATRIZ CASTRO DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-05-24', '08946742267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYSA CASTRO NOGUEIRA', v_escola_id, v_turma_f9t901, '9', '2011-08-05', '09016371222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MILLY KELLEN PEREIRA E PEREIRA', v_escola_id, v_turma_f9t901, '9', '2011-08-20', '09044894269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NATALIA MARTINS DA SILVA', v_escola_id, v_turma_f9t901, '9', '2012-02-11', '08958038284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ORIAS RAMOS E RAMOS', v_escola_id, v_turma_f9t901, '9', '2012-02-01', '09014219288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMUEL RODRIGUÊS PEREIRA', v_escola_id, v_turma_f9t901, '9', '2012-01-03', '08947593290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF INDEPENDENCIA: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 5. EMEIF LOURIVAL CAMARAO (codigo: EMEIF_LOURIVAL_CAMARÃO)
--    2 turmas, 14 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_LOURIVAL_CAMARÃO';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('FMM901', 'Multi-série - Manhã', v_escola_id, '1', '2026', 'matutino', 35, true)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_fmm901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_LOURIVAL_CAMARÃO';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 6 alunos
  v_result := fn_upsert_aluno_2026_v2('JHEMELY DA SILVA DOS SANTOS', v_escola_id, v_turma_iump01, 'CRE', '2022-12-24', '10599036281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALEXANDRE DA SILVA DOS SANTOS', v_escola_id, v_turma_iump01, 'PRE1', '2020-07-26', '09351542211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTIAN LORRAN DOS SANTOS DOS SANTOS', v_escola_id, v_turma_iump01, 'PRE1', '2020-05-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANILO SOUZA DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2020-07-12', '09450293228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TALISON LUAN COSTA DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-01-18', '10233667202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO LUCAS DO NASCIMENTO DA SILVA', v_escola_id, v_turma_iump01, 'PRE2', '2020-11-30', '09805310205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('MURILO PINHEIRO DA SILVA', v_escola_id, v_turma_fmm901, '1', '2019-05-16', '08390178206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR DA SILVA DOS SANTOS', v_escola_id, v_turma_fmm901, '2', '2019-03-08', '08179394239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEIVID RUAN SOUZA DA SILVA', v_escola_id, v_turma_fmm901, '2', '2018-04-01', '07240659208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAINARA DA COSTA DA SILVA', v_escola_id, v_turma_fmm901, '2', '2018-05-20', '07467581203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNO DA SILVA TRINDADE', v_escola_id, v_turma_fmm901, '3', '2017-06-24', '09749522222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROSIELE DOS SANTOS SANTOS', v_escola_id, v_turma_fmm901, '3', '2017-12-09', '09683466265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA LUIZA DA SILVA DOS SANTOS', v_escola_id, v_turma_fmm901, '4', '2017-02-08', '09050220258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LILA MARIA DA SILVA DOS SANTOS', v_escola_id, v_turma_fmm901, '4', '2017-01-31', '09005333235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF LOURIVAL CAMARAO: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 6. EMEIF MALOCA (codigo: EMEIF_MALOCA)
--    7 turmas, 96 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_MALOCA';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('FMM901', 'Multi-série - Manhã', v_escola_id, '1', '2026', 'matutino', 35, true),
    ('F2M901', '2º Ano - Manhã', v_escola_id, '2', '2026', 'matutino', 35, false),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35, false),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35, false),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35, false),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_fmm901 UUID;
  v_turma_f2m901 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_MALOCA';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 18 alunos
  v_result := fn_upsert_aluno_2026_v2('HADASSA BRITO DA SILVA', v_escola_id, v_turma_iump01, 'CRE', '2022-09-08', '10493430261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEREMIAS DA SILVA FERREIRA', v_escola_id, v_turma_iump01, 'CRE', '2022-12-19', '10614446279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAB DA SILVA CORDEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2021-07-07', '09834918283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÁS DA SILVA CORDEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2021-07-07', '09834914296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMMILLY LORRANY CORDEIRO CASTRO', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-27', '10496038265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLLY DA SILVA DE SOUZA', v_escola_id, v_turma_iump01, 'PRE1', '2021-09-10', '10814428240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAYLOR AMARAL DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-20', '10330572237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLENILSON DOS SANTOS SOUZAI', v_escola_id, v_turma_iump01, 'PRE1', '2021-03-04', '09710053205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DERICK NOAH SILVA DA COSTAI', v_escola_id, v_turma_iump01, 'PRE1', '2020-12-10', '09640218200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTEFANI SILVA E SILVAI', v_escola_id, v_turma_iump01, 'PRE1', '2020-10-14', '09579287260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('INGRYD MAYARA CORDEIRO DA SILVAI', v_escola_id, v_turma_iump01, 'PRE1', '2020-07-27', '09353964202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOABE TEIXEIRA DA SILVA', v_escola_id, v_turma_iump01, 'PRE2', '2020-06-09', '09301091208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIANA DA SILVA E SILVAI', v_escola_id, v_turma_iump01, 'PRE1', '2020-05-15', '09366078230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA GABRIELLY CORDEIRO CASTRO', v_escola_id, v_turma_iump01, 'PRE2', '2020-11-17', '09484968279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY REIS CORDEIROI', v_escola_id, v_turma_iump01, 'PRE1', '2021-03-29', '10337338221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NEEMIAS MICAEL RODRIGUES DA SILVAI', v_escola_id, v_turma_iump01, 'PRE1', '2020-08-22', '09707502266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIHANNA DA SILVA CORDEIROI', v_escola_id, v_turma_iump01, 'PRE1', '2020-06-06', '09309869208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SELMA SOFIA DO CARMO DE SOUZAI', v_escola_id, v_turma_iump01, 'PRE1', '2020-04-10', '09435094244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM901) - 11 alunos
  v_result := fn_upsert_aluno_2026_v2('ALICIA ELOÁ SANTOS DA SILVA', v_escola_id, v_turma_fmm901, '1', '2019-05-03', '08339373242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA MARIA SILVA E SILVA', v_escola_id, v_turma_fmm901, '1', '2019-06-15', '08442028277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ICARO DA COSTA DA SILVA', v_escola_id, v_turma_fmm901, '1', '2019-04-18', '08646025292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISADORA REIS MARTINS', v_escola_id, v_turma_fmm901, '1', '2019-04-21', '09088872210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA LUIZA RAMOS CORDEIRO', v_escola_id, v_turma_fmm901, '3', '2017-07-24', '10118200216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELY KAUANY DE SOUZA DA SILVA', v_escola_id, v_turma_fmm901, '3', '2018-01-20', '07417035213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOEL DA SILVA MONFREDO', v_escola_id, v_turma_fmm901, '3', '2017-08-23', '07952974246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KETHELLEN DA SILVA BELÉM', v_escola_id, v_turma_fmm901, '3', '2017-05-13', '09108569231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEVI DA SILVA CORDEIRO', v_escola_id, v_turma_fmm901, '3', '2017-08-25', '10217056245');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LIZ REBECA BATISTA DA SILVA', v_escola_id, v_turma_fmm901, '3', '2018-03-06', '07099587226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLIAM RODRIGUES DE OLIVEIRA', v_escola_id, v_turma_fmm901, '3', '2016-06-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 2º Ano - Manhã (F2M901) - 11 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA BEATRIZ RAMOS CORDEIRO', v_escola_id, v_turma_f2m901, '2', '2019-01-10', '08192554244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS SOUZA DA COSTA', v_escola_id, v_turma_f2m901, '2', '2018-01-07', '11088992269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMANUEL DE SOUZA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-10-17', '07815281273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GRAZIELLY CORDEIRO CASTRO', v_escola_id, v_turma_f2m901, '2', '2018-04-19', '07641356273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IAGO GABRIEL DA S ILVA MONTEIRO', v_escola_id, v_turma_f2m901, '2', '2019-02-22', '08150390260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATAS FELIPE LIMA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-05-10', '07472947202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÂO NICOLAS DA CONCEIÇÂO SILVA', v_escola_id, v_turma_f2m901, '2', '2019-02-21', '08256692278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JONATA S DA SILVA CORDEIRO', v_escola_id, v_turma_f2m901, '2', '2018-12-22', '08197696225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANOEL JÚNIOR SANTOS SOUZA', v_escola_id, v_turma_f2m901, '2', '2018-06-09', '09310302267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAURICIO DAYON DA SILVA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-08-14', '07695249238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PIETRA SOPHIA FURTADO RAMOS', v_escola_id, v_turma_f2m901, '2', '2018-10-02', '07649474275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA VITÓRIA DA SILVA LIMA', v_escola_id, v_turma_f6t901, '6', '2014-09-18', '08981734202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BIANCA DA SILVA TRINDADE', v_escola_id, v_turma_f6t901, '6', '2015-10-25', '05721632232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDILENA DOS SANTOS MACHADO', v_escola_id, v_turma_f6t901, '6', '2014-04-27', '09777863233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDO DA SILVA DE SOUZA', v_escola_id, v_turma_f6t901, '6', '2015-02-23', '08906763212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('INGRID DA SILVA DA COSTA', v_escola_id, v_turma_f6t901, '6', '2014-12-23', '09112558265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY VIT ÓRIA RODRIGUES DOS SANTOS RES', v_escola_id, v_turma_f6t901, '6', '2014-12-30', '09022985261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEONAN DA SILVA PINHEIRO', v_escola_id, v_turma_f6t901, '6', '2014-04-23', '09011146263');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUDMILA ESTEFANY RODRIGUES DE OLIVEIRA', v_escola_id, v_turma_f6t901, '6', '2013-08-30', '05631023229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO HENRIQUE DA SILVA DOS SANTOS V', v_escola_id, v_turma_f6t901, '6', '2015-01-04', '09050181252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO PAULO DA SILVA E SILVA', v_escola_id, v_turma_f6t901, '6', '2013-10-28', '08823069289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAEMILI DOS SANTOS RAMOS', v_escola_id, v_turma_f6t901, '6', '2013-10-24', '08846371232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VICTOR COUTIN HO SILVA', v_escola_id, v_turma_f6t901, '6', '2013-02-09', '10230104255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YAGO DA COSTA ALVES', v_escola_id, v_turma_f6t901, '6', '2015-02-16', '09103720209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('ALIANE DA SILVA DA SILVA', v_escola_id, v_turma_f7t901, '7', '2014-02-06', '08933804283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDREI DA SILVA DE SOUZA', v_escola_id, v_turma_f7t901, '7', '2013-02-14', '08843703218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNY GABRIELE D A SILVA DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2012-05-25', '09050148204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNO COUTINHO DA SILVA', v_escola_id, v_turma_f7t901, '7', '2010-04-07', '11030199299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAUANE VICTÓRIA LIMA DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2014-03-11', '08986166208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHEMISSON DA SILVA E SILVA', v_escola_id, v_turma_f7t901, '7', '2013-12-12', '09039944296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOYCI KETELLEN DA SILVA GONÇALVES', v_escola_id, v_turma_f7t901, '7', '2011-11-14', '11455410209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KALEBE DOS SANTOS DA SILVA', v_escola_id, v_turma_f7t901, '7', '2015-05-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LILIA LORRANA DOS SANTOS DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2014-03-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANOEL LUIZ DE SOUZ A MORAES', v_escola_id, v_turma_f7t901, '7', '2012-12-23', '09005254289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA FERNANDA CORDEIRO DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-06-24', '08973642286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAUL NICOLAS DA COSTA DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-09-22', '09030195231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 22 alunos
  v_result := fn_upsert_aluno_2026_v2('ALERRANDRO NICODEMOS CASTRO DA SILVA', v_escola_id, v_turma_f8t901, '8', '2012-09-12', '08855578243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AMANDA KAYLLA DA SILVA DA SILVA', v_escola_id, v_turma_f8t901, '8', '2012-04-03', '09066480254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA ALEXIA DA SILVA TAVARES', v_escola_id, v_turma_f8t901, '8', '2013-02-20', '08987518299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS OTÁVIO COSTA DA SILVA', v_escola_id, v_turma_f8t901, '8', '2012-08-14', '09022845257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAUÊ OTAVIO CAMPOS SOUZA', v_escola_id, v_turma_f8t901, '8', '2012-06-26', '09080070270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CÉSAR AUGUSTO DE FREITAS DO CARMO', v_escola_id, v_turma_f8t901, '8', '2011-08-19', '09044236202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLARA SOUZA DA SILVA', v_escola_id, v_turma_f8t901, '8', '2011-04-05', '09029038292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVID CORDEIRO D A SILVA', v_escola_id, v_turma_f8t901, '8', '2009-07-03', '09099966288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIESER LIMA DA CONCEIÇÃO', v_escola_id, v_turma_f8t901, '8', '2012-10-28', '05394712247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIZA DOS SANTOS CORREIA', v_escola_id, v_turma_f8t901, '8', '2012-08-22', '08997176242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EZIELDO DOS SANTOS MARTINS', v_escola_id, v_turma_f8t901, '8', '2012-12-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GILMAR DA SILVA MONFREDO', v_escola_id, v_turma_f8t901, '8', '2012-10-13', '07952932241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IORRANY DA SILVA DA COSTA', v_escola_id, v_turma_f8t901, '8', '2013-04-28', '09057547279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JONATA GOMES DA SILVA', v_escola_id, v_turma_f8t901, '8', '2012-05-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KATRINA CORREA DA SILVA', v_escola_id, v_turma_f8t901, '8', '2012-02-20', '08972840203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUNARA DA SILVA DOS SANTOS', v_escola_id, v_turma_f8t901, '8', '2013-04-09', '09005321229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA CLARA DA SILVA E SILVA', v_escola_id, v_turma_f8t901, '8', '2012-09-27', '08822977246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROSINEY SILVA E SILVA', v_escola_id, v_turma_f8t901, '8', '2012-09-18', '04023713210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMARA DE LIMA BEZERRA', v_escola_id, v_turma_f8t901, '8', '2012-04-25', '06386722280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMILA DA SILVA DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2012-04-05', '09108541221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VICTOR DE SOUZA CORDEIRO', v_escola_id, v_turma_f8t901, '8', '2012-04-15', '09044916254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WESLEY HENRIQUE FURTADO RAMOS', v_escola_id, v_turma_f8t901, '8', '2012-11-06', '07649449246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 9 alunos
  v_result := fn_upsert_aluno_2026_v2('BEATRIZ DA SILVA DA TRINDADE', v_escola_id, v_turma_f9t901, '9', '2011-10-18', '09071810232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAUA LIMA DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2020-10-23', '08986133396');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIVIA PUREZA DA SILVA', v_escola_id, v_turma_f9t901, '9', '2012-04-04', '09095156206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEFERSON DA SILVA CASTRO', v_escola_id, v_turma_f9t901, '9', '2011-07-01', '09029088206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIETE SILVA DA SILVA', v_escola_id, v_turma_f9t901, '9', '2010-05-06', '08889453290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO HENRIQUE SANTOS DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-10-14', '04966719283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICHELY DA SILVA DOS REIS', v_escola_id, v_turma_f9t901, '9', '2005-06-30', '09763208270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLI AM SILVA DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-10-10', '08851203296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YARLEY GABRIEL CORDEIRO DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2009-04-13', '08978541283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF MALOCA: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 7. EMEI F NOSSA SENHORA DE LOURDES (codigo: 15560350)
--    17 turmas, 271 alunos
--    COMPLEMENTO: 206 alunos já no seed anterior, inserindo novos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = '15560350';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima)
  VALUES
    ('ICM01', 'Creche - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35),
    ('I1MP01', 'Pré I - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35),
    ('I2TP01', 'Pré II - Tarde', v_escola_id, 'PRE2', '2026', 'vespertino', 35),
    ('F1M901', '1º Ano - Manhã', v_escola_id, '1', '2026', 'matutino', 35),
    ('F1T901', '1º Ano - Tarde', v_escola_id, '1', '2026', 'vespertino', 35),
    ('F2M901', '2º Ano - Manhã', v_escola_id, '2', '2026', 'matutino', 35),
    ('F2T901', '2º Ano - Tarde', v_escola_id, '2', '2026', 'vespertino', 35),
    ('F3M901', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35),
    ('F3T901', '3º Ano - Tarde', v_escola_id, '3', '2026', 'vespertino', 35),
    ('F4T901', '4º Ano - Tarde', v_escola_id, '4', '2026', 'vespertino', 35),
    ('F5M901', '5º Ano - Manhã', v_escola_id, '5', '2026', 'matutino', 35),
    ('F5T901', '5º Ano - Tarde', v_escola_id, '5', '2026', 'vespertino', 35),
    ('F6M901', '6º Ano - Manhã', v_escola_id, '6', '2026', 'matutino', 35),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_icm01 UUID;
  v_turma_i1mp01 UUID;
  v_turma_i2tp01 UUID;
  v_turma_f1m901 UUID;
  v_turma_f1t901 UUID;
  v_turma_f2m901 UUID;
  v_turma_f2t901 UUID;
  v_turma_f3m901 UUID;
  v_turma_f3t901 UUID;
  v_turma_f4t901 UUID;
  v_turma_f5m901 UUID;
  v_turma_f5t901 UUID;
  v_turma_f6m901 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = '15560350';
  SELECT id INTO v_turma_icm01 FROM turmas WHERE codigo = 'ICM01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_i1mp01 FROM turmas WHERE codigo = 'I1MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_i2tp01 FROM turmas WHERE codigo = 'I2TP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1m901 FROM turmas WHERE codigo = 'F1M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1t901 FROM turmas WHERE codigo = 'F1T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2t901 FROM turmas WHERE codigo = 'F2T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3t901 FROM turmas WHERE codigo = 'F3T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f4t901 FROM turmas WHERE codigo = 'F4T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5m901 FROM turmas WHERE codigo = 'F5M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5t901 FROM turmas WHERE codigo = 'F5T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6m901 FROM turmas WHERE codigo = 'F6M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Creche - Manhã (ICM01) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('AURORA MARTINS RAMOS', v_escola_id, v_turma_icm01, 'CRE', '2022-12-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DERIK MICAEL RODRIGUES FREITAS', v_escola_id, v_turma_icm01, 'CRE', '2022-10-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HENRIQUE RODRIGUES CHAVES', v_escola_id, v_turma_icm01, 'CRE', '2022-08-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÍTALO THALISSON SANTANA SOARES', v_escola_id, v_turma_icm01, 'CRE', '2022-07-23', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADISON KAYLLON DINIZ OLIVEIRA', v_escola_id, v_turma_icm01, 'CRE', '2023-02-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSIAS PANTOJA COSTA', v_escola_id, v_turma_icm01, 'CRE', '2022-07-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RYAN PIETRO BRAGA PANTOJA', v_escola_id, v_turma_icm01, 'CRE', '2022-08-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM DE SOUSA TEIXEIRA', v_escola_id, v_turma_icm01, 'CRE', '2023-01-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Pré I - Manhã (I1MP01) - 17 alunos
  v_result := fn_upsert_aluno_2026_v2('AYLA SABRINA NOGUEIRA DA SILVA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-04-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLLA GABRIELLY TAVARES MENDES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-09-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BENJAMIM COSTA CARDOSO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-06-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARMO KAYRO ALMEIDA SOUSA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOISA TAVARES GOMES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-07-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FIRMINO MATHIAS TEIXEIRA MARTINS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATA BALIEIRO VEIGA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-15', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ HEITOR CARDOSO TAVARES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUAN FELIPE TAVARES BORGES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-06-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEVILLY KAMILLY FERREIRA COSTA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-23', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEVILY ELOÁ GONÇALVES DE MELO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCELA FERREIRA FARIAS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA HELOÍSA FERREIRA SANTOS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIO DELSON GONÇALVES FERREIRA NETO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-09-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYCON VINICIUS MORAES FERREIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-15', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIGUEL ARTHUR DA SILVA DOS SANTOS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-19', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RHAYLA VITÓRIA CAMPOS MACÊDO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-07-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Pré II - Tarde (I2TP01) - 17 alunos
  v_result := fn_upsert_aluno_2026_v2('ARTHUR GABRIEL FARIAS FERREIRA', v_escola_id, v_turma_i2tp01, 'PRE2', '2021-02-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR VINÍCIUS FERREIRA PANTOJA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-07-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLA EMANUELY FERREIRA E FERREIRA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-01-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLA MIKAELY CAMPOS DA SILVA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-12-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DARLAN MARQUES DA ROCHA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-04-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI PANTOJA DE MELO', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-05-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DIANA LEAL BARBOSA', v_escola_id, v_turma_i2tp01, 'PRE2', '2021-03-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DYUILLESON PANTOJA E SILVA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-10-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY HADASSA MARQUES ESTUMANO', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-06-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESEQUIAS DE MELO DO ESPIRITO SANTOS', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-04-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELYN MARIA DE SENA PEREIRA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-07-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORENZO PAIXÃO SOUZA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-04-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS GABRIEL GOMES RAMOS', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-07-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA ALICE DA SILVA LOBATO', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-06-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MELINDA RAMAIÃNA G. PANTOJA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-05-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NOAH MATHEUS GUERREIRO FERREIRA', v_escola_id, v_turma_i2tp01, 'PRE2', '2021-01-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RODRIGO VIEIRA DA ROCHA', v_escola_id, v_turma_i2tp01, 'PRE2', '2020-06-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 1º Ano - Manhã (F1M901) - 15 alunos
  v_result := fn_upsert_aluno_2026_v2('ALESSANDRO MARQUES MORAES', v_escola_id, v_turma_f1m901, '1', '2019-04-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANTHONY CAUÊ SERRÃO DO NASCIMENTO', v_escola_id, v_turma_f1m901, '1', '2020-02-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DHEMILLY ALEXANDRA DA SILVA PANTOJA', v_escola_id, v_turma_f1m901, '1', '2019-07-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTER CALDAS DOS SANTOS', v_escola_id, v_turma_f1m901, '1', '2019-11-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHULLYA TAISA RODRIGUES GOMES', v_escola_id, v_turma_f1m901, '1', '2019-09-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAYKE GABRIEL DE SENA FERNANDES', v_escola_id, v_turma_f1m901, '1', '2019-09-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA HELOYSA GUERREIRO MACHADO', v_escola_id, v_turma_f1m901, '1', '2019-06-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARLON BENJAMIM MELO RAMOS', v_escola_id, v_turma_f1m901, '1', '2020-03-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYLLA RAFAELLY LEITE DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-09-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MICHEL JUNIOR BRABO DE SOUZA', v_escola_id, v_turma_f1m901, '1', '2020-01-15', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOISÉS TAVARES DE SANTANA', v_escola_id, v_turma_f1m901, '1', '2020-03-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAOLA DANIELA BRABO LIMA', v_escola_id, v_turma_f1m901, '1', '2019-05-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SULAMITA DOMINGAS DA SILVA PROGENIO', v_escola_id, v_turma_f1m901, '1', '2019-08-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WANNE LUCAS DINIZ', v_escola_id, v_turma_f1m901, '1', '2019-10-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WENDERSON SAMUEL SENA DOS SANTOS', v_escola_id, v_turma_f1m901, '1', '2019-07-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 1º Ano - Tarde (F1T901) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('ÁGATHA MAITÊ BRANQUINHO TAVARES', v_escola_id, v_turma_f1t901, '1', '2019-04-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AMARILDO SERRÃO MACÊDO', v_escola_id, v_turma_f1t901, '1', '2019-11-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR DIENDREW DA SILVA DA COSTA', v_escola_id, v_turma_f1t901, '1', '2019-09-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DYWLLESON PANTOJA E SILVA', v_escola_id, v_turma_f1t901, '1', '2019-04-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTHER SOUSA DA SILVA', v_escola_id, v_turma_f1t901, '1', '2019-09-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISABELLA PIETRA DE ARAÚJO SERRÃO', v_escola_id, v_turma_f1t901, '1', '2020-01-21', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO GUILHERME GOMES BATISTA', v_escola_id, v_turma_f1t901, '1', '2019-09-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KATRINY GABRIELLA GOMES MPORAES', v_escola_id, v_turma_f1t901, '1', '2019-11-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUAN MIKAEL FERREIRA MELO', v_escola_id, v_turma_f1t901, '1', '2019-05-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELLA MORAES DE MOARES', v_escola_id, v_turma_f1t901, '1', '2019-10-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCELLY SILVA DE MIRANDA', v_escola_id, v_turma_f1t901, '1', '2019-03-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NÍCOLAS PIERRE DA COSTA FURTADO', v_escola_id, v_turma_f1t901, '1', '2019-08-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NINA IASMIM CORDEIRO DOS SANTOS', v_escola_id, v_turma_f1t901, '1', '2020-01-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUAN FELIPE DA COSTA CARVALHO', v_escola_id, v_turma_f1t901, '1', '2019-10-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SUANY DOS SANTOS DA SILVA', v_escola_id, v_turma_f1t901, '1', '2019-12-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WARLESSON MATHEUS AMARAL CARDOSO', v_escola_id, v_turma_f1t901, '1', '2020-02-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 2º Ano - Manhã (F2M901) - 10 alunos
  v_result := fn_upsert_aluno_2026_v2('ANTÔNIO NETO PANTOJA DE MELO', v_escola_id, v_turma_f2m901, '2', '2018-06-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DIANA VITÓRIA BALIEIRO VEIGA', v_escola_id, v_turma_f2m901, '2', '2018-11-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADSON PANTOJA DOS SANTOS', v_escola_id, v_turma_f2m901, '2', '2018-04-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ LEITE VIEIRA', v_escola_id, v_turma_f2m901, '2', '2018-06-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY HADASSA GONÇALVES DE MELO', v_escola_id, v_turma_f2m901, '2', '2018-12-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEANDRO WILKER TAVARES GONÇALVES', v_escola_id, v_turma_f2m901, '2', '2018-04-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATHEUS MELO RAMOS', v_escola_id, v_turma_f2m901, '2', '2018-08-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAWENNY NABELYN TEIXEIRA BARRETO', v_escola_id, v_turma_f2m901, '2', '2019-01-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIAN DE ARAÚJHO DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-12-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SANDRO NOGUEIRA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-11-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 2º Ano - Tarde (F2T901) - 15 alunos
  v_result := fn_upsert_aluno_2026_v2('AGATHA HADASSA PAIXÃO AMARAL', v_escola_id, v_turma_f2t901, '2', '2018-05-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSON JESUS DOS SANTOS BARBOSA', v_escola_id, v_turma_f2t901, '2', '2019-03-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA THAYNÁ BARBOSA DE MORAES', v_escola_id, v_turma_f2t901, '2', '2018-04-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLA HADASSA E SANTOS COSTA', v_escola_id, v_turma_f2t901, '2', '2018-08-23', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DARLEY LEAL BARBOSA', v_escola_id, v_turma_f2t901, '2', '2019-01-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO GABRIEL SERRÃO DINIZ', v_escola_id, v_turma_f2t901, '2', '2018-12-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EYSHYLA FERNANDA DE MELO DO ESPIRITO SANTO', v_escola_id, v_turma_f2t901, '2', '2018-10-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELLEM SOPHIA MARTINS DO CARMO', v_escola_id, v_turma_f2t901, '2', '2019-02-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HUDSON JESUS BAHIA DA SILVA', v_escola_id, v_turma_f2t901, '2', '2018-10-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KENNEDY IURY FERREIRA COSTA', v_escola_id, v_turma_f2t901, '2', '2018-11-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KERVISON GOMES DE SOUZA', v_escola_id, v_turma_f2t901, '2', '2019-01-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NIKLAUS CARDOSO MATOS', v_escola_id, v_turma_f2t901, '2', '2018-12-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENA JUDITI SILVA DE SOUZA', v_escola_id, v_turma_f2t901, '2', '2018-11-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM SOFIA MARTINS MACIEL', v_escola_id, v_turma_f2t901, '2', '2018-11-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YCARO NETO CARVALHO SOARES', v_escola_id, v_turma_f2t901, '2', '2018-11-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M901) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('BEATRIZ DA SILVA SERRÃO', v_escola_id, v_turma_f3m901, '3', '2018-02-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CINTTIA WANESSA SENA DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2016-07-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DINEI DE ALFAIA BARBOSA', v_escola_id, v_turma_f3m901, '3', '2014-06-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMANUELA VITÓRIA TAVARES PANTOJA', v_escola_id, v_turma_f3m901, '3', '2018-03-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO VICTOR REIS BARBOSA', v_escola_id, v_turma_f3m901, '3', '2017-04-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ HENRIQUE VIEIRA AMARAL', v_escola_id, v_turma_f3m901, '3', '2016-12-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA VITÓRIA AMARAL TRINDADE', v_escola_id, v_turma_f3m901, '3', '2017-10-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MÔNIQUE GABRIELI BARBOSA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2018-03-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('STEFANNY MELO PANTOJA', v_escola_id, v_turma_f3m901, '3', '2017-09-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VICTOR PANTOJA PIRES', v_escola_id, v_turma_f3m901, '3', '2018-01-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALDIR WALLACE SENA DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2017-10-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILIAN RENAN DA SILVA PROGÊNIO', v_escola_id, v_turma_f3m901, '3', '2018-01-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Tarde (F3T901) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('ADONIAS LEAL BARBOSA', v_escola_id, v_turma_f3t901, '3', '2017-09-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDREW SILAS GOMES DA SILVA', v_escola_id, v_turma_f3t901, '3', '2018-01-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEANDRA VIEIRA PAIXÃO', v_escola_id, v_turma_f3t901, '3', '2017-08-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEISIANE RODRIGUES SENA', v_escola_id, v_turma_f3t901, '3', '2017-06-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO GONÇALVES DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-06-21', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JESSICA SUELEM LOBATO FERREIRA', v_escola_id, v_turma_f3t901, '3', '2017-04-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHULLYA VITÓRIA GUERREIRO FERREIRA', v_escola_id, v_turma_f3t901, '3', '2017-05-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSILEI GOMES DAMACENA', v_escola_id, v_turma_f3t901, '3', '2012-09-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEVI SILVA DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-10-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA EDUARDA DINIZ MORAES', v_escola_id, v_turma_f3t901, '3', '2016-11-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RHANDRA AYTA CORREA FERREIRA', v_escola_id, v_turma_f3t901, '3', '2017-08-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RODRIGO DE ARAUJO DA SILVA', v_escola_id, v_turma_f3t901, '3', '2015-03-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RONALD DE SOUZA DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-06-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAYLAN RANGEL DE ARAUJO DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-07-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALACE GONÇALVES DE MELO', v_escola_id, v_turma_f3t901, '3', '2016-10-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WYLGNNER ISNAEL BRAGA PANTOJA', v_escola_id, v_turma_f3t901, '3', '2017-12-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 4º Ano - Tarde (F4T901) - 21 alunos
  v_result := fn_upsert_aluno_2026_v2('AGHATA SOPHIA DA COSTA MORAES', v_escola_id, v_turma_f4t901, '4', '2016-01-15', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSA ESTELLY DOS SANTOS BARBOSA', v_escola_id, v_turma_f4t901, '4', '2016-10-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA FERNANDA DE MELO DO ESPIRITO SANTO', v_escola_id, v_turma_f4t901, '4', '2017-02-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DARLAN BARBOSA CABRAL', v_escola_id, v_turma_f4t901, '4', '2016-05-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI ARTHUR COSTA MENDES', v_escola_id, v_turma_f4t901, '4', '2017-01-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DELSON DE ALFAIA BARBOSA', v_escola_id, v_turma_f4t901, '4', '2011-09-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISA VITÓRIA MARQUES ESTUMANO', v_escola_id, v_turma_f4t901, '4', '2016-07-15', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY GABRIELE DE ARA ÚJO DA SILVA', v_escola_id, v_turma_f4t901, '4', '2013-09-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HEITOR RENAN DA SILVA PROGENIO', v_escola_id, v_turma_f4t901, '4', '2016-06-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IAGO GABRIEL CORDEIRO DOS SANTOS', v_escola_id, v_turma_f4t901, '4', '2017-02-23', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO VITOR DO NASCIMENTO FREITAS', v_escola_id, v_turma_f4t901, '4', '2016-07-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAYLA E SANTOS COSTA', v_escola_id, v_turma_f4t901, '4', '2015-07-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARISSA MIKAELLY FERREIRA DA SILVA', v_escola_id, v_turma_f4t901, '4', '2016-08-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS WENDRYL TRINDADE GOMES', v_escola_id, v_turma_f4t901, '4', '2015-09-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCELO HENRIQUE LOBATO NASCIMENTO', v_escola_id, v_turma_f4t901, '4', '2014-11-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIGUEL CARDOSO MATOS', v_escola_id, v_turma_f4t901, '4', '2016-09-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAUANY LEÃO SILVA', v_escola_id, v_turma_f4t901, '4', '2016-07-15', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYANNE SOPHIA VALES PANTOJA', v_escola_id, v_turma_f4t901, '4', '2015-07-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('REANDRO BELÉM TRINDADE', v_escola_id, v_turma_f4t901, '4', '2016-05-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROBERT LUCAS RAMOS MACHADO', v_escola_id, v_turma_f4t901, '4', '2016-04-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WENDELL LEVYD DE OLIVEIRA RODRIGUES', v_escola_id, v_turma_f4t901, '4', '2016-10-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Manhã (F5M901) - 14 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA BEATRIZ OLIVEIRA PANTOJA', v_escola_id, v_turma_f5m901, '5', '2015-08-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA MARIA OLIVEIRA MARQUES', v_escola_id, v_turma_f5m901, '5', '2012-12-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLA MARIA AMARAL SANTANA', v_escola_id, v_turma_f5m901, '5', '2015-08-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUIZ LEITE VIEIRA', v_escola_id, v_turma_f5m901, '5', '2015-08-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDNELSON DA SILVA COSTA', v_escola_id, v_turma_f5m901, '5', '2016-01-23', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENDERSON LEITE VIEIRA', v_escola_id, v_turma_f5m901, '5', '2009-12-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADY LAYANA SILVA PANTOJA', v_escola_id, v_turma_f5m901, '5', '2015-08-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUANY COSTA DA SILVA', v_escola_id, v_turma_f5m901, '5', '2015-06-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELLY SERRÃO FERREIRA', v_escola_id, v_turma_f5m901, '5', '2015-08-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA EDUARDA LEITE VIEIRA', v_escola_id, v_turma_f5m901, '5', '2011-09-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NATALIE PAULINE SERRÃO BARBOSA', v_escola_id, v_turma_f5m901, '5', '2015-11-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WANDERSON SILAS SENA DOS SANTOS', v_escola_id, v_turma_f5m901, '5', '2014-09-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WENDERSON GONÇALVES CASTRO', v_escola_id, v_turma_f5m901, '5', '2015-06-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIN RODRIGUES BARBOSA', v_escola_id, v_turma_f5m901, '5', '2015-06-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Tarde (F5T901) - 18 alunos
  v_result := fn_upsert_aluno_2026_v2('CHRISTIAN WILLIAN FERREIRA COSTA', v_escola_id, v_turma_f5t901, '5', '2015-11-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÍTALO MARQUES DA ROCHA', v_escola_id, v_turma_f5t901, '5', '2015-05-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KELVIN WILLIAN LOBATO SILVA', v_escola_id, v_turma_f5t901, '5', '2014-08-31', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KELVIS KAIK SERRÃO DE ARAUJO', v_escola_id, v_turma_f5t901, '5', '2014-03-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA YANDRA TEIXEIRA MACIEL', v_escola_id, v_turma_f5t901, '5', '2015-06-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA YLANA TEIXEIRA MACIEL', v_escola_id, v_turma_f5t901, '5', '2015-06-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIANA DOS SANTOS GONÇALVES', v_escola_id, v_turma_f5t901, '5', '2015-12-19', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYKO JUNIOR MORAES RIBEIRO', v_escola_id, v_turma_f5t901, '5', '2015-02-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIQUÉIAS NAUAN DE SANTANA MIRANDA', v_escola_id, v_turma_f5t901, '5', '2015-05-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAUANDRY LEÃO SILVA', v_escola_id, v_turma_f5t901, '5', '2014-09-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLY FABIANE FERREIRA NOGUEIRA', v_escola_id, v_turma_f5t901, '5', '2014-11-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYANE ALMEIDA DA COSTA', v_escola_id, v_turma_f5t901, '5', '2015-08-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('REBECA DE SOUZA SANTOS', v_escola_id, v_turma_f5t901, '5', '2015-08-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIELLY SOFIA DA SILVA LOBATO', v_escola_id, v_turma_f5t901, '5', '2015-05-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RODRIGO LORENZO NOGUEIRADA SILVA 05/02 /2016', v_escola_id, v_turma_f5t901, '5', '2025-12-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SANDIANE MARINHO DUARTE', v_escola_id, v_turma_f5t901, '5', '2015-08-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VINÍCIUS TAVARES PANTOJA', v_escola_id, v_turma_f5t901, '5', '2015-12-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM DINIZ MONTEIRO', v_escola_id, v_turma_f5t901, '5', '2016-01-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Manhã (F6M901) - 14 alunos
  v_result := fn_upsert_aluno_2026_v2('DEÍFILA BELINDA DO NASCIMENTO SIQUEIRA', v_escola_id, v_turma_f6m901, '6', '2015-05-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEIVID MOREIRA DOS SANTOS', v_escola_id, v_turma_f6m901, '6', '2014-11-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY JULIANNE RODRIGUES SANTANA', v_escola_id, v_turma_f6m901, '6', '2014-07-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAURA MIRANDA DOS SANTOS', v_escola_id, v_turma_f6m901, '6', '2014-10-15', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUANY KETENE RODRIGUES CHAVES', v_escola_id, v_turma_f6m901, '6', '2015-03-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LYLA MARIA DE MATOS TEIXEIRA', v_escola_id, v_turma_f6m901, '6', '2015-03-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYZA DO VALES SOARES', v_escola_id, v_turma_f6m901, '6', '2014-10-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MESSIAS LEVI DA CRUZ DOS SANTOS', v_escola_id, v_turma_f6m901, '6', '2012-05-31', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('REBECA VITÓRIA SOARES DA SILVA', v_escola_id, v_turma_f6m901, '6', '2014-12-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RONNYEL MARQUES ESTUMANO', v_escola_id, v_turma_f6m901, '6', '2014-01-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROZIVALDO VIEIRA ROCHA', v_escola_id, v_turma_f6m901, '6', '2014-04-24', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUANDSON FERREIRA MORAES', v_escola_id, v_turma_f6m901, '6', '2015-02-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAFIRA RILENE TAVARES DE SANTANA', v_escola_id, v_turma_f6m901, '6', '2015-04-25', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TIAGO LORENZO RAMOS DOS SANTOS', v_escola_id, v_turma_f6m901, '6', '2014-12-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 17 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIEL DA SILVA CAMPOS', v_escola_id, v_turma_f6t901, '6', '2014-08-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALESSANDRO DE SOUZA PANTOJA', v_escola_id, v_turma_f6t901, '6', '2014-05-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDREI VICTOR PIMENTEL MAIA', v_escola_id, v_turma_f6t901, '6', '2014-12-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRYA SOFHYA GOMES DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-05-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIEL FERREIRA DE MORAES', v_escola_id, v_turma_f6t901, '6', '2011-12-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DHEMILLY MONFREDO PANTOJA', v_escola_id, v_turma_f6t901, '6', '2012-12-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY DA COSTA DE LIMA', v_escola_id, v_turma_f6t901, '6', '2015-02-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL BAHIA DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-09-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL DOS SANTOS DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-03-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATA DOS SANTOS MACIEL', v_escola_id, v_turma_f6t901, '6', '2014-11-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARISSA TAVARES SILVA', v_escola_id, v_turma_f6t901, '6', '2014-03-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS DA COSTA SERRÃO', v_escola_id, v_turma_f6t901, '6', '2014-09-21', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LURIANE CARVALHO SOUTO', v_escola_id, v_turma_f6t901, '6', '2014-08-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLLE CARVALHO GOMES', v_escola_id, v_turma_f6t901, '6', '2014-02-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULA DAIZIS BARBOSA CABRAL', v_escola_id, v_turma_f6t901, '6', '2014-04-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAQUEL MELO PANTOJA', v_escola_id, v_turma_f6t901, '6', '2012-02-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLIAN FERREIRA FARIAS', v_escola_id, v_turma_f6t901, '6', '2015-02-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 21 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIAN TRINDADE COSTA', v_escola_id, v_turma_f7t901, '7', '2013-03-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANTONY KAWAN CAMPOS FARIAS', v_escola_id, v_turma_f7t901, '7', '2013-10-19', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BEATRIZ FERREIRA BELÉM', v_escola_id, v_turma_f7t901, '7', '2013-07-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DIOGO GONÇALVES DE MELO', v_escola_id, v_turma_f7t901, '7', '2011-04-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDIELSON DOS SANTOS GONÇALVES', v_escola_id, v_turma_f7t901, '7', '2013-10-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EZEQUIEL VIEIRA POÇA', v_escola_id, v_turma_f7t901, '7', '2012-12-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL GONÇALVES DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-01-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HIGOR RAFAEL TEIXEIRA DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2013-09-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEOVANDERSON DA SILVA CAMPOS', v_escola_id, v_turma_f7t901, '7', '2013-02-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JONAS PANTOJA DE JESUS', v_escola_id, v_turma_f7t901, '7', '2010-11-04', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSYKEL LEITÃO GOMES', v_escola_id, v_turma_f7t901, '7', '1997-03-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KALEBE E SANTOS COSTA', v_escola_id, v_turma_f7t901, '7', '2012-02-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAEVERTON TAVARES SILVA', v_escola_id, v_turma_f7t901, '7', '2013-12-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEVI HENRIQUE DA SILVA CARVALHO', v_escola_id, v_turma_f7t901, '7', '2012-03-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIANO TAVARES SILVA', v_escola_id, v_turma_f7t901, '7', '2009-09-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NATALIA DA SILVA SOUZA', v_escola_id, v_turma_f7t901, '7', '2014-02-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLLY MARTINS MONTEIRO', v_escola_id, v_turma_f7t901, '7', '2013-11-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO LUCAS FARIAS BRAGA', v_escola_id, v_turma_f7t901, '7', '2013-09-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAMON BELÉM TRINDADE', v_escola_id, v_turma_f7t901, '7', '2012-07-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMUEL FERREIRA DE MORAES', v_escola_id, v_turma_f7t901, '7', '2011-12-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACY RICHARD RODRIGUES LOBATO', v_escola_id, v_turma_f7t901, '7', '2013-05-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 20 alunos
  v_result := fn_upsert_aluno_2026_v2('ALANA DA COSTA LIMA', v_escola_id, v_turma_f8t901, '8', '2011-11-11', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALANNA KEVELLY DE SANTANA OLIVEIRA', v_escola_id, v_turma_f8t901, '8', '2012-08-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALINE DOS SANTOS GONÇALVES', v_escola_id, v_turma_f8t901, '8', '2009-04-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEISE CORDEIRO FERREIRA', v_escola_id, v_turma_f8t901, '8', '2012-12-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEYSE RIANE DA SILVA LOBATO', v_escola_id, v_turma_f8t901, '8', '2010-12-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDIELSON RODRIGUES SENA', v_escola_id, v_turma_f8t901, '8', '2012-12-28', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELLEN SERRÃO DE MELO', v_escola_id, v_turma_f8t901, '8', '2012-08-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEAN CARLOS DE OLIVEIRA SERRÃO', v_escola_id, v_turma_f8t901, '8', '2010-04-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GLECIANE RODRIGUES SENA', v_escola_id, v_turma_f8t901, '8', '2011-03-23', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISABELE VITÓRIA MARTINS MACIEL', v_escola_id, v_turma_f8t901, '8', '2013-04-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAILANE SERRÃO DE ARAUJO', v_escola_id, v_turma_f8t901, '8', '2011-11-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KELVIN GOMES DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2012-11-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEVILLY GOMES DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2011-02-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LIBNE HUENZIL VEIGA FERREIRA', v_escola_id, v_turma_f8t901, '8', '2011-07-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ OLIVEIRA CARVALHO NETO', v_escola_id, v_turma_f8t901, '8', '2010-05-17', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIANE DOS SANTOS GONÇALVES', v_escola_id, v_turma_f8t901, '8', '2011-06-23', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATHEUS DE MATOS TEIXEIRA', v_escola_id, v_turma_f8t901, '8', '2012-10-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MURILO VINICIUS CARDOSO MELO', v_escola_id, v_turma_f8t901, '8', '2010-08-21', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULINHO DOS SANTOS DA SILVA', v_escola_id, v_turma_f8t901, '8', '2010-10-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROSIQUELME CAMPOS FARIAS', v_escola_id, v_turma_f8t901, '8', '2013-02-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 20 alunos
  v_result := fn_upsert_aluno_2026_v2('ARLEY E SANTOS COSTA 24/03 /2008', v_escola_id, v_turma_f9t901, '9', '2025-12-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BENJAMIN LEVI SILVA DA SILVA 03/08 /2011', v_escola_id, v_turma_f9t901, '9', '2025-12-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIELLY LORENA FERNANDES MARTINS 23/11 /2011', v_escola_id, v_turma_f9t901, '9', '2025-12-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEBORA MENDES MELO', v_escola_id, v_turma_f9t901, '9', '2010-01-09', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY DA SILVA COSTA 03/06 /2011', v_escola_id, v_turma_f9t901, '9', '2026-01-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENDRIA GABRIELI FARIAS DOS SANTOS 22/09 /2011', v_escola_id, v_turma_f9t901, '9', '2026-01-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTELA LIMA COUTINHO 03/12 /2009', v_escola_id, v_turma_f9t901, '9', '2026-01-08', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELI KAUANE DO NASCIMENTO FREITAS 27/07 /2009', v_escola_id, v_turma_f9t901, '9', '2026-03-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('INARA SANTANA NASCIMENTO', v_escola_id, v_turma_f9t901, '9', '2009-10-01', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAEL CAMPOS PANTOJA 14/01 /2012', v_escola_id, v_turma_f9t901, '9', '2026-01-19', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAMIRYANE DA SILVA CAMPOS 16/11 /2007', v_escola_id, v_turma_f9t901, '9', '2025-12-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JARYANE DA SILVA CAMPOS 12/09 /2010', v_escola_id, v_turma_f9t901, '9', '2025-12-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENIFF PINHEIRO E PINHEIRO', v_escola_id, v_turma_f9t901, '9', '2011-10-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENNIFE THAIS DE ARAUJO SERRÃO 08/01 /201 2', v_escola_id, v_turma_f9t901, '9', '2026-01-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEVI DE OLIVEIRA ALFAIA', v_escola_id, v_turma_f9t901, '9', '2009-07-03', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAISA AMARAL PEREIRA 28/10 /201 0', v_escola_id, v_turma_f9t901, '9', '2026-01-14', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCELO MACIEL DA SILVA MAGNO 07/01 /201 1', v_escola_id, v_turma_f9t901, '9', '2026-01-06', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATHEUS FERREIRA COSTA', v_escola_id, v_turma_f9t901, '9', '2011-11-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROBSON ALMEIDA DA COSTA 22/08 /201 1', v_escola_id, v_turma_f9t901, '9', '2025-12-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUAN COSTA MENDES 15/10 /201 0', v_escola_id, v_turma_f9t901, '9', '2025-12-12', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEI F NOSSA SENHORA DE LOURDES: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 8. EMEIF OS INTELIGENTES (codigo: EMEIF_OS_INTELIGENTES)
--    2 turmas, 39 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_OS_INTELIGENTES';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('I1MP01', 'Pré I - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35, false),
    ('FMM901', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_i1mp01 UUID;
  v_turma_fmm901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_OS_INTELIGENTES';
  SELECT id INTO v_turma_i1mp01 FROM turmas WHERE codigo = 'I1MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Pré I - Manhã (I1MP01) - 26 alunos
  v_result := fn_upsert_aluno_2026_v2('ALANA MORAES TEIXEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-09-16', '10070835225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLLA RAFHAELLA DE LIMA OLIVEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-05', '09785665216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BENJAMIN SILVA DA COSTA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-25', '09798172264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BERNARDO LORHAN BANDEIRA DE FREITAS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-09-10', '09993275263');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ERICK LUAN MARINHO MORAES', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-03-28', '10398352283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL VINICIUS MIRANDA BARBOSA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-09-05', '10151626227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIELA AMARAL DO AMARAL', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-21', '09796279231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IARLE LOUAN ANDRADE TAVARES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-05', '10069508274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZABELLY SAFIRA SOUZA DE OLIVEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-23', '10371252237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAIANE TADEU MARTINS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-27', '09845341217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENNYFER MARIA MACHADO MIRANDA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-11-06', '10060470267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAB CATARINO OLIVEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-03-09', '10358365210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO LUCAS DO NASCIMENTO RODRIGUES', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-09', '10085436240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELISON PANTOJA OLIVEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-07-24', '09890385210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KÁSSIO KAUÊ CASTRO LIMA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-03-18', '10461577283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUÂN FERREIRA DE SOUZA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KERLISON KAIKE DA SILV A ANDRADE', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-09', '10581879295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARISSA MANUELA DOS SANTOS DA SILVA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-10', '10256807230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAUANNY CORDEIRO MIRANDA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-30', '10293371288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUNA REBECA NASCIMENTO DA CONCEIÇÃO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-04-30', '09760527251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MÔNICA DA SILVA VILEN A', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-11-23', '10884305201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO GAEL DE SOUZA TEIXEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-01-02', '10151671281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIANDRISON ANDRADE DE LIMA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-02', '10130494208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUAN DE LIMA VALE', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-02-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMUEL DE OLIVEIRA MAIA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-02-19', '10510687202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YAGO GABRIEL MARTINS NASCIMENTO', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-01-29', '10256823278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM901) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('ERICK DA SILVA VILENA', v_escola_id, v_turma_fmm901, 'CRE', '2022-02-15', '10757276261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHEMILLY PATACHO DA SILVA', v_escola_id, v_turma_fmm901, 'CRE', '2022-04-10', '10341529206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHON FÁBIO VILHENA RODRIGUES', v_escola_id, v_turma_fmm901, 'CRE', '2022-05-15', '10371340284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIELE BRI TO DA SILVA', v_escola_id, v_turma_fmm901, 'CRE', '2003-03-11', '10850780276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIELSON VALE BARBOSA', v_escola_id, v_turma_fmm901, 'PRE1', '2022-03-12', '10496871242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLARICE DA COSTA PATACHO', v_escola_id, v_turma_fmm901, 'PRE1', '2021-04-12', '10226854221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO GABRIEL DA SILVA VILENA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-09-22', '10360515282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EZEDEQUIAS F ERREIRA DOS SANTOS', v_escola_id, v_turma_fmm901, 'PRE1', '2021-10-28', '10047993227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SANDRIÇA RODRIGUES DA SILVA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-12-30', '10398814244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FÁBIO JÚNIOR VILHENA RODRIGUES', v_escola_id, v_turma_fmm901, 'PRE2', '2020-09-04', '10288998235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY GABRIELLY DA SILVA LIMA', v_escola_id, v_turma_fmm901, 'PRE2', '2021-03-23', '09771820290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NEDIEL DA SILVA VALES', v_escola_id, v_turma_fmm901, 'PRE2', '2020-09-21', '09466741241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELISSON PEREIRA RODRIGUES', v_escola_id, v_turma_fmm901, 'PRE2', '2020-08-21', '09404331252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF OS INTELIGENTES: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 9. EMEIF PADRE SILVERIO (codigo: EMEIF_PADRE_SILVÉRIO)
--    12 turmas, 158 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_PADRE_SILVÉRIO';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima)
  VALUES
    ('ICM01', 'Creche - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35),
    ('I1MP01', 'Pré I - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35),
    ('I2MP01', 'Pré II - Manhã', v_escola_id, 'PRE2', '2026', 'matutino', 35),
    ('F1M901', '1º Ano - Manhã', v_escola_id, '1', '2026', 'matutino', 35),
    ('F2M901', '2º Ano - Manhã', v_escola_id, '2', '2026', 'matutino', 35),
    ('F3M901', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35),
    ('F4M901', '4º Ano - Manhã', v_escola_id, '4', '2026', 'matutino', 35),
    ('F5M901', '5º Ano - Manhã', v_escola_id, '5', '2026', 'matutino', 35),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_icm01 UUID;
  v_turma_i1mp01 UUID;
  v_turma_i2mp01 UUID;
  v_turma_f1m901 UUID;
  v_turma_f2m901 UUID;
  v_turma_f3m901 UUID;
  v_turma_f4m901 UUID;
  v_turma_f5m901 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_PADRE_SILVÉRIO';
  SELECT id INTO v_turma_icm01 FROM turmas WHERE codigo = 'ICM01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_i1mp01 FROM turmas WHERE codigo = 'I1MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_i2mp01 FROM turmas WHERE codigo = 'I2MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1m901 FROM turmas WHERE codigo = 'F1M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f4m901 FROM turmas WHERE codigo = 'F4M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5m901 FROM turmas WHERE codigo = 'F5M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Creche - Manhã (ICM01) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('ADONIAS DA SILVA GOMES', v_escola_id, v_turma_icm01, 'CRE', '2022-09-26', '10550279202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALAFF HENRIQUE DA COSTA LOPES', v_escola_id, v_turma_icm01, 'CRE', '2022-07-22', '10460075217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR YAN DE OLIVEIRA CARVALHO', v_escola_id, v_turma_icm01, 'CRE', '2023-01-18', '10669478210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CHAYANE PIETRA GOMES DOS SANTOS', v_escola_id, v_turma_icm01, 'CRE', '2022-09-23', '10553654276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JÚLIA MELI NA RODRIGUES DA SILVA', v_escola_id, v_turma_icm01, 'CRE', '2022-12-31', '10736234203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAROLINHE PANTOJA DOS SANTOS', v_escola_id, v_turma_icm01, 'CRE', '2023-01-08', '10846799227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEWINY VITÓRIA BRITO DE ALMEIDA', v_escola_id, v_turma_icm01, 'CRE', '2022-09-28', '10516383213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LESSANDRO FERREIRA VIEIRA', v_escola_id, v_turma_icm01, 'CRE', '2022-11-30', '10681024208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIS YURI LIMA DE OLIVEIRA', v_escola_id, v_turma_icm01, 'CRE', '2022-08-23', '10486980251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOABE DA COSTA DE SOUZA', v_escola_id, v_turma_icm01, 'CRE', '2023-03-15', '10745822258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICHARLISON DE LIMA DE SOUZA', v_escola_id, v_turma_icm01, 'CRE', '2022-11-15', '10978544269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SALATIEL PANTOJA DE LIMA', v_escola_id, v_turma_icm01, 'CRE', '2022-11-16', '10708334288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SOPHIA NOVAES FREITAS', v_escola_id, v_turma_icm01, 'CRE', '2022-08-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THÉO LIMA GOMES', v_escola_id, v_turma_icm01, 'CRE', '2023-03-21', '10724175296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WAILLA GABRIELLA GOMES VALES', v_escola_id, v_turma_icm01, 'CRE', '2022-06-29', '10459997254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WANNY SERRÃO DA SILVA', v_escola_id, v_turma_icm01, 'CRE', '2023-01-17', '10669478210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Pré I - Manhã (I1MP01) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('AGHATA TAMARA LIMA DA SILVA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-08', '10288983203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIÉZER BRITO PANTOJA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-08-25', '10256797250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELORRANY DA CONCEIÇÃO VIEIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-02-13', '10492091250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO GABRIEL LIMA E LIMA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-12-06', '10148494200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÉRICK BENJAMIM DE FREITAS SERRÃO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-01', '10131200275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELLEN LUIZA DE FREITAS DO NASCIMENTO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-05-30', '09773375293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHEME SON DIAS MARTINS', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-06-24', '10281264252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHON LUCAS DE MELO LIMA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-06-04', '10019810229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATAS DE SOUZA CONCEIÇÃO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-04-12', '09836827200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MICAELA BIATRIZ TAVARES SERRÃO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-02', '10020458274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIGUEL DE OLIVEIRA MARINHO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-18', '10047991283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO HENRIQUE FARIAS PEREIRA', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-10-29', '10757305202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUANY SOPHIA MACHADO MAGNO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-11-05', '10360146228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('STEFANNY LAIZ VIEIRA SERRÃO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-11-29', '10298964295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAEMYLLY DOS SANTOS DO NASCIMENTO', v_escola_id, v_turma_i1mp01, 'PRE1', '2022-02-14', '10805279237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TÍFANY KATRINNA ANDRADE SERRÃO', v_escola_id, v_turma_i1mp01, 'PRE1', '2021-11-29', '09925798213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Pré II - Manhã (I2MP01) - 21 alunos
  v_result := fn_upsert_aluno_2026_v2('ÁGATA SAFIRA QUEIROZ DA SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-08-10', '09423208240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR MIRANDA DA COSTA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-11-28', '09569451230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNO HENRIQUE OLIVEIRA DE ALMEIDA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-06-02', '09330260217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELENA DO NASCIMENTO DA CONCEIÇÃO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-05-02', '10490188265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÉRICK PIETRO SANTOS ANDRADE', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-06-14', '09613930256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELLY NICOLLY VALES MACHADO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-04-12', '09334307285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FRANCIELMA SERRAO LIMA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-03', '10510705200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIELLY RODRIGUES DE FREITAS', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-24', '09410884217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEAN PAULO DE SOUZA DO NASCIMENTO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-10-01', '09454561235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELOISA VITÓRIA DA COSTA OLIVEIRA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-04', '09408430212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LABELLE DA SILVA BORGES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-05', '09209979202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAURA RHIANNA GOMES DA COSTA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-05-07', '09225710232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEANDRO DO NASCIMENTO DOS SANTOS', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-10-17', '11485587212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MÁRCIO WILLIAN SILVA QUEIROZ', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-06-17', '09355630247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIKAEL Y DA SILVA MACHADO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-03', '10360191282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLAS DA COSTA DE SOUZA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-17', '09435323294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAOLA RAFAELLY BRITO VALES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-06-01', '09613794212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAMILI DA SILVA SO UZA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-16', '09423305288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RLLARY NAUANNE LIMA RODRIGUES', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-13', '09769623229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THIAGO JADSON VIEIRA DA SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-06', '09881518202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THOMAS HENRIQUE RODRIGUES D E ALMEIDA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-26', '09803148281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 1º Ano - Manhã (F1M901) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('ALICE BEZERRA PACHECO', v_escola_id, v_turma_f1m901, '1', '2019-08-08', '08547326243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CHRISTIAN OLIVEIRA SERRÃO', v_escola_id, v_turma_f1m901, '1', '2019-08-27', '08610133281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY LAUANE BARATA GOMES', v_escola_id, v_turma_f1m901, '1', '2019-05-10', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELOISA BEATRIZ DE SOUZA CONCEIÇÃO', v_escola_id, v_turma_f1m901, '1', '2019-08-20', '09591221258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAIANE DA CONCEIÇÃO DE ALMEIDA', v_escola_id, v_turma_f1m901, '1', '2019-10-31', '08824697208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JESUS WENDERSON VIEIRA SERRÃO', v_escola_id, v_turma_f1m901, '1', '2019-04-07', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHULLY GABRIELE SERRÃO VALE', v_escola_id, v_turma_f1m901, '1', '2020-03-10', '09323544212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KÊMILLY KAUANE ALVES OLIVEIRA', v_escola_id, v_turma_f1m901, '1', '2019-12-02', '09108331251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ HENRIQUE FARIAS PEREIRA', v_escola_id, v_turma_f1m901, '1', '2019-12-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAIANDRA RODRIGUES DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-11-14', '09091219238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYLAN MACHADO MAGNO', v_escola_id, v_turma_f1m901, '1', '2019-07-22', '09437494258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAFNI KATRINNY ANDRADE SERRÃO', v_escola_id, v_turma_f1m901, '1', '2019-04-02', '08298929233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VICENTE BRAY OLIVEIRA DA SILVA', v_escola_id, v_turma_f1m901, '1', '2020-03-26', '08610133281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 2º Ano - Manhã (F2M901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('ÁGATA DA COSTA DE SOUZA', v_escola_id, v_turma_f2m901, '2', '2018-05-19', '09391187269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA MARIA DA SILVA COSTA', v_escola_id, v_turma_f2m901, '2', '2018-08-27', '07529704290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIANE DO NASCIMENTO DA CONCEIÇÃO', v_escola_id, v_turma_f2m901, '2', '2018-07-28', '07765146289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JASMINE VIEIRA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-07-24', '09881568226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ OTÁVIO RODRIGUES DA ALMEIDA', v_escola_id, v_turma_f2m901, '2', '2018-09-14', '07568885224');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLAS DE MORAES PEREIRA', v_escola_id, v_turma_f2m901, '2', '2018-11-19', '08358032285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIALISON DE LIMA DE SOUZA', v_escola_id, v_turma_f2m901, '2', '2019-01-15', '09363226247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAMILLY DO NASCIMENTO DE MELO', v_escola_id, v_turma_f2m901, '2', '2018-09-23', '08221276286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M901) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('ANDERSON DO NASCIMENTO DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2017-09-18', '07929299260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIEL GOMES DA COSTA', v_escola_id, v_turma_f3m901, '3', '2017-07-22', '08287305209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CICERO BRUNO GOMES BANDEIRA', v_escola_id, v_turma_f3m901, '3', '2017-09-19', '07062858242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVID JUNIOR RODRIGUES DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-04-20', '10172833205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FRANCERLANY SERRÃO LIMA', v_escola_id, v_turma_f3m901, '3', '2018-02-22', '09019628216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IRENE MANUELLE LIMA E LIMA', v_escola_id, v_turma_f3m901, '3', '2017-05-10', '10191782211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENIFFER VITÓRIA LIMA RODRIGUES', v_escola_id, v_turma_f3m901, '3', '2017-05-18', '09269935264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORRANA CAMILLY BANDEIRA PINHEIRO', v_escola_id, v_turma_f3m901, '3', '2017-07-14', '10975108247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA ALICE TAVARES PEREIRA', v_escola_id, v_turma_f3m901, '3', '2017-04-08', '10337662240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOISÉS DA SILVA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-07-10', '08854307270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAYNÁ DE FREITAS DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-11-10', '09089596216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WANIF RICHELLY SERRÃO DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-08-19', '09964310200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WEVERTON DA SILVA DE QUEIROZ', v_escola_id, v_turma_f3m901, '3', '2018-02-22', '07140051267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 4º Ano - Manhã (F4M901) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA VITORIA CORRÊA PACHECO', v_escola_id, v_turma_f4m901, '4', '2016-08-18', '08976423259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNA LIVIA NUNES DA COSTA', v_escola_id, v_turma_f4m901, '4', '2016-05-19', '08880507206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIANE DO NASCIMENTO DOS SANTOS', v_escola_id, v_turma_f4m901, '4', '2016-12-03', '09112131202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS DANIEL GONÇALVES VAZ', v_escola_id, v_turma_f4m901, '4', '2016-04-25', '10764006207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS EDUARDO DOS SANTOS COSTA', v_escola_id, v_turma_f4m901, '4', '2017-01-22', '10172015286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTIANO LIMA DE OLIVEIRA', v_escola_id, v_turma_f4m901, '4', '2017-03-30', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIAS OLIVEIRA SERRÃO', v_escola_id, v_turma_f4m901, '4', '2016-03-23', '09060845200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ VITAL DA COSTA DE SOUZA', v_escola_id, v_turma_f4m901, '4', '2016-08-26', '09391262228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY FARIAS PEREIRA', v_escola_id, v_turma_f4m901, '4', '2016-09-23', '09258057260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAUARA SOPHIA DA SILVA BRITO', v_escola_id, v_turma_f4m901, '4', '2016-04-04', '08935842230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ HENRIQUE FREITAS DO NASCIMENTO', v_escola_id, v_turma_f4m901, '4', '2016-05-14', '09316447208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAYANDRA DE MORAES PEREIRA', v_escola_id, v_turma_f4m901, '4', '2017-02-08', '09099658206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLAS GABRIEL VALES MACHADO', v_escola_id, v_turma_f4m901, '4', '2016-10-18', '05657049233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VINÍCIUS DE SOUZA DA CONCEIÇÃO', v_escola_id, v_turma_f4m901, '4', '2016-06-27', '08973859269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VITOR HUGO ALVES OLIVEIRA', v_escola_id, v_turma_f4m901, '4', '2016-05-29', '09108303207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLIAN GABRIEL DA COSTA OLIVEIRA', v_escola_id, v_turma_f4m901, '4', '2017-02-06', '09849354283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Manhã (F5M901) - 9 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA LAYZE FERREIRA VIEIRA', v_escola_id, v_turma_f5m901, '5', '2015-12-07', '09135764252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANGELIZA TAVARES DA SILVA', v_escola_id, v_turma_f5m901, '5', '2016-01-13', '08848446256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BENIANE DO NASCIMENTO DOS SANTOS', v_escola_id, v_turma_f5m901, '5', '2014-05-13', '09112115274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS FERNANDO QUEIROZ DA SILVA', v_escola_id, v_turma_f5m901, '5', '2016-03-21', '09029485205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GRAZIELA DE SOUZA DO NASCIMENTO', v_escola_id, v_turma_f5m901, '5', '2016-02-18', '09026020201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO CAIQUE RODRIGUES DE ALMEIDA', v_escola_id, v_turma_f5m901, '5', '2015-12-23', '08993462275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOISÉS VIEIRA SERRÃO', v_escola_id, v_turma_f5m901, '5', '2016-01-24', '08380771290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PRISCILLA DO NASCIMENTO DE FREITAS', v_escola_id, v_turma_f5m901, '5', '2015-04-09', '08897118283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYANA FERREIRA OLIVEIRA', v_escola_id, v_turma_f5m901, '5', '2015-05-24', '09041132210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 11 alunos
  v_result := fn_upsert_aluno_2026_v2('ADELIAS GABRIEL OLIVEIRA SERRÃO', v_escola_id, v_turma_f6t901, '6', '2014-10-24', '09060837290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BENAEL DO NASCIMENTO DA CONCEIÇÃO', v_escola_id, v_turma_f6t901, '6', '2014-12-08', '08999799204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNO DA SILVA DE FREITAS', v_escola_id, v_turma_f6t901, '6', '2015-01-30', '08893715201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUIZ DA SILVA COSTA', v_escola_id, v_turma_f6t901, '6', '2015-01-26', '09862873264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY CAMILLY DE LIMA E LIMA', v_escola_id, v_turma_f6t901, '6', '2014-08-06', '09048872278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZABELLY MACEDO LIMA', v_escola_id, v_turma_f6t901, '6', '2011-03-13', '09026462220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO HENRIQUE FARIAS PEREIRA', v_escola_id, v_turma_f6t901, '6', '2014-09-14', '09258042239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULYANE TEIXEIRA DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-06-24', '08857526275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUANA CAROLINE MIRANDA DA COSTA', v_escola_id, v_turma_f6t901, '6', '2014-07-04', '08980649290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAILA FERREIRA VIEIRA', v_escola_id, v_turma_f6t901, '6', '2015-03-25', '09135794240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAYLA JAMILLY DE OLIVEIRA ANDRADE', v_escola_id, v_turma_f6t901, '6', '2015-03-12', '09028590218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 15 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIEL DOS SANTOS DO NASCIMENTO', v_escola_id, v_turma_f7t901, '7', '2020-06-19', '09354154247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ADRIELMA DO NASCIMENTO DA CONCEIÇÃO', v_escola_id, v_turma_f7t901, '7', '2012-04-04', '08999782239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ADRISON DO NASCIMENTO DA CONCEIÇÃO', v_escola_id, v_turma_f7t901, '7', '2010-07-18', '08999766209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALANA KAROLINA FERREIRA VIEIRA', v_escola_id, v_turma_f7t901, '7', '2020-03-22', '08526560255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALINE MAGNO LIMA', v_escola_id, v_turma_f7t901, '7', '2013-05-30', '08988057244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA BEATRIZ GOMES FREITAS', v_escola_id, v_turma_f7t901, '7', '2013-03-03', '09053151206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÂNGELO VINICIUS CORRÊA PACHECO', v_escola_id, v_turma_f7t901, '7', '2014-04-30', '08976418255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTIANA LIMA DE OLIVEIRA', v_escola_id, v_turma_f7t901, '7', '2014-02-17', '09022009254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FREDSON PANTOJA DE LIMA', v_escola_id, v_turma_f7t901, '7', '2013-06-14', '08884039258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO PAULO NUNES DA COSTA', v_escola_id, v_turma_f7t901, '7', '2013-07-26', '08880445260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MÔNICA DA SILVA DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2011-10-22', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RYCHARLISON DE FREITAS PANTOJA', v_escola_id, v_turma_f7t901, '7', '2013-09-25', '09130797233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAYMISSON PANTOJA LIMA', v_escola_id, v_turma_f7t901, '7', '2013-07-30', '09110598227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VITOR FREITAS DE ANDRADE', v_escola_id, v_turma_f7t901, '7', '2014-01-15', '04444466219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLIS LUCAS MARINHO DOS SANTOS', v_escola_id, v_turma_f7t901, '7', '2013-08-06', '08877388269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 10 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA PAULA DA SILVA DA COSTA', v_escola_id, v_turma_f8t901, '8', '2012-07-15', '11219566292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS EMANOEL SILVA DE QUEIROS', v_escola_id, v_turma_f8t901, '8', '2012-07-19', '08944102295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTIANE LIMA DE OLIV EIRA', v_escola_id, v_turma_f8t901, '8', '2012-06-23', '09022002241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTER FREITAS DE ANDRADE', v_escola_id, v_turma_f8t901, '8', '2011-08-20', '05834144276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO GOMES BANDEIRA', v_escola_id, v_turma_f8t901, '8', '2012-11-13', '09110565213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IRAEL LIMA SERRÃO', v_escola_id, v_turma_f8t901, '8', '2012-04-05', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIELE DA CONCEIÇÃO DE ALMEIDA', v_escola_id, v_turma_f8t901, '8', '2012-11-12', '08974402262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO RUAN MIRANDA DA COSTA', v_escola_id, v_turma_f8t901, '8', '2011-08-29', '08980638256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAÍ DE LIMA DE FREITAS', v_escola_id, v_turma_f8t901, '8', '2012-11-08', '09087601247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILKER DA COSTA LIMA', v_escola_id, v_turma_f8t901, '8', '2012-11-20', '08945230238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 10 alunos
  v_result := fn_upsert_aluno_2026_v2('ANDRÉ MACHADO DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2012-04-04', '08881797232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANILO NICOLAS ALVES OLIVEIRA', v_escola_id, v_turma_f9t901, '9', '2012-02-07', '09108266255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDA CAMILLY DA COSTA DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-12-06', '09332372276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULLYA NOVAES FREITAS', v_escola_id, v_turma_f9t901, '9', '2012-05-22', '09027868220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUE LA ALVES OLIVEIRA', v_escola_id, v_turma_f9t901, '9', '2012-05-08', '09131496245');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAI DOUGLAS DA SILVA COSTA', v_escola_id, v_turma_f9t901, '9', '2010-04-09', '09862819219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RITA DE CÁSSIA OLIVEIRA SERRÃO', v_escola_id, v_turma_f9t901, '9', '2011-07-11', '09060807200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALQUÍRIA DE LIMA E LIMA', v_escola_id, v_turma_f9t901, '9', '2012-01-17', '09048835232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VITÓRIA PAULA OLIVEIRA SERRÃO', v_escola_id, v_turma_f9t901, '9', '2011-07-11', '09060823230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WIULA ANDRADE DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-08-02', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF PADRE SILVERIO: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 10. EMEIF PORTO ALEGRE (codigo: EMEIF_PORTO_ALEGRE)
--    1 turmas, 8 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_PORTO_ALEGRE';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('FMM901', 'Multi-série - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35, true)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_fmm901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_PORTO_ALEGRE';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (FMM901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('GUILHERME RAMOS CORDEIRO', v_escola_id, v_turma_fmm901, 'PRE1', '2020-12-29', '10398906289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR DOS SANTOS LOBATO', v_escola_id, v_turma_fmm901, 'PRE2', '2020-12-03', '10323801285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL DE SOUZA SANTOS', v_escola_id, v_turma_fmm901, '2', '2019-01-07', '07946482230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAKELINE SOUZA SANTOS', v_escola_id, v_turma_fmm901, '2', '2018-06-01', '09628257277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADSON SOUZA SANTOS', v_escola_id, v_turma_fmm901, '4', '2016-05-08', '09628211285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUCAS SOUZA SANTOS', v_escola_id, v_turma_fmm901, '5', '2015-09-03', '09476918209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULA DOS SANTOS DOS SANTOS', v_escola_id, v_turma_fmm901, '5', '2015-05-07', '04966717230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO ANTÔNIO DOS SANTOS LOBATO', v_escola_id, v_turma_fmm901, '5', '2016-02-27', '10809540231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF PORTO ALEGRE: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 11. EMEIF RAQUEL (codigo: EMEIF_RAQUEL)
--    11 turmas, 178 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_RAQUEL';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35, true),
    ('I2MP01', 'Pré II - Manhã', v_escola_id, 'PRE2', '2026', 'matutino', 35, false),
    ('F1M90', '1º Ano - Manhã', v_escola_id, '1', '2026', 'matutino', 35, false),
    ('F2M901', '2º Ano - Manhã', v_escola_id, '2', '2026', 'matutino', 35, false),
    ('F3M901', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35, false),
    ('F4M901', '4º Ano - Manhã', v_escola_id, '4', '2026', 'matutino', 35, false),
    ('F5T901', '5º Ano - Tarde', v_escola_id, '5', '2026', 'vespertino', 35, false),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35, false),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35, false),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35, false),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_i2mp01 UUID;
  v_turma_f1m90 UUID;
  v_turma_f2m901 UUID;
  v_turma_f3m901 UUID;
  v_turma_f4m901 UUID;
  v_turma_f5t901 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_RAQUEL';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_i2mp01 FROM turmas WHERE codigo = 'I2MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1m90 FROM turmas WHERE codigo = 'F1M90' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f4m901 FROM turmas WHERE codigo = 'F4M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5t901 FROM turmas WHERE codigo = 'F5T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 14 alunos
  v_result := fn_upsert_aluno_2026_v2('AGATHA VITÓRIA BRABO TEIXEIRA', v_escola_id, v_turma_iump01, 'PRE1', '2021-07-09', '10325718296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR HENRIQUE MARQUES FUSCO', v_escola_id, v_turma_iump01, 'PRE1', '2021-04-27', '09805871231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI ISAAC FURTADO VIANA', v_escola_id, v_turma_iump01, 'CRE', '2022-11-14', '10566132206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIZA MELO DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2022-03-08', '10371355206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOISE PINHEIRO GOMES', v_escola_id, v_turma_iump01, 'PRE1', '2021-06-06', '09820173248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIELE BRASIL DE MORAES', v_escola_id, v_turma_iump01, 'CRE', '2022-12-05', '10574219285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUTIERRE DOS SANTOS MAGNO JUNIOR', v_escola_id, v_turma_iump01, 'PRE1', '2021-09-24', '10371172209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY RHIANNY DA COSTA MELO', v_escola_id, v_turma_iump01, 'CRE', '2022-06-23', '10451565231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KIARA VITÓRIA RODRIGUES DINIZ', v_escola_id, v_turma_iump01, 'CRE', '2022-11-20', '10591987201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEOHAN SERRÃO LOBATO', v_escola_id, v_turma_iump01, 'CRE', '2022-10-27', '10534289282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA ALICE ALVES FARIAS', v_escola_id, v_turma_iump01, 'CRE', '2023-01-25', '10681026243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIKAELLY SILVA MARINHO', v_escola_id, v_turma_iump01, 'PRE1', '2021-04-02', '10274239221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAEL FILHO BARRETO DE ARAUJO', v_escola_id, v_turma_iump01, 'PRE1', '2022-03-05', '10272783293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WESLEY GAEL FARIAS SERRAO', v_escola_id, v_turma_iump01, 'PRE1', '2021-10-16', '10360160212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Pré II - Manhã (I2MP01) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('ALICE SERRÃO MARINHO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-11-29', '09744226226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAUÊ PINHEIRO GOMES', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-04-07', '09262013280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOANNY GOMES PINHEIRO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-23', '09434833280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GAEL BRASIL DE MORAES', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-23', '09678127202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEANDRO FERREIRA TEIXEIRA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-17', '09765374275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENNIFER MANUELA FERREIRA REIS', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-02-23', '09746106236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KELRE COSTA FURTADO', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-11', '10009894292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELLY SOPHIA DA SILVA MARINHO', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-23', '09721699209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA CLARA DA SILVA SERRÃO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-11-05', '09516006213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MONICA SERRÃO BATISTA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-11-11', '09522641294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAUANE SOFIA ARAÚJO DE OLIVEIRA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-28', '09345260285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENAN LOBATO SERRÃO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-06-01', '09382091246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICARDO OLIVEIRA GOMES', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-03-01', '09719108207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMILLY SERRÃO LOBATO', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-01-18', '09737552296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAYNÁ CHAGAS PANTOJA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-08-14', '09405791706');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WESLEY MELO DA SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2021-01-20', '09620784251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 1º Ano - Manhã (F1M90) - 15 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIELLY BRUNA CAVALCANTE SERRÃO', v_escola_id, v_turma_f1m90, '1', '2020-03-04', '10274244225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSON OLIVEIRA DOS SANTOS', v_escola_id, v_turma_f1m90, '1', '2020-01-15', '09032056298');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSON PANTOJA FERREIRA', v_escola_id, v_turma_f1m90, '1', '2020-02-12', '09419182207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR ALMEIDA VILHENA', v_escola_id, v_turma_f1m90, '1', '2020-03-07', '09254183237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNNO GABRIEL VIEIRA COSTA', v_escola_id, v_turma_f1m90, '1', '2019-11-23', '08784350261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLEIANE DA CONCEIÇÃO SERRÃO', v_escola_id, v_turma_f1m90, '1', '2019-11-10', '09345720200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAYANE DE MATOS VIEIRA', v_escola_id, v_turma_f1m90, '1', '2019-04-13', '08548873264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY MORAES DE ARAÚJO', v_escola_id, v_turma_f1m90, '1', '2020-03-14', '09240693254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FERNANDA SERRÃO FERREIRA', v_escola_id, v_turma_f1m90, '1', '2019-07-24', '08739977277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HADASSA VITÓRIA MIRANDA MARTINS', v_escola_id, v_turma_f1m90, '1', '2019-06-12', '08502770276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('INGRID DOS SANTOS DE ARAÚJO', v_escola_id, v_turma_f1m90, '1', '2019-12-02', '09041667245');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEONARDO SERRÃO LOBATO', v_escola_id, v_turma_f1m90, '1', '2019-07-14', '08565919200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARTO DE ARAÚJO REIS JUNIOR', v_escola_id, v_turma_f1m90, '1', '2019-04-20', '08415156200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIKAELSON SILVA MARINHO', v_escola_id, v_turma_f1m90, '1', '2019-07-10', '08497962290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACE RAILAN SERRÃO REIS', v_escola_id, v_turma_f1m90, '1', '2019-09-23', '08844574276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 2º Ano - Manhã (F2M901) - 11 alunos
  v_result := fn_upsert_aluno_2026_v2('ALISSON GOMES MORAES', v_escola_id, v_turma_f2m901, '2', '2018-12-19', '07899932289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DARLEM JUNIOR PINHEIRO GOMES', v_escola_id, v_turma_f2m901, '2', '2018-10-31', '07890377266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FLÁVIA GOMES FERREIRA', v_escola_id, v_turma_f2m901, '2', '2018-09-21', '07641306250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GHAEL DO ESPÍRITO SANTO PANTOJA', v_escola_id, v_turma_f2m901, '2', '2018-09-23', '07752012270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IANNA ALESSANDRA SERRÃO REIS', v_escola_id, v_turma_f2m901, '2', '2018-10-17', '07990190206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JENIELE FERREIRA TEIXEIRA', v_escola_id, v_turma_f2m901, '2', '2018-08-04', '07467601247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JONAS SERRÃO OLIVEIRA', v_escola_id, v_turma_f2m901, '2', '2018-10-18', '08108563283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ MARQUES FUSCO - V. SÃO JOSÉ', v_escola_id, v_turma_f2m901, '2', '2019-01-04', '07985602232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUÂ PINHEIRO PANTOJA', v_escola_id, v_turma_f2m901, '2', '2018-05-08', '07274536290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAIANE FERREIRA GONÇALVES', v_escola_id, v_turma_f2m901, '2', '2018-11-18', '08380736206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THALLES SAMUEL DE ARAÚJO MARINHO', v_escola_id, v_turma_f2m901, '2', '2018-06-23', '07383599209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M901) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('ACSA TELES FURTADO', v_escola_id, v_turma_f3m901, '3', '2017-09-25', '07118768278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ADILSON NETO OLIVEIRA DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2018-02-17', '07006035228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ADRENILSON CAVALCANTE SERRÃO', v_escola_id, v_turma_f3m901, '3', '2018-03-18', '07330895261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA CLARA DA CONCEIÇÃO SERRÃO', v_escola_id, v_turma_f3m901, '3', '2018-03-24', '09345703292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CALEBE DOS SANTOS E SANTOS', v_escola_id, v_turma_f3m901, '3', '2018-02-12', '07094422202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUIZ LOBATO SERRÃO', v_escola_id, v_turma_f3m901, '3', '2017-07-31', '09070261251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEBORAH DE SOUZA OLIVEIRA', v_escola_id, v_turma_f3m901, '3', '2017-10-11', '09027968284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEÚ DOS SANTOS DE ARAÚJO', v_escola_id, v_turma_f3m901, '3', '2018-03-27', '07284867256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO LUCAS SERRÃO PANTOJA', v_escola_id, v_turma_f3m901, '3', '2018-02-18', '07165230270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIGUEL NETO MELO LOBATO', v_escola_id, v_turma_f3m901, '3', '2018-01-24', '07261724211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACY FURTADO VIANA', v_escola_id, v_turma_f3m901, '3', '2017-06-22', '10104162279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WENZELL REIS MIRANDA', v_escola_id, v_turma_f3m901, '3', '2017-12-16', '07011525246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 4º Ano - Manhã (F4M901) - 25 alunos
  v_result := fn_upsert_aluno_2026_v2('ALBERT ABNER MIRANDA FERREIRA', v_escola_id, v_turma_f4m901, '4', '2016-09-21', '09116416295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA BIATRIZ LEÃO DA COSTA', v_escola_id, v_turma_f4m901, '4', '2016-09-02', '09769198269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRESON MIRANDA FERREIRA', v_escola_id, v_turma_f4m901, '4', '2016-04-17', '09789771223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNA ISABELLA DE SOUZA OLIVEIRA', v_escola_id, v_turma_f4m901, '4', '2016-04-05', '09027942218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNNA VITHÓRIA VIEIRA COSTA', v_escola_id, v_turma_f4m901, '4', '2016-05-28', '09912114213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DINAELI DE MATOS VIEIRA', v_escola_id, v_turma_f4m901, '4', '2006-07-22', '08864951210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY VITÓRIA DE MORAES GOMES', v_escola_id, v_turma_f4m901, '4', '2016-09-30', '05657211278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EUGENILSON FERREIRA TEIXEIRA', v_escola_id, v_turma_f4m901, '4', '2016-08-05', '09803296205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVILI SUZANI SERRÃO OLIVEIRA', v_escola_id, v_turma_f4m901, '4', '2015-11-17', '09137695258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FRANCINALDO VILHENA SANTANA', v_escola_id, v_turma_f4m901, '4', '2015-10-26', '08980459246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL HENRIQUE FARIAS SERRÃO', v_escola_id, v_turma_f4m901, '4', '2015-09-26', '09803137247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IRDEY DA SILVA ALVES', v_escola_id, v_turma_f4m901, '4', '2015-11-30', '09262514220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZABELA SANTOS BRAGA', v_escola_id, v_turma_f4m901, '4', '2016-08-23', '08959914207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JÉSSICA SANTANA DE MATOS', v_escola_id, v_turma_f4m901, '4', '2016-12-16', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELMA PANTOJA MARINHO', v_escola_id, v_turma_f4m901, '4', '2015-11-11', '10196458204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOERCIO DE ARAÚJO GOMES NETO', v_escola_id, v_turma_f4m901, '4', '2016-04-23', '05481133270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JORGE SANTANA DE MATOS', v_escola_id, v_turma_f4m901, '4', '2015-05-01', '09060315243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ EDUARDO MARQUES FUSCO', v_escola_id, v_turma_f4m901, '4', '2016-07-25', '07985562265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LÍVIA SERRÃO MAGNO', v_escola_id, v_turma_f4m901, '4', '2017-03-03', '09750717260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARTA OLIVEIRA GOMES', v_escola_id, v_turma_f4m901, '4', '2016-09-04', '09079720208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOACI NETO DOS SANTOS DE ARAUJO', v_escola_id, v_turma_f4m901, '4', '2016-02-27', '09041647210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PABLO JUNIOR LOBATO SERRÃO', v_escola_id, v_turma_f4m901, '4', '2016-11-19', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('QUELIANE PANTOJA GONÇALVES', v_escola_id, v_turma_f4m901, '4', '2015-06-08', '10471535214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAELMA BARRETO DE ARAÚJO', v_escola_id, v_turma_f4m901, '4', '2016-04-27', '09643967263');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM VICTÓRIA DOS SANTOS FARIAS', v_escola_id, v_turma_f4m901, '4', '2016-05-04', '06311336235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Tarde (F5T901) - 15 alunos
  v_result := fn_upsert_aluno_2026_v2('ADENIAS LOBATO SANTANA', v_escola_id, v_turma_f5t901, '5', '2016-03-06', '09759815281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS HENRIQUE LOBATO SERRÃO', v_escola_id, v_turma_f5t901, '5', '2015-06-06', '09070231263');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEYVISON DE JESUS PINHEIRO GOMES', v_escola_id, v_turma_f5t901, '5', '2015-10-04', '09785856232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEAN LUCAS FERREIRA TEIXEIRA', v_escola_id, v_turma_f5t901, '5', '2015-04-27', '09803282255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÍZIS VIEIRA SERRÃO', v_escola_id, v_turma_f5t901, '5', '2015-05-31', '09091469269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KARE N VITORIA GONÇALVES FORMIGOSA', v_escola_id, v_turma_f5t901, '5', '2015-07-08', '09796574233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMILLY VITÓRIA GOMES DA SILVA', v_escola_id, v_turma_f5t901, '5', '2016-01-09', '09311916293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARISSA MANUELA MELO PANTOJA', v_escola_id, v_turma_f5t901, '5', '2015-08-30', '09054466235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATIAS SERRÃO MARINHO', v_escola_id, v_turma_f5t901, '5', '2014-07-23', '09807531209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO WENDRIL GOMES FERREIRA', v_escola_id, v_turma_f5t901, '5', '2015-09-12', '09780848290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYLESSON DE JESUS ARAÚJO DA COSTA', v_escola_id, v_turma_f5t901, '5', '2015-10-19', '09139609260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RYAN MARINHO DA SILVA', v_escola_id, v_turma_f5t901, '5', '2015-11-13', '09042801280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SOPHIA PINHEIRO GOMES', v_escola_id, v_turma_f5t901, '5', '2015-11-11', '09785859258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAEME CHAGAS PANTOJA', v_escola_id, v_turma_f5t901, '5', '2015-11-24', '09875902276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALTER FERREIRA FURTADO', v_escola_id, v_turma_f5t901, '5', '2015-06-01', '09775858240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 19 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIANA CHAGAS DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-11-25', '10347251226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALEX RUAN MAGNO FARIAS', v_escola_id, v_turma_f6t901, '6', '2015-02-22', '09025849288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALEX SERRÃO OLIVEIRA', v_escola_id, v_turma_f6t901, '6', '2014-08-23', '09137677276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANTÔNIO GOMES DE MORAES NETO', v_escola_id, v_turma_f6t901, '6', '2015-03-28', '09073840210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR MAGNO DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-11-16', '09755329285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS EDUARDO LOBATO SERRÃO', v_escola_id, v_turma_f6t901, '6', '2013-07-08', '09070211238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISON PANTOJA FERREIRA', v_escola_id, v_turma_f6t901, '6', '2015-03-05', '09419214257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FELIPE VALES CORDEIRO', v_escola_id, v_turma_f6t901, '6', '2010-08-21', '09139798216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GILVAM JÚNIOR DE FREITAS DO VALES', v_escola_id, v_turma_f6t901, '6', '2014-12-09', '08988550200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO DA CONCEIÇÃO SERRÃO', v_escola_id, v_turma_f6t901, '6', '2011-08-28', '09088421200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JONATAS FERREIRA DA COSTA', v_escola_id, v_turma_f6t901, '6', '2014-09-23', '08896855250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSIELE CARNEIRO CHAGAS', v_escola_id, v_turma_f6t901, '6', '2014-08-25', '09065205250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('OTÁVIO FILHO SERRÃO TEIXEIRA', v_escola_id, v_turma_f6t901, '6', '2014-02-06', '09084128273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAILANA FERREIRA GONÇALVES', v_escola_id, v_turma_f6t901, '6', '2014-09-25', '09087286201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENAN PINHEIRO DOS REIS', v_escola_id, v_turma_f6t901, '6', '2014-05-16', '08996048208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUANY FERREIRA TAVARES', v_escola_id, v_turma_f6t901, '6', '2013-06-13', '09800810250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VANESSA GOMES DA SILVA', v_escola_id, v_turma_f6t901, '6', '2014-09-16', '08828320265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VILMA PANTOJA GONÇALVES', v_escola_id, v_turma_f6t901, '6', '2014-02-01', '09798503201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VITÓRIA LOBATO SANTANA', v_escola_id, v_turma_f6t901, '6', '2014-02-16', '08980433280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('ABRAÃO SERRÃO BATISTA', v_escola_id, v_turma_f7t901, '7', '2011-04-03', '09016869212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE TELES FURTADO', v_escola_id, v_turma_f7t901, '7', '2013-11-14', '09803388240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIEL WENDERSON SANTOS BRAGA', v_escola_id, v_turma_f7t901, '7', '2013-05-14', '08959878219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIELE DE MATOS VIEIRA', v_escola_id, v_turma_f7t901, '7', '2013-06-22', '08864944273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DHONATA SOUZA REIS', v_escola_id, v_turma_f7t901, '7', '2014-01-24', '08967731248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMANUELLY MAGNO MATOS', v_escola_id, v_turma_f7t901, '7', '2013-04-20', '09113104284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IAN LUCAS REIS E REIS', v_escola_id, v_turma_f7t901, '7', '2014-02-01', '09750795229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAEMILLY BRABO MATOS', v_escola_id, v_turma_f7t901, '7', '2013-11-11', '09072040236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEREMIAS SANTANA DE MATOS', v_escola_id, v_turma_f7t901, '7', '2013-07-11', '09060307224');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JÉSSICA MELO LOBATO', v_escola_id, v_turma_f7t901, '7', '2013-05-09', '09102668246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEVIN SERRÃO FARIAS', v_escola_id, v_turma_f7t901, '7', '2013-05-22', '09029217200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MELRE COSTA FURTADO', v_escola_id, v_turma_f7t901, '7', '2013-04-03', '09955667206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROBERTO DA CONCEIÇÃO SERRÃO', v_escola_id, v_turma_f7t901, '7', '2013-11-27', '09088433216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RODRIGO MARINHO DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-09-28', '09042777206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROMUALDO GOMES DA SILVA', v_escola_id, v_turma_f7t901, '7', '2006-07-17', '04765599280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMUEL VIEIRA SERRÃO', v_escola_id, v_turma_f7t901, '7', '2012-06-29', '09091448261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 19 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIANE CHAGAS DA SILVA', v_escola_id, v_turma_f8t901, '8', '2013-03-31', '10347243207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ADRIANO LOBATO SANTANA', v_escola_id, v_turma_f8t901, '8', '2011-11-03', '08980426232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AMANDA DE SOUZA SERRAO', v_escola_id, v_turma_f8t901, '8', '2011-05-18', '09051133227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÁRAFE CARNEIRO CHAGAS', v_escola_id, v_turma_f8t901, '8', '2012-07-10', '09065178260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLOS SÍLVIO LOBATO SERRÃO', v_escola_id, v_turma_f8t901, '8', '2011-05-21', '09070185210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DEYVID PINHEIRO FERREIRA', v_escola_id, v_turma_f8t901, '8', '2013-01-11', '09094443236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELANDESON MORAES FERREIRA', v_escola_id, v_turma_f8t901, '8', '2008-07-12', '07220098286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISSON DA CONCEIÇÃO SERRÃO', v_escola_id, v_turma_f8t901, '8', '2010-07-25', '09088412219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FELIPE CRISTIAM SERRÃO DOS SANTOS', v_escola_id, v_turma_f8t901, '8', '2012-12-27', '09054543248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FERNANDA REBELO GOMES', v_escola_id, v_turma_f8t901, '8', '2012-05-30', '09091341203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GENIL SERRÃO TEIXEIRA', v_escola_id, v_turma_f8t901, '8', '2008-03-09', '09084116267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS CRISTIAM SERRÃO DOS SANTOS', v_escola_id, v_turma_f8t901, '8', '2012-12-27', '09054523212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIANO MAGNO LOBATO', v_escola_id, v_turma_f8t901, '8', '2012-12-06', '05880331202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAIARA VIEIRA PANTOJA', v_escola_id, v_turma_f8t901, '8', '2008-05-18', '01913773256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NOELIO VIEIRA SERRÃO', v_escola_id, v_turma_f8t901, '8', '2009-09-21', '09091422203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RICHELLY FERREIRA GONÇALVES', v_escola_id, v_turma_f8t901, '8', '2011-12-29', '09087268211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('STEFANY KAROLINE FARIAS DOS SANTOS', v_escola_id, v_turma_f8t901, '8', '2010-01-15', '09119081294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALMILA GOMES DA SILVA', v_escola_id, v_turma_f8t901, '8', '2011-11-11', '08828280298');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASHILA ADRIANE DOS SANTOS FERREIRA', v_escola_id, v_turma_f8t901, '8', '2012-09-29', '09134830286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('ALANA BRABO TEIXEIRA', v_escola_id, v_turma_f9t901, '9', '2011-05-18', '09063929269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAMILI MELO LOBATO', v_escola_id, v_turma_f9t901, '9', '2011-01-12', '09102664259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTIANO FILHO SERRÃO DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2008-07-27', '09054507284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DHENIFFER TELES FURTADO', v_escola_id, v_turma_f9t901, '9', '2011-01-05', '09803369296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DIOZIMO SOUZA REIS', v_escola_id, v_turma_f9t901, '9', '2011-06-08', '08967710240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIZANE CHAGAS PANTOJA', v_escola_id, v_turma_f9t901, '9', '2011-09-25', '09875894230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEILA FABIANE MAGNO FARIAS', v_escola_id, v_turma_f9t901, '9', '2011-12-11', '09025840221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KELLYANE PINHEIRO MOREIRA', v_escola_id, v_turma_f9t901, '9', '2010-05-26', '05600354207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARYANNE GOMES MIRANDA', v_escola_id, v_turma_f9t901, '9', '2011-09-21', '08216557280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NOELSON DE ARAÚJO REIS', v_escola_id, v_turma_f9t901, '9', '2011-12-22', '08969919201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO NETO MATOS SERRÃO', v_escola_id, v_turma_f9t901, '9', '2011-02-02', '09037899226');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAELA BARRETO DE ARAÚJO', v_escola_id, v_turma_f9t901, '9', '2011-06-18', '09643956229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAQUELI LOBATO SERRÃO', v_escola_id, v_turma_f9t901, '9', '2008-08-24', '09737535286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENATA DE ARAÚJO GOMES', v_escola_id, v_turma_f9t901, '9', '2012-03-15', '09075014279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAYLA VICTÓRIA DE SOUZA VIEIRA', v_escola_id, v_turma_f9t901, '9', '2011-11-10', '09050918255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ZILMA PANTOJA GONÇALVES', v_escola_id, v_turma_f9t901, '9', '2011-09-06', '09803839276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF RAQUEL: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 12. EMEIF REI SALOMAO (codigo: EMEIF_REI_SALOMÃO)
--    4 turmas, 50 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_REI_SALOMÃO';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('F2M901', '2º Ano - Manhã', v_escola_id, '2', '2026', 'matutino', 35, false),
    ('FMM901', 'Multi-série - Manhã', v_escola_id, '1', '2026', 'matutino', 35, true),
    ('FMM90', 'Multi-série - Manhã', v_escola_id, '4', '2026', 'matutino', 35, true)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_f2m901 UUID;
  v_turma_fmm901 UUID;
  v_turma_fmm90 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_REI_SALOMÃO';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm90 FROM turmas WHERE codigo = 'FMM90' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 17 alunos
  v_result := fn_upsert_aluno_2026_v2('ACSA ESTER FERREIRA DE OLIVEIRA', v_escola_id, v_turma_iump01, 'CRE', '2022-12-29', '10611427281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ADRIANO TAVARES DOS SANTOS', v_escola_id, v_turma_iump01, 'CRE', '2022-04-26', '10564194239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA CECÍLIA GOMES CORDEIRO', v_escola_id, v_turma_iump01, 'PRE2', '2021-03-16', '09714579210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BENJAMIM COSTA DAS NEVES', v_escola_id, v_turma_iump01, 'PRE2', '2020-11-20', '09477548227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CAIO LUCAS LIMA DE MATOS', v_escola_id, v_turma_iump01, 'CRE', '2023-02-14', '10752194267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTAL EMANUELLY FERREIRA DE MATOS', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-09', '10145084280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVID NATHAN GOMES CORDEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2021-08-06', '09913298210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIABE NOAH DOS SANTOS SANTOS', v_escola_id, v_turma_iump01, 'PRE2', '2020-10-06', '09428363243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GRAZIELE SERRÃO TAVARES', v_escola_id, v_turma_iump01, 'PRE2', '2020-04-27', '10371350247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISABELA REBELO MELO', v_escola_id, v_turma_iump01, 'PRE1', '2022-01-06', '10170779246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ PEDRO GOMES FERREIRA', v_escola_id, v_turma_iump01, 'PRE1', '2022-01-03', '10148480241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ TAVARES REBELO', v_escola_id, v_turma_iump01, 'PRE2', '2020-12-11', '09691654202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NATASHA MOREIRA TAVARES', v_escola_id, v_turma_iump01, 'PRE2', '2020-10-20', '09702566207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('OLIVER BENJAMIN NASCIMENTO CASTILHO', v_escola_id, v_turma_iump01, 'PRE1', '2021-05-11', '09893694205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('REDUANA SERRÃO FERREIRA', v_escola_id, v_turma_iump01, 'PRE1', '2021-08-21', '10735072205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TOMAS TEIXEIRA RAMOS', v_escola_id, v_turma_iump01, 'PRE2', '2020-05-05', '09253347236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIN DE JESUS SERRÃO E SERRÃO', v_escola_id, v_turma_iump01, 'PRE2', '2020-06-04', '09323715239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 2º Ano - Manhã (F2M901) - 10 alunos
  v_result := fn_upsert_aluno_2026_v2('CLARA RODRIGUES FRAZÃO', v_escola_id, v_turma_f2m901, '2', '2018-06-05', '07312430210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI CASTILHO REBELO', v_escola_id, v_turma_f2m901, '2', '2018-06-09', '07409793295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI DA SILVA DOS SANTOS', v_escola_id, v_turma_f2m901, '2', '2018-09-22', '07609576220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÊMILLY VITÓRIA SOUZA DE MATOS', v_escola_id, v_turma_f2m901, '2', '2018-08-24', '07995649231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAURA RODRIGUES FRAZÃO', v_escola_id, v_turma_f2m901, '2', '2018-06-05', '07312413200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LETICIA OLIVEIRA TAVARES', v_escola_id, v_turma_f2m901, '2', '2018-04-07', '10710044259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MONALISA VICTORIA DE SENA CARTILHO', v_escola_id, v_turma_f2m901, '2', '2018-09-23', '07562708207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THALES REBELO CASTILHO', v_escola_id, v_turma_f2m901, '2', '2019-01-28', '08099698231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACE WILLIAM LIMA DE MATOS', v_escola_id, v_turma_f2m901, '2', '2019-02-08', '08176848247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLIAM GABRIEL CARNEIRO GOMES', v_escola_id, v_turma_f2m901, '2', '2018-08-15', '09454545205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM901) - 11 alunos
  v_result := fn_upsert_aluno_2026_v2('DAVI GOMES SILVA', v_escola_id, v_turma_fmm901, '1', '2019-05-23', '08667735256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISABEL GOMES CASTILHO', v_escola_id, v_turma_fmm901, '1', '2019-06-10', '08489862290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO HENRIQUE MOREIRA TAVARES', v_escola_id, v_turma_fmm901, '1', '2019-04-06', '08441199205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MONIQUE JULIANE CHAVES GOMES', v_escola_id, v_turma_fmm901, '1', '2019-06-11', '08509952213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA BEATRIZ GOMES CORDEIRO', v_escola_id, v_turma_fmm901, '3', '2017-10-01', '08395620209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMERSON SOUZA DE MATOS', v_escola_id, v_turma_fmm901, '3', '2015-06-24', '09036295262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JERRY SAYMON MORAES GOMES', v_escola_id, v_turma_fmm901, '3', '2018-02-01', '07158102270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEANDRO MORAES REBELO', v_escola_id, v_turma_fmm901, '3', '2016-02-17', '09067276260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOISÉS JÚNIOR CHAVES GOMES', v_escola_id, v_turma_fmm901, '3', '2018-01-12', '07288545202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO LUCAS NUNES REBELO', v_escola_id, v_turma_fmm901, '3', '2016-01-08', '08852151257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SILAS NUNES REBELO', v_escola_id, v_turma_fmm901, '3', '2017-07-15', '10175044236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM90) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('CHARLISSON SERRÃO TAVARES', v_escola_id, v_turma_fmm90, '4', '2017-01-11', '09825144254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANILO VICTOR DA COSTA GOMES', v_escola_id, v_turma_fmm90, '4', '2016-10-20', '09641439251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISON LIMA DE MATOS', v_escola_id, v_turma_fmm90, '4', '2016-09-16', '09041256296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MOISÉS DE FREITAS TAVARES', v_escola_id, v_turma_fmm90, '4', '2016-11-06', '09803537261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROBERTA SERRÃO FERREIRA', v_escola_id, v_turma_fmm90, '4', '2015-11-21', '09099836236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAMARA TAVARES REBELO', v_escola_id, v_turma_fmm90, '4', '2017-01-03', '09811659230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FAGNER SERRÃO E SERRÃO', v_escola_id, v_turma_fmm90, '5', '2016-01-05', '08884316278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HEYDAN VICTOR TELES GOMES', v_escola_id, v_turma_fmm90, '5', '2015-10-07', '08968933243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORENZO GABRIEL FERREIRA CASTILHO', v_escola_id, v_turma_fmm90, '5', '2016-02-13', '09753022212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAÍSE CAMPOS GOMES', v_escola_id, v_turma_fmm90, '5', '2015-08-13', '09716498209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMUEL GOMES CASTILHO', v_escola_id, v_turma_fmm90, '5', '2015-05-19', '09013608213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMUEL TAVARES GOMES', v_escola_id, v_turma_fmm90, '5', '2015-08-19', '08939163230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF REI SALOMAO: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 13. EMEIF SAO LUCAS (codigo: EMEIF_SÃO_LUCAS)
--    8 turmas, 104 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_SÃO_LUCAS';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('FMM901', 'Multi-série - Manhã', v_escola_id, '1', '2026', 'matutino', 35, true),
    ('F3M901', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35, false),
    ('FMM903', 'Multi-série - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35, true),
    ('F6T901', '6º Ano - Tarde', v_escola_id, '6', '2026', 'vespertino', 35, false),
    ('F7T901', '7º Ano - Tarde', v_escola_id, '7', '2026', 'vespertino', 35, false),
    ('F8T901', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35, false),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_fmm901 UUID;
  v_turma_f3m901 UUID;
  v_turma_fmm903 UUID;
  v_turma_f6t901 UUID;
  v_turma_f7t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_SÃO_LUCAS';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_fmm903 FROM turmas WHERE codigo = 'FMM903' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6t901 FROM turmas WHERE codigo = 'F6T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7t901 FROM turmas WHERE codigo = 'F7T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 16 alunos
  v_result := fn_upsert_aluno_2026_v2('AGATHA GABRIELLY SILVA MORAES', v_escola_id, v_turma_iump01, 'CRE', '2022-06-06', '10527899275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ LUCAS DA SILVA DA SILVA', v_escola_id, v_turma_iump01, 'CRE', '2023-03-14', '10727076248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULA CRISTINA DE FREITAS FILHO', v_escola_id, v_turma_iump01, 'CRE', '2022-03-31', '10417065299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('POLIANA BORGES DE FREITAS', v_escola_id, v_turma_iump01, 'CRE', '2022-12-06', '10590249266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAINARA BATISTA DE FREITAS', v_escola_id, v_turma_iump01, 'CRE', '2022-07-17', '11205230289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIANDRA OLIVEIRA GOMES', v_escola_id, v_turma_iump01, 'PRE1', '2021-11-21', '10398321213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IASMIM SOFIA FREITAS BRITO', v_escola_id, v_turma_iump01, 'PRE1', '2022-03-18', '10811785238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHON NICOLAS DA SILVA DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-05-03', '10520720202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSIANE BALIEIRO BATISTA', v_escola_id, v_turma_iump01, 'PRE1', '2021-11-29', '10306577267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA ISABELA FREITAS MACHADO', v_escola_id, v_turma_iump01, 'PRE1', '2021-06-24', '09925787289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLAS RIAN MACHADO MARTINS', v_escola_id, v_turma_iump01, 'PRE1', '2021-08-06', '09925837219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAIS ON KALEBE OLIVEIRA LIMA', v_escola_id, v_turma_iump01, 'PRE1', '2021-10-25', '10539534284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA LAURA DE FREITAS FIQUEIRÒ', v_escola_id, v_turma_iump01, 'PRE2', '2020-06-22', '09358990228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNA MONIQUE PEREIRA RAMOS', v_escola_id, v_turma_iump01, 'PRE2', '2020-04-29', '09408785266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JANNE GOMES PANTOJA', v_escola_id, v_turma_iump01, 'PRE2', '2020-05-16', '09839440241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAIO HIGOR BATISTA DE FREITAS', v_escola_id, v_turma_iump01, 'PRE2', '2020-07-25', '11204836205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM901) - 28 alunos
  v_result := fn_upsert_aluno_2026_v2('AILON DE FREITAS SANTOS', v_escola_id, v_turma_fmm901, '1', '2020-03-22', '10811804208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSON CAUÃ DOS SANTOS FREITAS', v_escola_id, v_turma_fmm901, '1', '2020-01-29', '09391356206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA CAROLINE MARTINS MORAES', v_escola_id, v_turma_fmm901, '1', '2019-11-01', '08711671238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CRISTIANO DE FREITAS FILHO', v_escola_id, v_turma_fmm901, '1', '2019-10-11', '09867819241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IVERSON RAEL MARTINS BATISTA', v_escola_id, v_turma_fmm901, '1', '2019-10-12', '08701315242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSANE SOLANGE DA SILVA DA SILVA', v_escola_id, v_turma_fmm901, '1', '2019-08-05', '08990114209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA ELOISA MARTINS DA SILVA', v_escola_id, v_turma_fmm901, '1', '2019-09-20', '08628745211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ ANDERSON DA SILVA OLIVEIRA', v_escola_id, v_turma_fmm901, '1', '2019-11-30', '09836681248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA VITÓRIA FREITAS MACHADO', v_escola_id, v_turma_fmm901, '1', '2019-07-15', '08495163233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAWELISON GOMES MACHADO', v_escola_id, v_turma_fmm901, '1', '2020-03-17', '09834920261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVISON LUCAS LIMA BRITO', v_escola_id, v_turma_fmm901, '2', '2019-01-18', '11538111209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MALAQUIAS DOS SANTOS SILVA', v_escola_id, v_turma_fmm901, '2', '2018-11-25', '09090080279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYMILA DE FREITAS OLIVEIRA', v_escola_id, v_turma_fmm901, '2', '2018-09-11', '07976697285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA VITÓRIA DA CONCEIÇÃO OLIVEIRA', v_escola_id, v_turma_fmm901, '4', '2016-10-10', '09396521299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY TAYSA DA SILVA FREITAS', v_escola_id, v_turma_fmm901, '4', '2017-03-09', '10199885257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUANA VITÓRIA DA CONCEIÇÃO OLIVEIRA', v_escola_id, v_turma_fmm901, '4', '2016-10-10', '09396571202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAYLSON MARTINS MORAES', v_escola_id, v_turma_fmm901, '4', '2016-05-08', '09574896250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WESLLEN BORGES DE FREITAS', v_escola_id, v_turma_fmm901, '4', '2016-11-01', '09292518224');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AGATHA VITÓRIA FREITAS BATISTA', v_escola_id, v_turma_fmm901, '5', '2016-01-05', '09005640243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALAN OLIVEIRA FREITAS', v_escola_id, v_turma_fmm901, '5', '2015-11-03', '08939336275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIEL DE FREITAS DA SILVA', v_escola_id, v_turma_fmm901, '5', '2015-03-02', '09015944237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIELSON CAMPOS CABRAL', v_escola_id, v_turma_fmm901, '5', '2015-12-25', '08927512235');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIZA LIMA GOMES', v_escola_id, v_turma_fmm901, '5', '2016-03-26', '08383621256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMERSON MARTINS DA SILVA', v_escola_id, v_turma_fmm901, '5', '2015-12-04', '09107434286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ISAQUE ÍBISON DE FREITAS LIMA', v_escola_id, v_turma_fmm901, '5', '2015-02-06', '07355336282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSIANA SOPHIA DA SILVA DA SILVA', v_escola_id, v_turma_fmm901, '5', '2015-12-06', '09069874237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEIVISON DE LIMA DA SILVA', v_escola_id, v_turma_fmm901, '5', '2015-10-31', '08389266229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TIALISON FREITAS DE MELO', v_escola_id, v_turma_fmm901, '5', '2015-04-12', '08883774280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M901) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('ALEJANDRO DE FREITAS FIGUEIRÓ', v_escola_id, v_turma_f3m901, '3', '2017-11-07', '07488966279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA LÚCIA DE FREITAS DA SILVA', v_escola_id, v_turma_f3m901, '3', '2018-02-14', '07184967283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRESSA DANIELY LIMA DE MELO', v_escola_id, v_turma_f3m901, '3', '2017-07-10', '08615297231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLAUDIANA DE FREITAS DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2016-11-24', '08982397299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMERSON LUCAS BORGES FERREIRA', v_escola_id, v_turma_f3m901, '3', '2017-11-02', '07144586270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHON CRISTIAN DE FREITAS FILHO', v_escola_id, v_turma_f3m901, '3', '2017-12-14', '07543946203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JÓ DA SILVA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-09-15', '09369946225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEMISSON DE LIMA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2018-01-19', '08389294273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAILANE BEATRIZ LIMA BRITO', v_escola_id, v_turma_f3m901, '3', '2017-08-31', '09632426282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIANDERSON MARTINS MORAES', v_escola_id, v_turma_f3m901, '3', '2017-07-31', '09574928209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RONALD OLIVEIRA MARTINS', v_escola_id, v_turma_f3m901, '3', '2017-06-19', '10406653224');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAILON HIAGO FREITAS DE MELO', v_escola_id, v_turma_f3m901, '3', '2017-08-23', '08883802241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (FMM903) - 21 alunos
  v_result := fn_upsert_aluno_2026_v2('GEOVAN OLIVEIRA DA CONCEIÇÃO', v_escola_id, v_turma_fmm903, 'PRE1', '2021-07-03', '11235296202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUANE SANTOS DA SILVA', v_escola_id, v_turma_fmm903, 'PRE1', '2021-11-20', '10360170285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA VITÓRIA SILVA DE JESUS', v_escola_id, v_turma_fmm903, 'PRE1', '2022-03-17', '10371127254');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVERTON RODRIGUES DOS SANTOS', v_escola_id, v_turma_fmm903, 'PRE2', '2020-07-17', '11581741286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YNGRID VITÓRIA DOS SANTOS DESOUZA', v_escola_id, v_turma_fmm903, 'PRE2', '2021-03-15', '11145561225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IARLESSON DE OLIVEIRA DA COSTA', v_escola_id, v_turma_fmm903, '1', '2019-12-25', '09384134228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MILENA DE LIMA DOS SANTOS', v_escola_id, v_turma_fmm903, '1', '2020-03-22', '10900443219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARI ELLE OLIVEIRA DA CONCEIÇÃO', v_escola_id, v_turma_fmm903, '2', '2018-05-27', '11235432246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA VITÓRIA RODRIGUES DE LIMA', v_escola_id, v_turma_fmm903, '3', '2018-02-16', '09041190252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BEATRIS OLIVEIRA DA CONCEIÇÃO/', v_escola_id, v_turma_fmm903, '3', '2016-06-08', '11235547221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DÉBORA LOPES DOS SANTOS', v_escola_id, v_turma_fmm903, '3', '2017-11-14', '07270454230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMANUELY VALES DA COSTA', v_escola_id, v_turma_fmm903, '3', '2018-02-18', '07005855248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMERSON VALES DA COSTA', v_escola_id, v_turma_fmm903, '3', '2018-02-18', '07005901290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IRANILSON DE OLIVEIRA DA COSTA', v_escola_id, v_turma_fmm903, '3', '2017-12-06', '07361520243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZABELLE DOS SANTOS DE LIMA', v_escola_id, v_turma_fmm903, '3', '2017-11-11', '08425127211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MIGUEL DE LIMA DOS SANTOS', v_escola_id, v_turma_fmm903, '3', '2018-02-23', '07367223275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALDEIR DOS SANTOS DE SOUZA', v_escola_id, v_turma_fmm903, '3', '2017-07-27', '10236129252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEICIANE DOS SANTOS SOUZA', v_escola_id, v_turma_fmm903, '3', '2016-04-21', '10236125265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELI DOS SANTOS LIMA', v_escola_id, v_turma_fmm903, '3', '2016-02-20', '06314987296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYANE DE LIMA DOS SANTOS', v_escola_id, v_turma_fmm903, '3', '2015-12-21', '10197884296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VANDERSON DE OLIVEIRA DA COSTA', v_escola_id, v_turma_fmm903, '3', '2015-07-08', '09384164216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Tarde (F6T901) - 5 alunos
  v_result := fn_upsert_aluno_2026_v2('CLARA DE LIMA PEREIRA', v_escola_id, v_turma_f6t901, '6', '2014-08-02', '09040073244');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOCI DA CONCEIÇÃO OLIVEIRA', v_escola_id, v_turma_f6t901, '6', '2014-06-11', '09396651230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MANUELA DOS SANTOS DE LIMA', v_escola_id, v_turma_f6t901, '6', '2014-02-27', '09039164282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('OZIANE OLIVEIRA DA SILVA', v_escola_id, v_turma_f6t901, '6', '2013-07-23', '09016714286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RONNILSON OLIVEIRA MARTINS', v_escola_id, v_turma_f6t901, '6', '2015-02-09', '09107300247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Tarde (F7T901) - 5 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA VITÓRIA MARTINS VALE', v_escola_id, v_turma_f7t901, '7', '2011-04-18', '09131399207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIELE FURTADO DE FREITAS', v_escola_id, v_turma_f7t901, '7', '2013-07-21', '09607685210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FELIPE LIMA BRITO', v_escola_id, v_turma_f7t901, '7', '2013-11-23', '09050484239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RITIANNY MARTINS DA SILVA', v_escola_id, v_turma_f7t901, '7', '2013-12-06', '09107403216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RODRIEL OLIVEIRA MARTINS', v_escola_id, v_turma_f7t901, '7', '2013-06-15', '09107257210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('ALCILENE DE FREITAS DA SIVA', v_escola_id, v_turma_f8t901, '8', '2012-07-02', '09015936218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AMÓS DE FREITAS SILVA', v_escola_id, v_turma_f8t901, '8', '2013-02-15', '08853132248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DORIELLY CAMPOS CABRAL', v_escola_id, v_turma_f8t901, '8', '2012-07-18', '08927506260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIABE DA CONCEIÇÃO OLIVEIRA', v_escola_id, v_turma_f8t901, '8', '2012-02-25', '09396613223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IRAN FREITAS LIMA', v_escola_id, v_turma_f8t901, '8', '2012-07-10', '07355332295');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAÍS DE OLIVEIRA DE FREITAS', v_escola_id, v_turma_f8t901, '8', '2013-01-28', '08939526210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TATIANE OLIVEIRA VALES', v_escola_id, v_turma_f8t901, '8', '2013-02-03', '08939289250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TIAGO ARTUR DA CONCEIÇÃO', v_escola_id, v_turma_f8t901, '8', '2012-09-30', '09021123258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 9 alunos
  v_result := fn_upsert_aluno_2026_v2('ABDIEL LOPES DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-09-23', '09089440208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CHARLESSON OLIVEIRA DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-07-04', '08881687216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELY VALES PATACHO', v_escola_id, v_turma_f9t901, '9', '2011-11-18', '09081065211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEANDRO FREITAS BATISTA', v_escola_id, v_turma_f9t901, '9', '2011-06-08', '09005608277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JACKSON FREITAS BATISTA', v_escola_id, v_turma_f9t901, '9', '2012-02-24', '09005621290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIO DE LIMA PEREIRA', v_escola_id, v_turma_f9t901, '9', '2012-01-03', '09043652202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NÚBIA LOPES VALES', v_escola_id, v_turma_f9t901, '9', '2012-01-26', '09045756242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RANIELE OLIVEIRA MARTINS', v_escola_id, v_turma_f9t901, '9', '2010-10-07', '09107237294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RODRIGO OLIVEIRA MARTINS', v_escola_id, v_turma_f9t901, '9', '2009-05-18', '09107195273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF SAO LUCAS: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 14. EMEIF SAO SEBASTIAO (codigo: EMEIF_SÃO_SEBASTIÃO)
--    5 turmas, 47 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_SÃO_SEBASTIÃO';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('FMM901', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('F6M901', '6º Ano - Manhã', v_escola_id, '6', '2026', 'matutino', 35, false),
    ('F7M901', '7º Ano - Manhã', v_escola_id, '7', '2026', 'matutino', 35, false),
    ('F8M901', '8º Ano - Manhã', v_escola_id, '8', '2026', 'matutino', 35, false),
    ('F9M901', '9º Ano - Manhã', v_escola_id, '9', '2026', 'matutino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_fmm901 UUID;
  v_turma_f6m901 UUID;
  v_turma_f7m901 UUID;
  v_turma_f8m901 UUID;
  v_turma_f9m901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_SÃO_SEBASTIÃO';
  SELECT id INTO v_turma_fmm901 FROM turmas WHERE codigo = 'FMM901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f6m901 FROM turmas WHERE codigo = 'F6M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f7m901 FROM turmas WHERE codigo = 'F7M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8m901 FROM turmas WHERE codigo = 'F8M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9m901 FROM turmas WHERE codigo = 'F9M901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (FMM901) - 22 alunos
  v_result := fn_upsert_aluno_2026_v2('ANANDA GRAZIELA GOMES PANTOJA', v_escola_id, v_turma_fmm901, 'CRE', '2022-11-22', '10617335214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PIETRO GAEL CABRAL DOS SANTOS', v_escola_id, v_turma_fmm901, 'CRE', '2022-07-24', '10516326252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TALITA FERREIRA CÂ NDIDO', v_escola_id, v_turma_fmm901, 'CRE', '2022-06-21', '10386457271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNY AMÉLIA GOMES FERREIRA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-09-29', '70060482273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO DAVI SOUZA GOMES', v_escola_id, v_turma_fmm901, 'PRE1', '2021-06-29', '09893606284');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORENZO BRABO DA COSTA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-09-27', '09948533275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIEL AMORIM MACHADO', v_escola_id, v_turma_fmm901, 'PRE1', '2021-10-23', '10005280222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACE MIGUEL GOMES FERREIRA', v_escola_id, v_turma_fmm901, 'PRE1', '2021-09-29', '10068860285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARY PAULO MACIEL GOMESI', v_escola_id, v_turma_fmm901, 'PRE1', '2020-10-21', '09468141209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANTHONY TEIXEIRA FERREIRA', v_escola_id, v_turma_fmm901, '1', '2019-10-14', '08711385227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLLA POLIANA PEREIRA MACIEL', v_escola_id, v_turma_fmm901, '1', '2020-01-27', '09080276219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORENA AMORIM MACHADO', v_escola_id, v_turma_fmm901, '1', '2020-01-02', '08877417200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CASSIA MANUELA LIMA DA COSTA', v_escola_id, v_turma_fmm901, '2', '2018-11-25', '07936786252');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELLY SOPHIA SOUZA GOMES', v_escola_id, v_turma_fmm901, '2', '2019-01-17', '08133138213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÍCARO GOMES FERREIRA', v_escola_id, v_turma_fmm901, '2', '2018-05-14', '07631479232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA HELOISA RAMOS DO VALE', v_escola_id, v_turma_fmm901, '3', '2017-09-18', '10829861270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NATHALY SOFIA TEIXEIRA FERREIRA', v_escola_id, v_turma_fmm901, '3', '2017-07-17', '10164300279');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('APOLO PEREIRA MACIEL', v_escola_id, v_turma_fmm901, '4', '2016-10-26', '09421164296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KETELLEN JOELLY LIMA SENA', v_escola_id, v_turma_fmm901, '4', '2016-07-27', '07936798269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AMA NDA LIMA CARDOSO', v_escola_id, v_turma_fmm901, '5', '2014-11-22', '07256253257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIEL KAUÃ PANTOJA COSTA', v_escola_id, v_turma_fmm901, '5', '2016-08-24', '05575504247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORRAN BRABO DA COSTA', v_escola_id, v_turma_fmm901, '5', '2016-06-05', '05447826233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 6º Ano - Manhã (F6M901) - 4 alunos
  v_result := fn_upsert_aluno_2026_v2('MARCOS AMORIM MACHADO C', v_escola_id, v_turma_f6m901, '6', '2014-04-20', '08822695267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SABRINA TADEU SILV A', v_escola_id, v_turma_f6m901, '6', '2013-03-20', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELLEN VITÓRIA AMORIM DOS SANTOS', v_escola_id, v_turma_f6m901, '6', '2014-08-09', '09057319217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIVALDO TADEU SILVA', v_escola_id, v_turma_f6m901, '6', '2011-05-18', '09021247224');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 7º Ano - Manhã (F7M901) - 8 alunos
  v_result := fn_upsert_aluno_2026_v2('DAVI SOUZA DA SILVA', v_escola_id, v_turma_f7m901, '7', '2014-07-05', '08962245205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EFRAIN ASSUNÇÃO CORDILHO', v_escola_id, v_turma_f7m901, '7', '2013-11-24', '09046335275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JORGE HENRIQUE MORAES PEREIRA', v_escola_id, v_turma_f7m901, '7', '2013-07-04', '10279248245');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARLO AMORIN DOS SANTOS', v_escola_id, v_turma_f7m901, '7', '2014-03-07', '09009084248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATEUS DE ANDRADE GOMES', v_escola_id, v_turma_f7m901, '7', '2012-02-07', '10040074269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAISSA KAUANE PANTOJA COSTA', v_escola_id, v_turma_f7m901, '7', '2013-08-08', '04834622258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SABRINA DE ANDRADE GOMES', v_escola_id, v_turma_f7m901, '7', '2014-03-28', '10040078256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('STEPHANY MANUELA CARVALHO PANTOJA', v_escola_id, v_turma_f7m901, '7', '2014-12-30', '04837000290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Manhã (F8M901) - 7 alunos
  v_result := fn_upsert_aluno_2026_v2('ALEX SOUZA MACIEL', v_escola_id, v_turma_f8m901, '8', '2012-01-19', '09046252221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOISA TEIXEIRA ALMEIDA', v_escola_id, v_turma_f8m901, '8', '2013-04-02', '08439271271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IARLE GOMES FERREIRA', v_escola_id, v_turma_f8m901, '8', '2012-08-24', '09030259221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEREMIAS COSTA DO VALE', v_escola_id, v_turma_f8m901, '8', '2013-03-04', '09027687277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCINHO KEYSON AMORIM DOS SANTOS', v_escola_id, v_turma_f8m901, '8', '2012-10-22', '09057280256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAFIRA SOUZA DA SILVA', v_escola_id, v_turma_f8m901, '8', '2012-10-16', '08962229269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SÂMEA THAYNE BRABO DA COSTA', v_escola_id, v_turma_f8m901, '8', '2013-01-07', '09227798218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Manhã (F9M901) - 6 alunos
  v_result := fn_upsert_aluno_2026_v2('ALINE GOMES FERREIRA', v_escola_id, v_turma_f9m901, '9', '2020-05-13', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELAINE MICKELLY ALVES DOS SANTOS', v_escola_id, v_turma_f9m901, '9', '2011-11-13', '09036187290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EVELLY CAMILLY MACIEL TRINDADE', v_escola_id, v_turma_f9m901, '9', '2012-02-18', '08973603205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FÁBIO JÚNIOR DA CRUZ DE SOUZA', v_escola_id, v_turma_f9m901, '9', '2010-01-26', '09047815262');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO AMORIN DO VALE', v_escola_id, v_turma_f9m901, '9', '2010-08-01', '08962096285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KELVES DA CRUZ SOUZA', v_escola_id, v_turma_f9m901, '9', '2010-12-23', '08962204274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF SAO SEBASTIAO: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 15. EMEIF SAO FELIX (codigo: EMEIF_SÃO_FÉLIX)
--    7 turmas, 98 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_SÃO_FÉLIX';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('IUMP01', 'Multi-série - Manhã', v_escola_id, 'CRE', '2026', 'matutino', 35, true),
    ('I2MP01', 'Multi-série - Manhã', v_escola_id, 'PRE1', '2026', 'matutino', 35, true),
    ('F1MP01', '1º Ano - Manhã', v_escola_id, '1', '2026', 'matutino', 35, false),
    ('F2M901', '2º Ano - Manhã', v_escola_id, '2', '2026', 'matutino', 35, false),
    ('F3M901', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35, false),
    ('F4M901', '4º Ano - Manhã', v_escola_id, '4', '2026', 'matutino', 35, false),
    ('F5M901', '5º Ano - Manhã', v_escola_id, '5', '2026', 'matutino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_iump01 UUID;
  v_turma_i2mp01 UUID;
  v_turma_f1mp01 UUID;
  v_turma_f2m901 UUID;
  v_turma_f3m901 UUID;
  v_turma_f4m901 UUID;
  v_turma_f5m901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEIF_SÃO_FÉLIX';
  SELECT id INTO v_turma_iump01 FROM turmas WHERE codigo = 'IUMP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_i2mp01 FROM turmas WHERE codigo = 'I2MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1mp01 FROM turmas WHERE codigo = 'F1MP01' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f4m901 FROM turmas WHERE codigo = 'F4M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5m901 FROM turmas WHERE codigo = 'F5M901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- Multi-série - Manhã (IUMP01) - 26 alunos
  v_result := fn_upsert_aluno_2026_v2('AGATHA RAMOS VALENTE', v_escola_id, v_turma_iump01, 'CRE', '2022-06-28', '10419464220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CELSON JÚNIOR CASTRO DA SILVA', v_escola_id, v_turma_iump01, 'CRE', '2022-05-18', '10489102298');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIZA MANUELLE DA SILVA DE SOUZA', v_escola_id, v_turma_iump01, 'CRE', '2022-08-17', '10644098228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELOA DA SILVA DA COSTA', v_escola_id, v_turma_iump01, 'CRE', '2022-09-01', '10745950256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO VITOR DE PAULA ANDRADE', v_escola_id, v_turma_iump01, 'CRE', '2022-06-26', '10418847290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAILA VICTÓRIA PEREIRA DA SILVA', v_escola_id, v_turma_iump01, 'CRE', '2022-10-11', '10543161200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA JÚLIA PANTOJA SILVA', v_escola_id, v_turma_iump01, 'CRE', '2022-10-02', '10556323289');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO LUCAS LIMA CORDEIRO', v_escola_id, v_turma_iump01, 'CRE', '2022-07-22', '10423837230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAVI PEREIRA CASTRO', v_escola_id, v_turma_iump01, 'CRE', '2023-03-01', '10750442271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WENDEL KAUE PAMPLONA DA SILVA', v_escola_id, v_turma_iump01, 'CRE', '2023-01-04', '10787874256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YAN DA SILVA MORAES', v_escola_id, v_turma_iump01, 'CRE', '2022-08-15', '10464253233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CECILIA HELCA LOPES SANTOS', v_escola_id, v_turma_iump01, 'PRE1', '2021-05-19', '09762964209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DHENIFFER HIANNI DE SOUZA DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-30', '10334306256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDSON JÚNIOR OLIVEIRA FERREIRA', v_escola_id, v_turma_iump01, 'PRE1', '2021-11-01', '10079021247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELLOAH DA SILVA E SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-11-03', '10002301202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENZO GABRIEL FERREIRA DE SOUZA', v_escola_id, v_turma_iump01, 'PRE1', '2021-05-06', '09783697269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HITALO MURILO PINHEIRO DOS SANTOS', v_escola_id, v_turma_iump01, 'PRE1', '2021-07-12', '09850202297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEAN NICOLAS DA SILVA MONTEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2022-01-16', '10310311209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ PEDRO DE SOUZA CORDEIRO', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-20', '10226845230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAURILIO CORRÊA DOS SANTOS', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-12', '10064043258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NARLYSON ENDRYCK CORRÊA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-06-24', '09805342247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLAS PIETRO DOS SANTOS DA SILVA', v_escola_id, v_turma_iump01, 'PRE1', '2021-06-07', '09926101259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAVI ELIAS DOS SANTOS LIMA', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-03', '09976661290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RENZO MANO EL DA SILVA CASTRO', v_escola_id, v_turma_iump01, 'PRE1', '2021-12-03', '10360057209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAYMON MYLLER FERNANDES GOMES', v_escola_id, v_turma_iump01, 'PRE1', '2021-06-28', '09806238206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLAFFE DA SILVA DA COSTA', v_escola_id, v_turma_iump01, 'PRE1', '2021-08-29', '10055102298');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (I2MP01) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('AGATHA DOS SANTOS DA SILVAI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-09-19', '09871733240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALISSON XAVIER DA SILVAI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-08-01', '09377676207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNA SAMILLY CASTRO SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-05-29', '09258125282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CASSIA LETICIA DA SILVA SILVA', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-07-06', '10316092290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIEL DOS SANTOS BARRETO', v_escola_id, v_turma_i2mp01, 'PRE2', '2020-09-24', '09434902274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANIEL DOS SANTOS E SANTOSI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-05-15', '09895596294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIAS DA SILVA E SILVAI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-12-11', '10104282258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JASMYN SANTOS E SANTOSI', v_escola_id, v_turma_i2mp01, 'PRE1', '2021-03-30', '09826728292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEYVISON FURTADO DA SILVAI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-05-10', '10494262230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAUAN DA SILVA DOS REISI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-10-30', '10801578248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAUANE DE PAULA C ORDEIROI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-12-21', '11206884266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LÉO GABRIEL CORDEIRO DA SILVAI', v_escola_id, v_turma_i2mp01, 'PRE1', '2021-02-11', '09837033290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELINGTON LEVI PEREIRA DA SILVAI', v_escola_id, v_turma_i2mp01, 'PRE1', '2020-09-02', '09426570209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 1º Ano - Manhã (F1MP01) - 11 alunos
  v_result := fn_upsert_aluno_2026_v2('ABIMAEL SANTOS DA SILVA', v_escola_id, v_turma_f1mp01, '1', '2019-05-27', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AGNIS RAMOS VALENTE', v_escola_id, v_turma_f1mp01, '1', '2019-09-14', '08649678297');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNA CLARA MIRANDA DA SILVA', v_escola_id, v_turma_f1mp01, '1', '2019-12-04', '09894459250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CÁSSIO RODDRIGUES DA COSTA', v_escola_id, v_turma_f1mp01, '1', '2019-09-09', '09126665280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEFE RSON DE SOUZA CORDEIRO', v_escola_id, v_turma_f1mp01, '1', '2019-07-06', '08568942229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ HENRIQUE DA SILVA SOARES', v_escola_id, v_turma_f1mp01, '1', '2020-03-06', '09387477207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA EDUARDA DA SILVA SOUZA', v_escola_id, v_turma_f1mp01, '1', '2019-11-07', '09041403264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATEUS ANDRADE DOS SANTOS', v_escola_id, v_turma_f1mp01, '1', '2019-04-25', '08359552223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAVI DA SILVA E SILVA', v_escola_id, v_turma_f1mp01, '1', '2019-07-04', '08496733211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLYAN GABRIEL DA COSTA DA SILVA', v_escola_id, v_turma_f1mp01, '1', '2019-07-11', '08596862218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YAGO DA SILVA MORAES', v_escola_id, v_turma_f1mp01, '1', '2020-02-24', '10409717258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 2º Ano - Manhã (F2M901) - 11 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA LÚCIA SILVA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2019-01-04', '09126624257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANNALICY MIRANDA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-09-18', '08226560276');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CARLA SOFIA DA SILVA DE LIMA', v_escola_id, v_turma_f2m901, '2', '2018-11-30', '08547042210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLOVIST SOUZA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-05-08', '11011755246');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DHEMILY HIANNA DE SOUZA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-04-20', '07431129203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIÁBER CORREA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-07-02', '08176927201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMERSON DOS SANTOS MARTINS', v_escola_id, v_turma_f2m901, '2', '2018-02-24', '11217783210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADYEL DE JESUS CARDOSO DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-05-06', '10595110290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELLIGTON SILVA DA COSTA', v_escola_id, v_turma_f2m901, '2', '2018-08-05', '07509392225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM FARIAS DA SILVA', v_escola_id, v_turma_f2m901, '2', '2019-02-14', '08211561280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('YASMIM SILVA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-08-17', '08851189285');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M901) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('ARTHU VINICIUS SOUZA BEZERRA', v_escola_id, v_turma_f3m901, '3', '2017-07-29', '10217219217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLA FIGUEIREDO DOS REIS', v_escola_id, v_turma_f3m901, '3', '2017-07-17', '10183580214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLLA SOPHIA AMARAL DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2017-07-19', '10038112213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('AYLON MURILO VALES DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2018-03-19', '07169769271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDO COUTINHO DA SILVA', v_escola_id, v_turma_f3m901, '3', '2018-10-29', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMANOEL DA SILVA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-11-30', '07230285240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HELLEN MONIQUE CAMPOS SOUZA', v_escola_id, v_turma_f3m901, '3', '2018-03-21', '07317559288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA LUIZA DA SILVA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2017-04-17', '06339596266');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATEUS DA SILVA D E SOUZA', v_escola_id, v_turma_f3m901, '3', '2018-03-26', '07277231201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MATEUS LOPES GOMES', v_escola_id, v_turma_f3m901, '3', '2018-03-26', '07284647213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SOPHIA DA SILVA DA COSTA', v_escola_id, v_turma_f3m901, '3', '2017-07-07', '10242854214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SUELEM DA SILVA DE SOUZA', v_escola_id, v_turma_f3m901, '3', '2017-12-29', '07560726208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILAMYS DA COSTA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2018-02-16', '07230738210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 4º Ano - Manhã (F4M901) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('ANA PAULA SANTOS DA SILVA', v_escola_id, v_turma_f4m901, '4', '2015-07-27', '10733327214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA SIMARA DOS SANTOS DA SILVA', v_escola_id, v_turma_f4m901, '4', '2017-01-30', '09087165242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARIELSON PUREZA DA SILVA', v_escola_id, v_turma_f4m901, '4', '2016-08-08', '09095171264');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HADASSA CARDOSO DA SILVA', v_escola_id, v_turma_f4m901, '4', '2015-05-24', '10314073248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HENRY KAUAN FARIAS XAVIER', v_escola_id, v_turma_f4m901, '4', '2015-12-27', '09423521223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ CORDEIRO DA SILVA', v_escola_id, v_turma_f4m901, '4', '2017-02-08', '10211391220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LORENZO DA SILVA LOBATO', v_escola_id, v_turma_f4m901, '4', '2017-02-17', '10703282271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUAN DOUGLAS DE PAULA ANDRADE', v_escola_id, v_turma_f4m901, '4', '2016-10-14', '09391319270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUAN E SANTOS DA SILVA', v_escola_id, v_turma_f4m901, '4', '2014-01-27', '10733321283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCIANA CO RDEIRO DE PAULA', v_escola_id, v_turma_f4m901, '4', '2016-03-20', '11495958256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAILSON DA SILVA DA COSTA', v_escola_id, v_turma_f4m901, '4', '2016-04-05', '09057614219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SANDRO RODRIGUES DA COSTA', v_escola_id, v_turma_f4m901, '4', '2017-02-20', '09056217275');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Manhã (F5M901) - 12 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIEL DA SILVA DE SOUZA', v_escola_id, v_turma_f5m901, '5', '2015-10-25', '08843736221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALCIANE SANTOS DA SILVA', v_escola_id, v_turma_f5m901, '5', '2012-05-19', '10733316280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE DOS SANTOS DA SILVA', v_escola_id, v_turma_f5m901, '5', '2015-03-18', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLADSON SOUZA DA SILVA', v_escola_id, v_turma_f5m901, '5', '2014-05-30', '09029055300');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMILLY AWANNY SOUZA SILVA', v_escola_id, v_turma_f5m901, '5', '2014-04-26', '08993581273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('INGRID LOHANNY DA SILVA CASTRO', v_escola_id, v_turma_f5m901, '5', '2015-07-30', '09029112280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JANDERSON LUIZ RAMOS DE OLIVEIRA', v_escola_id, v_turma_f5m901, '5', '2014-07-26', '04257509228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSUÉ SILVA DE LIMA', v_escola_id, v_turma_f5m901, '5', '2015-09-17', '08821319237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ GUILHERME DA SILVA DA SILVA', v_escola_id, v_turma_f5m901, '5', '2015-05-27', '09049306292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA HELOISA SILVA D A SILVA', v_escola_id, v_turma_f5m901, '5', '2015-12-26', NULL);
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAMIRES DA SILVA DA COSTA', v_escola_id, v_turma_f5m901, '5', '2015-02-11', '09057572206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAYLLA KAUANE DA SILVA RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2015-06-15', '09056191292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEIF SAO FELIX: % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- 16. EMEF VER. ENGRACIO (P. DA SILVA) (codigo: EMEF_VER._ENGRÁCIO)
--    7 turmas, 167 alunos
-- ============================================================

DO $$
DECLARE
  v_escola_id UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEF_VER._ENGRÁCIO';

  INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo, turno, capacidade_maxima, multiserie)
  VALUES
    ('F1M901', '1º Ano - Manhã', v_escola_id, '1', '2026', 'matutino', 35, false),
    ('F2M901', 'Multi-série - Manhã', v_escola_id, '2', '2026', 'matutino', 35, true),
    ('F3M902', '3º Ano - Manhã', v_escola_id, '3', '2026', 'matutino', 35, false),
    ('F4M902', '4º Ano - Manhã', v_escola_id, '4', '2026', 'matutino', 35, false),
    ('F5M901', '5º Ano - Manhã', v_escola_id, '5', '2026', 'matutino', 35, false),
    ('F8T902', '8º Ano - Tarde', v_escola_id, '8', '2026', 'vespertino', 35, false),
    ('F9T901', '9º Ano - Tarde', v_escola_id, '9', '2026', 'vespertino', 35, false)
  ON CONFLICT (escola_id, codigo, ano_letivo) DO NOTHING;
END $$;

DO $$
DECLARE
  v_escola_id UUID;
  v_turma_f1m901 UUID;
  v_turma_f2m901 UUID;
  v_turma_f3m902 UUID;
  v_turma_f4m902 UUID;
  v_turma_f5m901 UUID;
  v_turma_f8t902 UUID;
  v_turma_f9t901 UUID;
  v_count INT := 0;
  v_result TEXT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = 'EMEF_VER._ENGRÁCIO';
  SELECT id INTO v_turma_f1m901 FROM turmas WHERE codigo = 'F1M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m902 FROM turmas WHERE codigo = 'F3M902' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f4m902 FROM turmas WHERE codigo = 'F4M902' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5m901 FROM turmas WHERE codigo = 'F5M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t902 FROM turmas WHERE codigo = 'F8T902' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- 1º Ano - Manhã (F1M901) - 40 alunos
  v_result := fn_upsert_aluno_2026_v2('ANDRÉ FELIPE MIRANDA BARBOSA', v_escola_id, v_turma_f1m901, '1', '2019-06-01', '08526928201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRENDON COSTA DA CRUZ', v_escola_id, v_turma_f1m901, '1', '2019-05-01', '08600123283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DOUGLAS COSTA PA TACHO', v_escola_id, v_turma_f1m901, '1', '2019-04-07', '08496596206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEIDSON KAUAN MACHADO SALES', v_escola_id, v_turma_f1m901, '1', '2019-12-23', '10160791251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HIGOR LAUAN MACHADO DA COSTA', v_escola_id, v_turma_f1m901, '1', '2019-05-04', '08996797227');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ITALO TIAGO ANDRADE RODRIGUES', v_escola_id, v_turma_f1m901, '1', '2019-12-06', '09046669211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JADE SOFIA COSTA TAVARES', v_escola_id, v_turma_f1m901, '1', '2019-10-01', '08684814240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JENNIFER PATACHO DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-05-20', '08419376213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATAS DAVI DA SILVA TAVARES', v_escola_id, v_turma_f1m901, '1', '2019-09-01', '09459807283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOICE PEREIRA VILHENA', v_escola_id, v_turma_f1m901, '1', '2019-07-17', '08610222209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ TAVARES DA SILVA', v_escola_id, v_turma_f1m901, '1', '2020-01-06', '09064279241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAIO VINICIUS TAVARES DA COSTA', v_escola_id, v_turma_f1m901, '1', '2019-11-27', '09313769204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIS GUSTAVO DE LIMA MARTINS', v_escola_id, v_turma_f1m901, '1', '2019-12-24', '09042445203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ MIGUEL VILHENA BRITO', v_escola_id, v_turma_f1m901, '1', '2020-03-01', '10360030270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA JÚLIA RODRIGUES CASTRO', v_escola_id, v_turma_f1m901, '1', '2019-11-26', '09028399267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NICOLE LORENA BANDEIRA DE OLIVEIRA', v_escola_id, v_turma_f1m901, '1', '2019-04-26', '09050316280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO BEMJAMIM DE SOUZA RAMOS', v_escola_id, v_turma_f1m901, '1', '2020-02-05', '09171156202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RUANDERSON DA SILVA MARTINS', v_escola_id, v_turma_f1m901, '1', '2019-04-24', '08463763260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VINICIUS MIRANDA RAMOS', v_escola_id, v_turma_f1m901, '1', '2019-07-21', '08549383201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WELLIGTON DA SILVA GOMES', v_escola_id, v_turma_f1m901, '1', '2019-11-03', '09019802213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNA GABRIELLA DA COSTA FREIRE', v_escola_id, v_turma_f1m901, '1', '2009-04-08', '08439293240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELITON DOS SANTOS VALES', v_escola_id, v_turma_f1m901, '1', '2019-05-01', '08577772209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ERLON JÚNIOR MACHADO LOPES', v_escola_id, v_turma_f1m901, '1', '2019-04-19', '08784074213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GISELA DE FREITAS MAIA', v_escola_id, v_turma_f1m901, '1', '2019-05-31', '08675038232');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HEITOR KAUÃ ANDRADE DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-10-03', '08673097258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZIS RUANA RODRIGUES MACHADO', v_escola_id, v_turma_f1m901, '1', '2020-01-25', '09063132280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOANDENSON MARTINS PEREIRA', v_escola_id, v_turma_f1m901, '1', '2019-08-02', '08569314205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JUTITH DA SILVA FARIAS', v_escola_id, v_turma_f1m901, '1', '2019-06-05', '09056589229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUANY NUNES RODRIGUES', v_escola_id, v_turma_f1m901, '1', '2019-03-31', '08457580205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KAUÊ LIMA DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-04-20', '08526759256');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LEANDRO MELO VALE', v_escola_id, v_turma_f1m901, '1', '2019-12-11', '10906140200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUIZ OTÁVIO COSTA DE FREITAS', v_escola_id, v_turma_f1m901, '1', '2020-01-22', '09069908239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO HENRIQUE MACHADO TAVARES', v_escola_id, v_turma_f1m901, '1', '2019-08-07', '08695608247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAIANA DA SILVA ANDRADE', v_escola_id, v_turma_f1m901, '1', '2020-03-05', '09450282293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RHAYLA DA SILVA ANDRADE', v_escola_id, v_turma_f1m901, '1', '2019-12-30', '08979385269');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RODRIGO KAIO DA SILVA COSTA', v_escola_id, v_turma_f1m901, '1', '2019-09-11', '09244213206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAFIRA DOS ANJOS DA COSTA', v_escola_id, v_turma_f1m901, '1', '2019-08-31', '08610277283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THÁMILY VITÓRIA DE LIMA DE OLIVEIRA', v_escola_id, v_turma_f1m901, '1', '2020-01-02', '09038467214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VALENTINA BRITO MIRANDA', v_escola_id, v_turma_f1m901, '1', '2019-11-11', '08812638260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('VITÓRIA MANUELE PEREIRA DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-08-15', '09451302280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- Multi-série - Manhã (F2M901) - 32 alunos
  v_result := fn_upsert_aluno_2026_v2('ACSA JULIANE CATARINO OLIVEIRA', v_escola_id, v_turma_f2m901, '2', '2018-05-08', '07437106221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALDEMIR VALE BRITO', v_escola_id, v_turma_f2m901, '2', '2018-06-17', '07553585203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICIA PYETRA DE SOUZA RAMOS', v_escola_id, v_turma_f2m901, '2', '2018-10-01', '08098073270');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDRÉA YASMIM DE SOUZA RAMOS', v_escola_id, v_turma_f2m901, '2', '2018-01-18', '11286063213');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR CARDOSO FREIRE', v_escola_id, v_turma_f2m901, '2', '2018-04-22', '07409807261');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIVIA VALE BARBOSA', v_escola_id, v_turma_f2m901, '2', '2018-08-26', '07572445217');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ESTEFANY ELIANY SILVA MAIA', v_escola_id, v_turma_f2m901, '2', '2018-09-13', '07651504259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GEYZE GABRIELLY MIRANDA ANDRADE', v_escola_id, v_turma_f2m901, '2', '2019-01-03', '08162554238');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JÉSSICA DOS SANTOS DA SILVA', v_escola_id, v_turma_f2m901, '2', '2019-02-18', '08392047281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHENIFER VITÓRIA TADEU MARTINS', v_escola_id, v_turma_f2m901, '2', '2018-12-13', '08322777205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LOHANE CHRISTINE LEAL BARBOSA', v_escola_id, v_turma_f2m901, '2', '2019-02-18', '08746012230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA ELOIZA DA SILVA VALES', v_escola_id, v_turma_f2m901, '2', '2019-02-15', '08216368208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PEDRO DE JESUS MORAES TEIXEIRA', v_escola_id, v_turma_f2m901, '2', '2018-08-03', '07583062292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAMON RAMOS DE PINHO', v_escola_id, v_turma_f2m901, '2', '2019-02-28', '08167155218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAEMYLLI DE FREITAS MAIA', v_escola_id, v_turma_f2m901, '2', '2018-07-04', '07560883214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ACSA MIRANDA DA COSTA', v_escola_id, v_turma_f2m901, '2', '2018-04-04', '07131120260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÁDRYA PEREIRA RODRIGUES', v_escola_id, v_turma_f2m901, '2', '2018-10-14', '07645543280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALANA TAYSSA PEREIRA MACHADO', v_escola_id, v_turma_f2m901, '2', '2018-07-25', '07565663204');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANTONY DA SILVA VILENA', v_escola_id, v_turma_f2m901, '2', '2018-07-25', '08221155225');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAFINNY BARBOSA SOUZA', v_escola_id, v_turma_f2m901, '2', '2018-07-10', '07505521233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DORALICE MENEZES VILHENA', v_escola_id, v_turma_f2m901, '2', '2015-09-04', '11263220240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELIZA TEIXEIRA FERREIRA', v_escola_id, v_turma_f2m901, '2', '2018-06-07', '07355956230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GABRIEL JÚNIOR DO AMARAL E AMARAL', v_escola_id, v_turma_f2m901, '2', '2019-01-18', '08346041241');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZADORA MENEZES VILHENA', v_escola_id, v_turma_f2m901, '2', '2017-12-18', '11263289282');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEAN CARLOS PEREIRA BRANDÃO', v_escola_id, v_turma_f2m901, '2', '2018-06-13', '08112937265');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JESUS MILLER DE SOUZA PEREIRA', v_escola_id, v_turma_f2m901, '2', '2019-03-18', '08274392299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHEFFERSON EMANUEL SOUZA GOMES', v_escola_id, v_turma_f2m901, '2', '2018-12-25', '08221033200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JONATAS DE LIMA MARINHO', v_escola_id, v_turma_f2m901, '2', '2018-11-05', '07952723243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PAULO HENRIQUE DA SILVA LEAL', v_escola_id, v_turma_f2m901, '2', '2018-04-30', '07692602255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAILSON PINHO BALIEIRO', v_escola_id, v_turma_f2m901, '2', '2018-09-12', '08020208283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SERGIO DE OLIVEIRA MAIA', v_escola_id, v_turma_f2m901, '2', '2018-12-28', '07985648224');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAIANA DE FREITAS MAGALHÃES', v_escola_id, v_turma_f2m901, '2', '2018-09-25', '07590052221');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 3º Ano - Manhã (F3M902) - 13 alunos
  v_result := fn_upsert_aluno_2026_v2('GIRLAN JÚNIOR MORAES TAVARES', v_escola_id, v_turma_f3m902, '3', '2017-11-06', '08969062211');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÍTALLO ROYAN DA SILVA ANDRADE', v_escola_id, v_turma_f3m902, '3', '2017-08-06', '71130398200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEYSA RAFAELA FIUZA DA COSTA', v_escola_id, v_turma_f3m902, '3', '2017-10-22', '10636908208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHONATANAEL MARTINS PEREIRA', v_escola_id, v_turma_f3m902, '3', '2017-07-09', '10257356258');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO DOS SANTOS BALIEIRO', v_escola_id, v_turma_f3m902, '3', '2017-07-29', '10227430239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JORGE NETO DA COSTA DA COSTA', v_escola_id, v_turma_f3m902, '3', '2016-05-11', '09647443250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JULIANE DOS SANTOS DA SILVA', v_escola_id, v_turma_f3m902, '3', '2017-04-13', '10121446239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LAEL DA SILVA VALE', v_escola_id, v_turma_f3m902, '3', '2017-06-09', '08944355231');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LUCAS DA COSTA DE LIMA', v_escola_id, v_turma_f3m902, '3', '2017-11-23', '09263515247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAFAEL VILHENA BRITO', v_escola_id, v_turma_f3m902, '3', '2017-12-04', '07389080299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SOFIA RAMOS DE PINHO', v_escola_id, v_turma_f3m902, '3', '2017-05-12', '06227734292');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('THAYLA GABRIELLY BARBOSA CAVALCANTE', v_escola_id, v_turma_f3m902, '3', '2017-09-26', '07922068271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACE GONÇALVES DA SILVA DOS SANTOS', v_escola_id, v_turma_f3m902, '3', '2016-06-02', '10172349222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 4º Ano - Manhã (F4M902) - 19 alunos
  v_result := fn_upsert_aluno_2026_v2('ADENILSON VALE BRITO', v_escola_id, v_turma_f4m902, '4', '2016-11-05', '10271018283');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE DE OLIVEIRA MAIA', v_escola_id, v_turma_f4m902, '4', '2016-08-04', '10362514208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALYSON PEREIRA RODRIGUES', v_escola_id, v_turma_f4m902, '4', '2016-06-11', '10252092228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDREA JÚLIA CATARINO OLIVEIRA', v_escola_id, v_turma_f4m902, '4', '2016-11-15', '09650437207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EDUARDO PEREIRA VALE', v_escola_id, v_turma_f4m902, '4', '2016-12-22', '08415202245');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELISA ANDRADE DE LIMA', v_escola_id, v_turma_f4m902, '4', '2017-01-16', '09498097216');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELLEM DOS SANTOS VALE', v_escola_id, v_turma_f4m902, '4', '2016-03-14', '10172708214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('EMERSON PINHO BALIEIRO', v_escola_id, v_turma_f4m902, '4', '2016-10-08', '10227550218');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GIRLAN PEREIRA BRANDÃO', v_escola_id, v_turma_f4m902, '4', '2015-01-16', '10613962230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HENRIQUE FREIRE DA SILVA', v_escola_id, v_turma_f4m902, '4', '2016-09-16', '08912028200');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JESUS LEAL BARBOSA', v_escola_id, v_turma_f4m902, '4', '2016-08-19', '08982935290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOAB VALES DA SILVA', v_escola_id, v_turma_f4m902, '4', '2016-12-22', '10166740233');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MAYANE DOS SANTOS BRITO', v_escola_id, v_turma_f4m902, '4', '2015-08-03', '10688038271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MESSIAS RODRIGUES E RODRIGUES', v_escola_id, v_turma_f4m902, '4', '2015-10-11', '70451488288');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MISSIELE BRITO DA SILVA', v_escola_id, v_turma_f4m902, '4', '2017-01-26', '09435785239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NAIANE YASMIM AMARAL DO AMARAL', v_escola_id, v_turma_f4m902, '4', '2017-02-26', '09664016209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAMON BELÉM FERREIRA', v_escola_id, v_turma_f4m902, '4', '2016-08-05', '10172118255');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SOPHIA FREIRE DE LIMA', v_escola_id, v_turma_f4m902, '4', '2016-08-22', '09650036202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('TAMIRES DE FREITAS MAIA', v_escola_id, v_turma_f4m902, '4', '2014-09-10', '09024499243');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 5º Ano - Manhã (F5M901) - 26 alunos
  v_result := fn_upsert_aluno_2026_v2('ADRIANO DA SILVA VALES', v_escola_id, v_turma_f5m901, '5', '2014-05-15', '08920839212');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ÁGATHA CRISTINA RODRIGUES CASTRO', v_escola_id, v_turma_f5m901, '5', '2015-11-30', '08868892278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALLAN EMANOEL DA SILVA CAMPOS', v_escola_id, v_turma_f5m901, '5', '2015-12-20', '09379049293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA LÍVIA DA COSTA TAVARES', v_escola_id, v_turma_f5m901, '5', '2015-05-16', '08996754250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANA SOFIA SANTANA MELO', v_escola_id, v_turma_f5m901, '5', '2013-08-26', '09837090251');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDERSON GABRIEL VALE BARBOSA', v_escola_id, v_turma_f5m901, '5', '2015-07-25', '10177864290');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BEATRIZ VALE DE PAULA', v_escola_id, v_turma_f5m901, '5', '2015-04-23', '08968094209');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLEIANE DOS SANTOS BALIEIRO', v_escola_id, v_turma_f5m901, '5', '2015-04-24', '09029557214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLEVISON FREITAS MAIA', v_escola_id, v_turma_f5m901, '5', '2012-05-09', '09022425207');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUCAS DE OLIVEIRA PENA', v_escola_id, v_turma_f5m901, '5', '2015-04-28', '05280778214');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DAVI LUIZ DE OLIVEIRA PENA', v_escola_id, v_turma_f5m901, '5', '2015-04-28', '05280813222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ENDRYA MARCELLY FARIAS RAMOS', v_escola_id, v_turma_f5m901, '5', '2015-05-06', '09037268271');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JHEMILLY GONÇALVES DA SILVA', v_escola_id, v_turma_f5m901, '5', '2015-07-05', '08869376206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOELSON VALES DA SILVA', v_escola_id, v_turma_f5m901, '5', '2014-09-20', '08994504230');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOILSON BRITO SILVA', v_escola_id, v_turma_f5m901, '5', '2016-01-14', '09721880299');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSY KAMILY DA SILVA TAVARES', v_escola_id, v_turma_f5m901, '5', '2015-07-15', '08943577273');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KASSIANE GABRIELLY DA COSTA DE LIMA', v_escola_id, v_turma_f5m901, '5', '2015-09-16', '09263504202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LARISSA VITÓRIA BRITO SALES', v_escola_id, v_turma_f5m901, '5', '2016-03-04', '09259979277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA CLARA RAMOS DE PINHO', v_escola_id, v_turma_f5m901, '5', '2015-03-26', '10211355267');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIA PAULA NUNES RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2015-11-12', '08978203205');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARIELSON RODRIGUE RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2014-02-17', '09026311281');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('NATALLINE DE FREITAS VIEIRA', v_escola_id, v_turma_f5m901, '5', '2015-12-25', '09023700228');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RAIDY DE FREITAS DA SILVA', v_escola_id, v_turma_f5m901, '5', '2015-08-06', '09103197239');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('RIAN ANTÔNY DA COSTA FARIAS', v_escola_id, v_turma_f5m901, '5', '2015-05-18', '09051861257');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALLACE PEREIRA RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2015-02-19', '09012034248');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WAYLON CAYCK SILVA RODRIGUES', v_escola_id, v_turma_f5m901, '5', '2015-01-15', '10143990250');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 8º Ano - Tarde (F8T902) - 14 alunos
  v_result := fn_upsert_aluno_2026_v2('DIEGO GONÇALVES DA SILVA', v_escola_id, v_turma_f8t902, '8', '2011-11-17', '08869322203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ELUAN PEREIRA VALE', v_escola_id, v_turma_f8t902, '8', '2011-01-19', '08968235201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FRANCIELE DA SILVA VALE', v_escola_id, v_turma_f8t902, '8', '2012-03-18', '08944313237');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('GUSTAVO FREITAS MAGALHAES', v_escola_id, v_turma_f8t902, '8', '2012-02-17', '08844035219');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JEFFERSON LIMA DE FREITAS', v_escola_id, v_turma_f8t902, '8', '2010-10-11', '08996062294');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOEL FERREIRA DA COSTA', v_escola_id, v_turma_f8t902, '8', '2012-07-08', '08896806208');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOSÉ GUILHERME LIMA DOS SANTOS', v_escola_id, v_turma_f8t902, '8', '2011-10-10', '08861221203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KETLEY NICOLLY MIRANDA DA SILVA', v_escola_id, v_turma_f8t902, '8', '2010-11-09', '08934772220');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KEVELLYN VALE DE PAULA', v_escola_id, v_turma_f8t902, '8', '2011-05-15', '08968034222');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARILYS COSTA CHAVE', v_escola_id, v_turma_f8t902, '8', '2009-08-29', '10785303278');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARILIA DOS SANTOS BRITO', v_escola_id, v_turma_f8t902, '8', '2011-07-01', '09039142203');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MELISSA VALE BRITO', v_escola_id, v_turma_f8t902, '8', '2012-02-02', '09027286280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMIR VALE BRITO', v_escola_id, v_turma_f8t902, '8', '2010-04-21', '09027271259');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WILLIAM VALE DE PAULA', v_escola_id, v_turma_f8t902, '8', '2013-02-24', '08968067236');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  -- 9º Ano - Tarde (F9T901) - 23 alunos
  v_result := fn_upsert_aluno_2026_v2('ÁGATA BELÉM FERREIRA', v_escola_id, v_turma_f9t901, '9', '2012-02-20', '09039226229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALESSANDRA LIMA DE OLIVEIRA', v_escola_id, v_turma_f9t901, '9', '2007-10-26', '08995854260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ALICE VALE BRITO', v_escola_id, v_turma_f9t901, '9', '2008-07-18', '09027251223');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ANDREI VILHENA VALE', v_escola_id, v_turma_f9t901, '9', '2009-06-28', '09021420201');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ARTHUR DE LIMA DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2009-12-03', '08861187277');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('BRUNA MARA BRITO PANTOJA', v_escola_id, v_turma_f9t901, '9', '2011-11-14', '09029899280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('CLARICE DA SILVA VILENA', v_escola_id, v_turma_f9t901, '9', '2011-07-08', '09028359206');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('DANYELE DA SILVA DA SILVA', v_escola_id, v_turma_f9t901, '9', '2007-07-02', '55699405291');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('FERNANDA SILVA DE OLIVEIRA', v_escola_id, v_turma_f9t901, '9', '2010-12-07', '08921281274');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('HUGO COSTA DE FREITAS', v_escola_id, v_turma_f9t901, '9', '2011-09-29', '09007900242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('IZABELE LIMA DA COSTA', v_escola_id, v_turma_f9t901, '9', '2011-06-10', '08946257210');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JAIME BRILHANTE DE MELO', v_escola_id, v_turma_f9t901, '9', '2011-10-14', '11552759253');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('JOÃO GABRIEL BARBOSA CAVALCANTE', v_escola_id, v_turma_f9t901, '9', '2011-01-25', '08971957280');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('KÊMILY VITORIA DA COSTA SOARES', v_escola_id, v_turma_f9t901, '9', '2011-06-10', '08920522286');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('LIGIA VILENA DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-10-30', '08986214296');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('MARCELA RODRIGUES DE SOUZA', v_escola_id, v_turma_f9t901, '9', '2012-04-21', '09029199202');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('PÂMELA BARBOSA ANDRADE', v_escola_id, v_turma_f9t901, '9', '2011-12-24', '08884513260');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('ROBERTH DE FREITAS DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-03-17', '09013129242');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SAMILE RODRIGUES MARINHO', v_escola_id, v_turma_f9t901, '9', '2012-04-09', '09032871293');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('SARA SOARES COSTA', v_escola_id, v_turma_f9t901, '9', '2011-08-11', '08862601247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WALACE MIRANDA BARBOSA', v_escola_id, v_turma_f9t901, '9', '2011-11-08', '08963373240');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WANDERSON DA SILVA NASCIMENTO', v_escola_id, v_turma_f9t901, '9', '2012-02-07', '08843305247');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;
  v_result := fn_upsert_aluno_2026_v2('WEBSON MONTEIRO DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-07-06', '08876094229');
  IF v_result = 'INSERIDO' THEN v_count := v_count + 1; END IF;

  RAISE NOTICE '>>> EMEF VER. ENGRACIO (P. DA SILVA): % novos alunos inseridos', v_count;
END $$;

-- ============================================================
-- RESUMO FINAL
-- ============================================================
DO $$
DECLARE
  v_rec RECORD;
  v_total INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO MATRÍCULAS 2026';
  RAISE NOTICE '========================================';

  FOR v_rec IN
    SELECT e.nome, COUNT(a.id) as total
    FROM escolas e
    JOIN alunos a ON a.escola_id = e.id AND a.ano_letivo = '2026' AND a.situacao = 'cursando'
    WHERE e.polo_id = (SELECT id FROM polos WHERE codigo = 'SSBV')
    GROUP BY e.nome
    ORDER BY e.nome
  LOOP
    RAISE NOTICE '  % : % alunos', v_rec.nome, v_rec.total;
    v_total := v_total + v_rec.total;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL GERAL: % alunos cursando em 2026', v_total;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Limpar função temporária (opcional - execute separadamente se desejar)
-- DROP FUNCTION IF EXISTS fn_upsert_aluno_2026_v2;
