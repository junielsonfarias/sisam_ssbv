-- ============================================
-- FIX: Corrigir alunos da N.S. Lourdes que ficaram em 2025
-- após a unificação das escolas
--
-- Problema: A unificação deletou os registros 2026 dos alunos
-- que já existiam em 2025 na escola original, sem atualizar
-- os registros de 2025 para 2026.
--
-- Solução: Re-executar o upsert para todos os 206 alunos,
-- agora na escola unificada (código 15560350).
-- ============================================

-- Primeiro, diagnóstico
DO $$
DECLARE
  v_escola_id UUID;
  v_total_2025 INT;
  v_total_2026 INT;
  v_total_geral INT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = '15560350' AND ativo = true;
  SELECT COUNT(*) INTO v_total_geral FROM alunos WHERE escola_id = v_escola_id;
  SELECT COUNT(*) INTO v_total_2025 FROM alunos WHERE escola_id = v_escola_id AND ano_letivo = '2025';
  SELECT COUNT(*) INTO v_total_2026 FROM alunos WHERE escola_id = v_escola_id AND ano_letivo = '2026';
  RAISE NOTICE 'DIAGNÓSTICO ANTES DA CORREÇÃO:';
  RAISE NOTICE '  Escola ID: %', v_escola_id;
  RAISE NOTICE '  Total alunos: %', v_total_geral;
  RAISE NOTICE '  Alunos 2025: %', v_total_2025;
  RAISE NOTICE '  Alunos 2026: %', v_total_2026;
  RAISE NOTICE '  Faltam para 206: %', 206 - v_total_2026;
END $$;

-- Função auxiliar de upsert
CREATE OR REPLACE FUNCTION fn_fix_aluno_2026(
  p_nome TEXT,
  p_escola_id UUID,
  p_turma_id UUID,
  p_serie TEXT,
  p_data_nascimento DATE,
  p_data_matricula DATE,
  p_responsavel TEXT,
  p_telefone TEXT,
  p_endereco TEXT,
  p_pcd BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_aluno_id UUID;
BEGIN
  -- Buscar aluno por nome na escola (qualquer ano_letivo)
  SELECT id INTO v_aluno_id
  FROM alunos
  WHERE escola_id = p_escola_id
    AND UPPER(TRIM(nome)) = UPPER(TRIM(p_nome))
  ORDER BY
    CASE WHEN data_nascimento = p_data_nascimento THEN 0 ELSE 1 END,
    criado_em DESC
  LIMIT 1;

  IF v_aluno_id IS NOT NULL THEN
    -- Atualizar para 2026
    UPDATE alunos SET
      turma_id = p_turma_id,
      serie = p_serie,
      ano_letivo = '2026',
      data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
      data_matricula = COALESCE(p_data_matricula, data_matricula),
      responsavel = COALESCE(p_responsavel, responsavel),
      telefone_responsavel = COALESCE(p_telefone, telefone_responsavel),
      endereco = COALESCE(p_endereco, endereco),
      pcd = p_pcd,
      situacao = 'cursando',
      ativo = true,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE id = v_aluno_id;
  ELSE
    -- Inserir novo
    INSERT INTO alunos (
      nome, escola_id, turma_id, serie, ano_letivo,
      data_nascimento, data_matricula, responsavel,
      telefone_responsavel, endereco, pcd, situacao
    ) VALUES (
      p_nome, p_escola_id, p_turma_id, p_serie, '2026',
      p_data_nascimento, p_data_matricula, p_responsavel,
      p_telefone, p_endereco, p_pcd, 'cursando'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Re-executar upsert para todos os 206 alunos
DO $$
DECLARE
  v_escola_id UUID;
  v_turma_f1m901 UUID;
  v_turma_f1t901 UUID;
  v_turma_f2m901 UUID;
  v_turma_f2t901 UUID;
  v_turma_f3m901 UUID;
  v_turma_f3t901 UUID;
  v_turma_f4m901 UUID;
  v_turma_f4t901 UUID;
  v_turma_f5m901 UUID;
  v_turma_f5t901 UUID;
  v_turma_f8t901 UUID;
  v_turma_f9t901 UUID;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = '15560350' AND ativo = true;
  SELECT id INTO v_turma_f1m901 FROM turmas WHERE codigo = 'F1M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f1t901 FROM turmas WHERE codigo = 'F1T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2m901 FROM turmas WHERE codigo = 'F2M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f2t901 FROM turmas WHERE codigo = 'F2T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3m901 FROM turmas WHERE codigo = 'F3M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f3t901 FROM turmas WHERE codigo = 'F3T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f4m901 FROM turmas WHERE codigo = 'F4M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f4t901 FROM turmas WHERE codigo = 'F4T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5m901 FROM turmas WHERE codigo = 'F5M901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f5t901 FROM turmas WHERE codigo = 'F5T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f8t901 FROM turmas WHERE codigo = 'F8T901' AND escola_id = v_escola_id AND ano_letivo = '2026';
  SELECT id INTO v_turma_f9t901 FROM turmas WHERE codigo = 'F9T901' AND escola_id = v_escola_id AND ano_letivo = '2026';

  -- F1M901 - 1º Ano Manhã (15)
  PERFORM fn_fix_aluno_2026('ALESSANDRO MARQUES MORAES', v_escola_id, v_turma_f1m901, '1', '2019-04-10', '2026-02-19', 'LEIDIANE OLIVEIRA MARQUES', '991714535', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('ANTHONY CAUÊ SERRÃO DO NASCIMENTO', v_escola_id, v_turma_f1m901, '1', '2020-02-18', '2025-01-10', 'LUANE VIEIRA SERRÃO', '992764212', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('DHEMILLY ALEXANDRA DA SILVA PANTOJA', v_escola_id, v_turma_f1m901, '1', '2019-07-20', '2026-01-06', 'JARDILENE MARINHO DA SILVA', '991987952', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ESTER CALDAS DOS SANTOS', v_escola_id, v_turma_f1m901, '1', '2019-11-14', '2025-12-30', 'JAYNE VILHENA CALDAS DOS SANTOS', '993607675', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('JHULLYA TAISA RODRIGUES GOMES', v_escola_id, v_turma_f1m901, '1', '2019-09-28', '2026-01-06', 'TAMARA REIS RODRIGUES', '988085222', 'Pass. Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('KAYKE GABRIEL DE SENA FERNANDES', v_escola_id, v_turma_f1m901, '1', '2019-09-13', '2026-01-16', 'LAYANNE KAISSE COSTA DE SENA', '993866734', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MARIA HELOYSA GUERREIRO MACHADO', v_escola_id, v_turma_f1m901, '1', '2019-06-24', '2026-02-09', 'ANAYRA DA PAIXÃO GUERREIRO', '991344037', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('MARLON BENJAMIM MELO RAMOS', v_escola_id, v_turma_f1m901, '1', '2020-03-25', '2026-01-27', 'MARIA MADALENA MENDES MELO', NULL, 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('MAYLLA RAFAELLY LEITE DA SILVA', v_escola_id, v_turma_f1m901, '1', '2019-09-28', '2026-01-06', 'JARLISON SOARES DA SILVA', '992186389', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MICHEL JUNIOR BRABO DE SOUZA', v_escola_id, v_turma_f1m901, '1', '2020-01-15', '2026-02-10', 'ALCILENE DA SILVA BRABO', '992661964', 'Rua Lídia Doroteia Tavares', true);
  PERFORM fn_fix_aluno_2026('MOISÉS TAVARES DE SANTANA', v_escola_id, v_turma_f1m901, '1', '2020-03-20', '2026-02-05', 'ROZIANE ALMEIDA T. DE S', '991699743', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('PAOLA DANIELA BRABO LIMA', v_escola_id, v_turma_f1m901, '1', '2019-05-12', '2026-01-14', 'PAMILLA DANIELA DE SOUZA BRABO', '993436447', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('SULAMITA DOMINGAS DA SILVA PROGENIO', v_escola_id, v_turma_f1m901, '1', '2019-08-02', '2026-02-03', 'DENIS RENAN DOS REIS PROGÊNIO', '991996891', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('WANNE LUCAS DINIZ', v_escola_id, v_turma_f1m901, '1', '2019-10-28', '2026-02-20', 'WILAME MACÊDO DINIZ', '991478594', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('WENDERSON SAMUEL SENA DOS SANTOS', v_escola_id, v_turma_f1m901, '1', '2019-07-02', '2026-03-02', 'WALDIR WAGNER COSTA DOS SANTOS', '991157846', 'Rua 21 de Abril', false);

  -- F1T901 - 1º Ano Tarde (17)
  PERFORM fn_fix_aluno_2026('ÁGATHA MAITÊ BRANQUINHO TAVARES', v_escola_id, v_turma_f1t901, '1', '2019-04-04', '2026-01-16', 'DORSILENE FERREIRA BELÉM', '991692781', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('AMARILDO SERRÃO MACÊDO', v_escola_id, v_turma_f1t901, '1', '2019-11-01', '2026-02-05', 'NAYARA BATISTA SERRÃO', '992329818', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('ARTHUR DIENDREW DA SILVA DA COSTA', v_escola_id, v_turma_f1t901, '1', '2019-09-06', '2026-01-05', 'ROSINETE DA SILVA DA COSTA', '992299496', 'Pass. Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('DYWLLESON PANTOJA E SILVA', v_escola_id, v_turma_f1t901, '1', '2019-04-02', '2026-02-04', 'JARLENE CAMPOS PANTOJA', '993748851', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('ESTHER SOUSA DA SILVA', v_escola_id, v_turma_f1t901, '1', '2019-09-12', '2026-01-12', 'SIMONE SOARES DE SOUSA', '992716306', 'Rua Tabelião Valentim', false);
  PERFORM fn_fix_aluno_2026('ISABELLA PIETRA DE ARAÚJO SERRÃO', v_escola_id, v_turma_f1t901, '1', '2020-01-21', '2026-01-05', 'ERLANE GOMES DE ARAÚJO', '993527540', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('JOÃO GUILHERME GOMES BATISTA', v_escola_id, v_turma_f1t901, '1', '2019-09-04', '2026-01-08', 'MARIA ANTÔNIA GOMES', '991833193', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('KATRINY GABRIELLA GOMES MORAES', v_escola_id, v_turma_f1t901, '1', '2019-11-01', '2026-01-23', 'RENISE LOPES GOMES', '992269795', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('LUAN MIKAEL FERREIRA MELO', v_escola_id, v_turma_f1t901, '1', '2019-05-27', '2026-02-04', 'DEILIANE FERREIRA MELO', '992520909', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MANUELLA MORAES DE MOARES', v_escola_id, v_turma_f1t901, '1', '2019-10-07', '2026-02-04', 'JUCIRENE CAMPOS MORAES', '992649674', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MARCELLY SILVA DE MIRANDA', v_escola_id, v_turma_f1t901, '1', '2019-03-29', '2026-02-03', 'LAIANE TAVARES SILVA', '993329191', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('MURILO GAEL CAMARÃO BARREIROS', v_escola_id, v_turma_f1t901, '1', '2019-12-17', '2026-03-03', 'GILVAN GOMES BARREIROS', '993635243', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('NÍCOLAS PIERRE DA COSTA FURTADO', v_escola_id, v_turma_f1t901, '1', '2019-08-30', '2025-12-30', 'RENIZE DA SILVA DA COSTA', '991136191', 'Pass. Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('NINA IASMIM CORDEIRO DOS SANTOS', v_escola_id, v_turma_f1t901, '1', '2020-01-28', '2026-01-19', 'NAZILDA DA CRUZ CORDEIRO', '992604432', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('RUAN FELIPE DA COSTA CARVALHO', v_escola_id, v_turma_f1t901, '1', '2019-10-07', '2026-01-07', 'ELIANA TEIXEIRA DA SILVA', '993443257', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('SUANY DOS SANTOS DA SILVA', v_escola_id, v_turma_f1t901, '1', '2019-12-18', '2026-03-03', 'SUELLEN DOS SANTOS DA SILVA', '992514244', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('WARLESSON MATHEUS AMARAL CARDOSO', v_escola_id, v_turma_f1t901, '1', '2020-02-16', '2026-03-03', 'TEREZINHA AMARAL CARDOSO', NULL, 'Rua Custódio Ferreira', false);

  -- F2M901 - 2º Ano Manhã (10)
  PERFORM fn_fix_aluno_2026('ANTÔNIO NETO PANTOJA DE MELO', v_escola_id, v_turma_f2m901, '2', '2018-06-12', '2026-01-14', 'KARINA FELIX PANTOJA', '991516639', 'Rua Maria Julia', false);
  PERFORM fn_fix_aluno_2026('DIANA VITÓRIA BALIEIRO VEIGA', v_escola_id, v_turma_f2m901, '2', '2018-11-05', '2026-01-07', 'DILEUZA DE MELO BALIEIRO', '993874817', 'Rua Maria Julia', false);
  PERFORM fn_fix_aluno_2026('JADSON PANTOJA DOS SANTOS', v_escola_id, v_turma_f2m901, '2', '2018-04-20', '2026-01-21', 'JAIR FREITAS DOS SANTOS', '993804857', 'Rua Maria Julia', false);
  PERFORM fn_fix_aluno_2026('JOSUÉ LEITE VIEIRA', v_escola_id, v_turma_f2m901, '2', '2018-06-17', '2026-01-22', 'ANA MARIA LEITE VIEIRA', NULL, 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('KEMILLY HADASSA GONÇALVES DE MELO', v_escola_id, v_turma_f2m901, '2', '2018-12-09', '2026-01-14', 'CLEICE ALVES GONÇALVES', '992493295', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('LEANDRO WILKER TAVARES GONÇALVES', v_escola_id, v_turma_f2m901, '2', '2018-04-02', '2025-12-29', 'LUCILENE DE JESUS BARBOSA DE MATOS', '992202676', 'Av. das Acácias', true);
  PERFORM fn_fix_aluno_2026('MATHEUS MELO RAMOS', v_escola_id, v_turma_f2m901, '2', '2018-08-03', '2026-01-05', 'MARIA JACINTA MENDES RAMOS', '991349975', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('NAWENNY NABELYN TEIXEIRA BARRETO', v_escola_id, v_turma_f2m901, '2', '2019-01-26', '2025-12-29', 'ALDENIZE TEIXEIRA BARRETO', '993327970', 'Rua Maria Julia', false);
  PERFORM fn_fix_aluno_2026('RIAN DE ARAÚJO DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-12-05', '2026-01-06', 'GRACILENE MARQUES DE ARAÚJO', NULL, 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('SANDRO NOGUEIRA DA SILVA', v_escola_id, v_turma_f2m901, '2', '2018-11-26', '2026-01-05', 'ALANA PANTOJA NOGUEIRA', '992119929', 'Rua Frutuoso de Jesus', true);

  -- F2T901 - 2º Ano Tarde (15)
  PERFORM fn_fix_aluno_2026('AGATHA HADASSA PAIXÃO AMARAL', v_escola_id, v_turma_f2t901, '2', '2018-05-10', '2026-01-15', 'HIRLEM DE OLIVEIRA PAIXÃO', '992055429', 'Rua Renato Brabo', false);
  PERFORM fn_fix_aluno_2026('ALISSON JESUS DOS SANTOS BARBOSA', v_escola_id, v_turma_f2t901, '2', '2019-03-09', '2026-01-06', 'DANIEL DA SILVA BARBOSA', '992457212', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ANA THAYNÁ BARBOSA DE MORAES', v_escola_id, v_turma_f2t901, '2', '2018-04-02', '2026-02-09', 'ANA CLÁUDIA PEREIRA BARBOSA', '992059741', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('AYLA HADASSA E SANTOS COSTA', v_escola_id, v_turma_f2t901, '2', '2018-08-23', '2025-12-16', 'JACIANE DOS SANTOS E SANTOS', '992643133', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('DARLEY LEAL BARBOSA', v_escola_id, v_turma_f2t901, '2', '2019-01-22', '2026-01-15', 'ADRIETE DOS SANTOS LEAL', '992710625', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ENZO GABRIEL SERRÃO DINIZ', v_escola_id, v_turma_f2t901, '2', '2018-12-12', '2026-01-07', 'BENEDITO TAVARES DINIZ', '992103515', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('EYSHYLA FERNANDA DE MELO DO ESPIRITO SANTO', v_escola_id, v_turma_f2t901, '2', '2018-10-09', '2026-02-02', 'FERDINEY DE MELO DO ESPIRITO SANTO', '992271277', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('HELLEM SOPHIA MARTINS DO CARMO', v_escola_id, v_turma_f2t901, '2', '2019-02-20', '2026-01-22', 'ALICIA NAVEGANTE MARTINS', '992356695', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('HUDSON JESUS BAHIA DA SILVA', v_escola_id, v_turma_f2t901, '2', '2018-10-06', '2026-03-02', 'LARISSA MIRANDA BAHIA', '992216346', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('KENNEDY IURY FERREIRA COSTA', v_escola_id, v_turma_f2t901, '2', '2018-11-26', '2026-02-05', 'KETELEM FERREIRA COSTA', '993472722', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('KERVISON GOMES DE SOUZA', v_escola_id, v_turma_f2t901, '2', '2019-01-29', '2025-12-12', 'CLAUDETE DO VALES GOMES', '985724489', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('NIKLAUS CARDOSO MATOS', v_escola_id, v_turma_f2t901, '2', '2018-12-08', '2026-02-10', 'ANA PATRÍCIA MONTEIRO CARDOSO', '991843334', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('RENA JUDITI SILVA DE SOUZA', v_escola_id, v_turma_f2t901, '2', '2018-11-08', '2025-12-18', 'ISRAEL MAIA DE SOUZA', '993374064', 'Rua Padre Marcos', false);
  PERFORM fn_fix_aluno_2026('YASMIM SOFIA MARTINS MACIEL', v_escola_id, v_turma_f2t901, '2', '2018-11-26', '2026-02-02', 'JOYCEANE POÇA MARTINS', '992630021', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('YCARO NETO CARVALHO SOARES', v_escola_id, v_turma_f2t901, '2', '2018-11-14', '2026-01-15', 'LURIELE DA SILVA CARVALHO', '993893541', 'Rua 21 de Abril', false);

  -- F3M901 - 3º Ano Manhã (12)
  PERFORM fn_fix_aluno_2026('BEATRIZ DA SILVA SERRÃO', v_escola_id, v_turma_f3m901, '3', '2018-02-22', '2026-01-15', 'BERLIANE LOBATO DA SILVA', '992134511', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('CINTTIA WANESSA SENA DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2016-07-10', '2026-01-30', 'WALDIR WAGNER COSTA DOS SANTOS', '991157846', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('DINEI DE ALFAIA BARBOSA', v_escola_id, v_turma_f3m901, '3', '2014-06-07', '2026-01-13', 'ELIETE ALVES DE ALFAIA', '993915624', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('EMANUELA VITÓRIA TAVARES PANTOJA', v_escola_id, v_turma_f3m901, '3', '2018-03-16', '2026-01-06', 'JACKELINE SOUZA TAVARES', '991966982', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('JOÃO VICTOR REIS BARBOSA', v_escola_id, v_turma_f3m901, '3', '2017-04-17', '2026-01-13', 'DARILMA MARINHO REIS', '991480305', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('LUIZ HENRIQUE VIEIRA AMARAL', v_escola_id, v_turma_f3m901, '3', '2016-12-01', '2026-01-19', 'LUIZ ANDRÉ DE ASSIS AMARAL', NULL, 'Pass. Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('MARIA VITÓRIA AMARAL TRINDADE', v_escola_id, v_turma_f3m901, '3', '2017-10-14', '2026-01-10', 'NATALIA DE CASSIA AMARAL TRINDADE', '993362695', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('MÔNIQUE GABRIELI BARBOSA DA SILVA', v_escola_id, v_turma_f3m901, '3', '2018-03-13', '2026-01-19', 'GABRIELMA BARBOSA DA SILVA', NULL, 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('STEFANNY MELO PANTOJA', v_escola_id, v_turma_f3m901, '3', '2017-09-22', '2026-01-05', 'MARIA JACINTA MENDES RAMOS', '991349975', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('VICTOR PANTOJA PIRES', v_escola_id, v_turma_f3m901, '3', '2018-01-07', '2026-01-09', 'MARIA FELIX PANTOJA', '992951575', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('WALDIR WALLACE SENA DOS SANTOS', v_escola_id, v_turma_f3m901, '3', '2017-10-28', '2026-01-30', 'WALDIR WAGNER COSTA DOS SANTOS', '991157846', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('WILIAN RENAN DA SILVA PROGÊNIO', v_escola_id, v_turma_f3m901, '3', '2018-01-20', '2026-01-15', 'DENIS RENAN DOS REIS PROGÊNIO', '991996891', 'Rua 21 de Abril', false);

  -- F3T901 - 3º Ano Tarde (16)
  PERFORM fn_fix_aluno_2026('ADONIAS LEAL BARBOSA', v_escola_id, v_turma_f3t901, '3', '2017-09-04', '2026-01-15', 'ADRIETE DOS SANTOS LEAL', '992710625', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ANDREW SILAS GOMES DA SILVA', v_escola_id, v_turma_f3t901, '3', '2018-01-11', '2026-02-05', 'ANDRESSA MAGNO GOMES', '992603521', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('GEANDRA VIEIRA PAIXÃO', v_escola_id, v_turma_f3t901, '3', '2017-08-28', '2026-02-06', 'MARIA JOSÉ FURTADO VIEIRA', '991611946', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('GEISIANE RODRIGUES SENA', v_escola_id, v_turma_f3t901, '3', '2017-06-03', '2026-02-23', 'TATIANE SENA RODRIGUES', '993647466', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('GUSTAVO GONÇALVES DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-06-21', '2026-01-05', 'JOSINELMA ALVES GONÇALVES', '991562742', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('JESSICA SUELEM LOBATO FERREIRA', v_escola_id, v_turma_f3t901, '3', '2017-04-27', '2026-01-12', 'JOELE RODRIGUES LOBATO', '993177033', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('JHULLYA VITÓRIA GUERREIRO FERREIRA', v_escola_id, v_turma_f3t901, '3', '2017-05-07', '2026-01-06', 'EDIELE FURTADO GUERREIRO', '992521862', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('JOSILEI GOMES DAMACENA', v_escola_id, v_turma_f3t901, '3', '2012-09-18', '2026-01-05', 'JANILSON GOMES SERRÃO', '991925620', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('LEVI SILVA DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-10-30', '2026-01-15', 'RENATO SANTANA RODRIGUES', '992900489', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MARIA EDUARDA DINIZ MORAES', v_escola_id, v_turma_f3t901, '3', '2016-11-18', '2026-02-10', 'MICHELI MACEDO DINIZ', '991700482', 'Trav. Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('RHANDRA AYTA CORREA FERREIRA', v_escola_id, v_turma_f3t901, '3', '2017-08-25', '2026-01-14', 'ALESSANDRA PEREIRA CORRÊA', '993976975', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('RODRIGO DE ARAUJO DA SILVA', v_escola_id, v_turma_f3t901, '3', '2015-03-28', '2026-01-06', 'GRACILENE MARQUES DE ARAÚJO', NULL, 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('RONALD DE SOUZA DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-06-13', '2026-01-26', 'ROSANA DA SILVA DE SOUZA', '993867056', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('TAYLAN RANGEL DE ARAUJO DA SILVA', v_escola_id, v_turma_f3t901, '3', '2017-07-06', '2026-01-06', 'GRACILENE MARQUES DE ARAÚJO', NULL, 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('WALACE GONÇALVES DE MELO', v_escola_id, v_turma_f3t901, '3', '2016-10-03', '2026-01-14', 'CLEICE ALVES GONÇALVES', '992493295', 'Rua 21 de Abril', true);
  PERFORM fn_fix_aluno_2026('WYLGNNER ISNAEL BRAGA PANTOJA', v_escola_id, v_turma_f3t901, '3', '2017-12-04', '2026-01-03', 'RAILANE TAVARES BRAGA', '992351998', 'Rua Guaracy Frazão', false);

  -- F4M901 - 4º Ano Manhã (12)
  PERFORM fn_fix_aluno_2026('ALANA BEATRIZ DE FREITAS LOBATO', v_escola_id, v_turma_f4m901, '4', '2015-10-02', '2026-01-26', 'JOSITERMA CARDOSO DE FREITAS', '991419619', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('AMANDA PANTOJA COSTA', v_escola_id, v_turma_f4m901, '4', '2016-10-06', '2026-01-09', 'ANA CLAUDIA PANTOJA COSTA', '991935908', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('ANA PAULA OLIVEIRA MARQUES', v_escola_id, v_turma_f4m901, '4', '2016-03-24', '2026-02-19', 'LEIDIANE OLIVEIRA MARQUES', NULL, 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('ARTHUR LEVI CARDOSO FERREIRA', v_escola_id, v_turma_f4m901, '4', '2017-02-09', '2026-02-02', 'ANANDA GONÇALVES CARDOSO', '991832687', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('DIEGO GONÇALVES DE MELO', v_escola_id, v_turma_f4m901, '4', '2013-10-01', '2026-01-14', 'CLEICE ALVES GONÇALVES', '992493295', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('JAIR ALEXSANDRO DA SILVA PANTOJA', v_escola_id, v_turma_f4m901, '4', '2017-02-06', '2025-12-18', 'JARDILENE MARINHO DA SILVA', '991987952', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('JUAN RODRIGUES BARBOSA', v_escola_id, v_turma_f4m901, '4', '2016-05-17', '2026-01-08', 'ANTÔNIO ROBERTO FIUZA BARBOSA', '992675821', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('KAUÊ PEREIRA TAVARES', v_escola_id, v_turma_f4m901, '4', '2017-03-20', '2026-01-05', 'KATILENE DE SENA PEREIRA', '993758469', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('RICARDO CARVALHO MAGNO', v_escola_id, v_turma_f4m901, '4', '2017-02-13', '2026-01-05', 'RAYLANA GONÇALVES CARVALHO', '993696458', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('SÂMILY SOFIA VEIGA FERREIRA', v_escola_id, v_turma_f4m901, '4', '2015-05-06', '2026-01-21', 'SAMUEL DE MELO FERREIRA', '991593899', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('WALLACE DE OLIVEIRA DE LIMA', v_escola_id, v_turma_f4m901, '4', '2017-02-08', '2025-12-29', 'LUCIDALVA TAVARES DE OLIVEIRA', '993417873', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('YANDRIO CARLOS DE SANTANA OLIVEIRA', v_escola_id, v_turma_f4m901, '4', '2016-09-05', '2025-12-18', 'CARLOS OLIVEIRA', '991120525', 'Rua Lídia Doroteia Tavares', false);

  -- F4T901 - 4º Ano Tarde (22)
  PERFORM fn_fix_aluno_2026('AGHATA SOPHIA DA COSTA MORAES', v_escola_id, v_turma_f4t901, '4', '2016-01-15', '2026-02-10', 'ROSA MARIA ESPIRITO SANTO DA COSTA', '993365916', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('ALISSA ESTELLY DOS SANTOS BARBOSA', v_escola_id, v_turma_f4t901, '4', '2016-10-04', '2026-01-06', 'PRISCILA PEREIRA DOS SANTOS', '993624460', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ANA FERNANDA DE MELO DO ESPIRITO SANTO', v_escola_id, v_turma_f4t901, '4', '2017-02-16', '2026-02-02', 'FERDINEY DE MELO DO ESPIRITO SANTO', '992271277', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('DARLAN BARBOSA CABRAL', v_escola_id, v_turma_f4t901, '4', '2016-05-25', '2026-01-28', 'DALCILENE DA SILVA BARBOSA', '992012724', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('DAVI ARTHUR COSTA MENDES', v_escola_id, v_turma_f4t901, '4', '2017-01-12', '2025-12-12', 'ANDREZA FERREIRA COSTA', '993591350', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('DELSON DE ALFAIA BARBOSA', v_escola_id, v_turma_f4t901, '4', '2011-09-25', '2026-01-13', 'ELIETE ALVES DE ALFAIA', '993915624', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('ELISA VITÓRIA MARQUES ESTUMANO', v_escola_id, v_turma_f4t901, '4', '2016-07-15', '2026-01-07', 'DEBORA MARQUES ESTUMANO', '991326691', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('EMILLY GABRIELE DE ARAÚJO DA SILVA', v_escola_id, v_turma_f4t901, '4', '2013-09-01', '2026-01-22', 'GRACILENE MARQUES DE ARAÚJO', NULL, 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('HEITOR RENAN DA SILVA PROGENIO', v_escola_id, v_turma_f4t901, '4', '2016-06-13', '2026-01-15', 'DENIS RENAN DOS REIS PROGENIO', '991996891', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('IAGO GABRIEL CORDEIRO DOS SANTOS', v_escola_id, v_turma_f4t901, '4', '2017-02-23', '2026-01-15', 'NAZILDA DA CRUZ CORDEIRO', '992604432', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('JOÃO VITOR DO NASCIMENTO FREITAS', v_escola_id, v_turma_f4t901, '4', '2016-07-01', '2026-02-10', 'DEBORA LIMA DO NASCIMENTO', '993870434', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('KAYLA E SANTOS COSTA', v_escola_id, v_turma_f4t901, '4', '2015-07-22', '2025-12-16', 'JACIANE DOS SANTOS E SANTOS', '992643133', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('LARISSA MIKAELLY FERREIRA DA SILVA', v_escola_id, v_turma_f4t901, '4', '2016-08-25', '2026-02-03', 'DEILIANE FERREIRA MELO', '992520909', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('LUCAS WENDRYL TRINDADE GOMES', v_escola_id, v_turma_f4t901, '4', '2015-09-06', '2026-02-06', 'RAILANA VIEIRA TRINDADE', '992712968', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('MARCELO HENRIQUE LOBATO NASCIMENTO', v_escola_id, v_turma_f4t901, '4', '2014-11-27', '2026-01-26', 'MARTUZALÉM RODRIGUES LOBATO', '992802326', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('MIGUEL CARDOSO MATOS', v_escola_id, v_turma_f4t901, '4', '2016-09-07', '2026-02-10', 'ANA PATRÍCIA MONTEIRO CARDOSO', '991843334', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('NAUANY LEÃO SILVA', v_escola_id, v_turma_f4t901, '4', '2016-07-15', '2026-01-15', 'CAROLINA TAVARES LEÃO', '991804366', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('RAYANNE SOPHIA VALES PANTOJA', v_escola_id, v_turma_f4t901, '4', '2015-07-22', '2026-01-13', 'JACIRENE MARQUES VALES', '991251312', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('REANDRO BELÉM TRINDADE', v_escola_id, v_turma_f4t901, '4', '2016-05-22', '2026-01-05', 'ROSA MARIA FERREIRA BELÉM', '991160526', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('ROBERT LUCAS RAMOS MACHADO', v_escola_id, v_turma_f4t901, '4', '2016-04-28', '2026-01-26', 'BEANGELA DA SILVA RAMOS', '991152170', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('WENDELL LEVYD DE OLIVEIRA RODRIGUES', v_escola_id, v_turma_f4t901, '4', '2016-10-24', '2025-12-29', 'MARIA DE JESUS COSTA DE OLIVEIRA', '993361745', 'Rua Padre Marcos', false);
  PERFORM fn_fix_aluno_2026('YURE CRISTHIAN CARVALHO SOARES', v_escola_id, v_turma_f4t901, '4', '2016-10-09', '2026-01-15', 'LURIELE DA SILVA CARVALHO', '993362299', 'Rua 21 de Abril', false);

  -- F5M901 - 5º Ano Manhã (14)
  PERFORM fn_fix_aluno_2026('ANA BEATRIZ OLIVEIRA PANTOJA', v_escola_id, v_turma_f5m901, '5', '2015-08-20', '2025-12-12', 'DEUZARINA OLIVEIRA PANTOJA', '991471380', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('ANA MARIA OLIVEIRA MARQUES', v_escola_id, v_turma_f5m901, '5', '2012-12-27', '2026-02-20', 'MARIA DE NAZARÉ OLIVEIRA MARQUES', '991714535', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('CARLA MARIA AMARAL SANTANA', v_escola_id, v_turma_f5m901, '5', '2015-08-13', '2026-01-14', 'MARIA MADALENA DE ASSIS AMARAL', '992241360', 'Rua Padre Marcos', false);
  PERFORM fn_fix_aluno_2026('DAVI LUIZ LEITE VIEIRA', v_escola_id, v_turma_f5m901, '5', '2015-08-26', '2026-01-22', 'ANA MARIA LEITE VIEIRA', '992425564', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('EDNELSON DA SILVA COSTA', v_escola_id, v_turma_f5m901, '5', '2016-01-23', '2026-01-12', 'CELINA VIEIRA DA SILVA', '991401161', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ENDERSON LEITE VIEIRA', v_escola_id, v_turma_f5m901, '5', '2009-12-03', '2026-01-22', 'ANA MARIA LEITE VIEIRA', '992425564', 'Rua Maria Julia', false);
  PERFORM fn_fix_aluno_2026('JADY LAYANA SILVA PANTOJA', v_escola_id, v_turma_f5m901, '5', '2015-08-10', '2026-01-28', 'LENICE TAVARES SILVA', '991434251', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('KAUANY COSTA DA SILVA', v_escola_id, v_turma_f5m901, '5', '2015-06-03', '2026-01-26', 'GLAUCIA DE NAZARÉ FERREIRA COSTA', '991157861', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('MANUELLY SERRÃO FERREIRA', v_escola_id, v_turma_f5m901, '5', '2015-08-12', '2026-01-16', 'MARCIANE FERREIRA SERRÃO', '992103622', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('MARIA EDUARDA LEITE VIEIRA', v_escola_id, v_turma_f5m901, '5', '2011-09-28', '2026-01-22', 'ANA MARIA LEITE VIEIRA', '992425564', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('NATALIE PAULINE SERRÃO BARBOSA', v_escola_id, v_turma_f5m901, '5', '2015-11-29', '2026-01-23', 'NATALIA REREZINHA BATISTA SERRÃO', '991798203', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('WANDERSON SILAS SENA DOS SANTOS', v_escola_id, v_turma_f5m901, '5', '2014-09-05', '2026-01-30', 'WALDIR WAGNER COSTA DOS SANTOS', '991157846', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('WENDERSON GONÇALVES CASTRO', v_escola_id, v_turma_f5m901, '5', '2015-06-20', '2026-01-12', 'BRUNA FERNANDES GONÇALVES', '993742464', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('YASMIN RODRIGUES BARBOSA', v_escola_id, v_turma_f5m901, '5', '2015-06-29', '2026-01-08', 'ANTÔNIO ROBERTO FIUZA BARBOSA', '992675821', 'Rua Frutuoso de Jesus', false);

  -- F5T901 - 5º Ano Tarde (18)
  PERFORM fn_fix_aluno_2026('CHRISTIAN WILLIAN FERREIRA COSTA', v_escola_id, v_turma_f5t901, '5', '2015-11-04', '2026-01-05', 'ZÉLIA BARBOSA FERREIRA', '992470696', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('ÍTALO MARQUES DA ROCHA', v_escola_id, v_turma_f5t901, '5', '2015-05-06', '2026-01-05', 'DECLEUMA SOUZA MARQUES', '992592233', 'Rua do INSS', false);
  PERFORM fn_fix_aluno_2026('KELVIN WILLIAN LOBATO SILVA', v_escola_id, v_turma_f5t901, '5', '2014-08-31', '2026-01-12', 'JOSINETE RODRIGUES LOBATO', '993314142', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('KELVIS KAIK SERRÃO DE ARAUJO', v_escola_id, v_turma_f5t901, '5', '2014-03-26', '2025-12-29', 'ODETE DOS SANTOS SERRÃO', '992892309', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('MARIA YANDRA TEIXEIRA MACIEL', v_escola_id, v_turma_f5t901, '5', '2015-06-11', '2025-12-18', 'CLEIDA TEIXEIRA PEREIRA', '992702047', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MARIA YLANA TEIXEIRA MACIEL', v_escola_id, v_turma_f5t901, '5', '2015-06-11', '2025-12-18', 'CLEIDA TEIXEIRA PEREIRA', '992702047', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MARIANA DOS SANTOS GONÇALVES', v_escola_id, v_turma_f5t901, '5', '2015-12-19', '2025-12-19', 'MARIA NATALINA GARCIA DOS SANTOS', '991960680', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MAYKO JUNIOR MORAES RIBEIRO', v_escola_id, v_turma_f5t901, '5', '2015-02-04', '2026-01-16', 'MAYKO ANTONIO SANTANA RIBEIRO', '992036343', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('MIQUÉIAS NAUAN DE SANTANA MIRANDA', v_escola_id, v_turma_f5t901, '5', '2015-05-05', '2025-12-29', 'MARIAN REIS DE SANTANA', '991045602', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('NAUANDRY LEÃO SILVA', v_escola_id, v_turma_f5t901, '5', '2014-09-30', '2026-01-15', 'CAROLINA TAVARES LEÃO', '991804366', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('NICOLY FABIANE FERREIRA NOGUEIRA', v_escola_id, v_turma_f5t901, '5', '2014-11-24', '2026-01-13', 'FRANCILENE OLIVEIRA FERREIRA', '993967977', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('RAYANE ALMEIDA DA COSTA', v_escola_id, v_turma_f5t901, '5', '2015-08-26', '2026-02-05', 'SIMONE DOS SANTOS ALMEIDA', '991989652', 'Pass. Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('REBECA DE SOUZA SANTOS', v_escola_id, v_turma_f5t901, '5', '2015-08-20', '2025-12-29', 'CARMEM DE SOUZA SANTOS', '991755707', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('RIELLY SOFIA DA SILVA LOBATO', v_escola_id, v_turma_f5t901, '5', '2015-05-06', '2026-01-06', 'DENIZE SOUZA DA SILVA', NULL, 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('RODRIGO LORENZO NOGUEIRA DA SILVA', v_escola_id, v_turma_f5t901, '5', '2016-02-05', '2025-12-29', 'DÉBORA DE CASSIA PEREIRA DA SILVA', '992123237', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('SANDIANE MARINHO DUARTE', v_escola_id, v_turma_f5t901, '5', '2015-08-16', '2026-01-06', 'LEIDIANE DE MELO MARINHO', '991328532', 'Rua Padre Marcos', true);
  PERFORM fn_fix_aluno_2026('VINÍCIUS TAVARES PANTOJA', v_escola_id, v_turma_f5t901, '5', '2015-12-11', '2026-01-01', 'JACKELINE SOUZA TAVARES', '991966982', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('YASMIM DINIZ MONTEIRO', v_escola_id, v_turma_f5t901, '5', '2016-01-10', '2026-01-05', 'FÁTIMA MACEDO DINIZ', '991008995', 'Rua Custódio Ferreira', false);

  -- F8T901 - 8º Ano Tarde (29)
  PERFORM fn_fix_aluno_2026('ALANA DA COSTA LIMA', v_escola_id, v_turma_f8t901, '8', '2011-11-11', '2026-01-01', 'ROSINETE DA SILVA DA COSTA', '992299496', 'Pass. Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('ALANNA KEVELLY DE SANTANA OLIVEIRA', v_escola_id, v_turma_f8t901, '8', '2012-08-07', '2026-01-13', 'CARLOS OLIVEIRA', '991120525', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('ALINE DOS SANTOS GONÇALVES', v_escola_id, v_turma_f8t901, '8', '2009-04-17', '2025-12-19', 'MARIA NATALINA GARCIA DOS SANTOS', '991960680', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('DEISE CORDEIRO FERREIRA', v_escola_id, v_turma_f8t901, '8', '2012-12-27', '2026-01-15', 'NAZILDA DA CRUZ CORDEIRO', '992604432', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('DEYSE RIANE DA SILVA LOBATO', v_escola_id, v_turma_f8t901, '8', '2010-12-09', '2026-01-06', 'DENISE SOUZA DA SILVA', NULL, 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('EDIELSON RODRIGUES SENA', v_escola_id, v_turma_f8t901, '8', '2012-12-28', '2026-02-23', 'TATIANE SENA RODRIGUES', '993647466', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('ELLEN SERRÃO DE MELO', v_escola_id, v_turma_f8t901, '8', '2012-08-26', '2026-01-29', 'SUELLEN DE MATOS SERRÃO', '992872591', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('GEAN CARLOS DE OLIVEIRA SERRÃO', v_escola_id, v_turma_f8t901, '8', '2010-04-05', '2026-01-15', 'IRANILDA BEATHA DE OLIVEIRA', NULL, 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('GLECIANE RODRIGUES SENA', v_escola_id, v_turma_f8t901, '8', '2011-03-23', '2026-02-02', 'TATIANE SENA RODRIGUES', '993647466', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('ISABELE VITÓRIA MARTINS MACIEL', v_escola_id, v_turma_f8t901, '8', '2013-04-14', '2026-02-02', 'JOYCEANE POÇA MARTINS', '992360021', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('KAILANE SERRÃO DE ARAUJO', v_escola_id, v_turma_f8t901, '8', '2011-11-30', '2025-12-29', 'ODETE DOS SANTOS SERRÃO', '992892309', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('KELVIN GOMES DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2012-11-06', '2026-01-06', 'CLAUDETE DO VALES GOMES', '985724489', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('KEVILLY GOMES DE SOUZA', v_escola_id, v_turma_f8t901, '8', '2011-02-09', '2025-12-12', 'CLAUDETE DO VALES GOMES', '985724489', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('LIBNE HUENZIL VEIGA FERREIRA', v_escola_id, v_turma_f8t901, '8', '2011-07-14', '2026-01-21', 'SAMUEL DE MELO FERREIRA', '991593899', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('LUIZ OLIVEIRA CARVALHO NETO', v_escola_id, v_turma_f8t901, '8', '2010-05-17', '2026-01-07', 'MARIA SEBASTIANA FERREIRA DA SILVA', '992892813', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('MARIANE DOS SANTOS GONÇALVES', v_escola_id, v_turma_f8t901, '8', '2011-06-23', '2025-12-12', 'MARIA NATALINA GARCIA DOS SANTOS', '991960680', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('MATHEUS DE MATOS TEIXEIRA', v_escola_id, v_turma_f8t901, '8', '2012-10-05', '2025-12-12', 'EDILENE DO SOCORRO DE MATOS', '992516699', 'Rua Padre Marcos', false);
  PERFORM fn_fix_aluno_2026('MURILO VINICIUS CARDOSO MELO', v_escola_id, v_turma_f8t901, '8', '2010-08-21', '2025-12-18', 'TÂNIA DO SOCORRO FERREIRA CARDOSO', NULL, 'Rua 18 de Novembro', false);
  PERFORM fn_fix_aluno_2026('PAULINHO DOS SANTOS DA SILVA', v_escola_id, v_turma_f8t901, '8', '2010-10-14', '2026-02-20', 'SIMONE PEREIRA DOS SANTOS', '991437647', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('ROSIQUELME CAMPOS FARIAS', v_escola_id, v_turma_f8t901, '8', '2013-02-13', '2026-01-14', 'ROZIFRAM MELO FARIAS', '993320903', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('RYANDRISON FERREIRA MORAES', v_escola_id, v_turma_f8t901, '8', '2012-07-29', '2026-01-08', 'ELIELMA FERNANDES FERREIRA', '993456759', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('RYANY CAROLINE VIEIRA MORAES', v_escola_id, v_turma_f8t901, '8', '2012-11-29', '2026-01-07', 'MIRLEM FERREIRA VIEIRA', '992125194', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('SADRAQUE DOS SANTOS DA SILVA', v_escola_id, v_turma_f8t901, '8', '2008-01-16', '2026-03-03', 'SIMONE PEREIRA DOS SANTOS', '991437647', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('SAMUEL GOMES DOS SANTOS', v_escola_id, v_turma_f8t901, '8', '2011-12-20', '2025-12-12', 'CLEIDIANE GOMES DOS SANTOS', '993197993', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('SUANNE CHAGAS LUCAS', v_escola_id, v_turma_f8t901, '8', '2013-01-20', '2026-02-20', 'SUELEM CHAGAS LUCAS', '992576113', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('THIAGO RODRIGUES LOBATO', v_escola_id, v_turma_f8t901, '8', '2010-12-08', '2026-01-12', 'TIBURCIO DE OLIVEIRA LOBATO', '991177033', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('WALAF SOUSA DINIZ', v_escola_id, v_turma_f8t901, '8', '2009-07-30', '2026-02-19', 'MARIA RAIMUNDA FURTADO VIEIRA', '993671299', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('WALLACE LUIDY DA SILVA PEREIRA', v_escola_id, v_turma_f8t901, '8', '2011-09-26', '2026-01-28', 'JENILSIS RODRIGUES DA SILVA', '991540957', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('WELLINGTON DE SOUZA DOS SANTOS', v_escola_id, v_turma_f8t901, '8', '2012-10-12', '2026-01-14', 'MARLETE DE SOUZA DOS SANTOS', '992876217', 'Rua Cirino Gomes', false);

  -- F9T901 - 9º Ano Tarde (26)
  PERFORM fn_fix_aluno_2026('ARLEY E SANTOS COSTA', v_escola_id, v_turma_f9t901, '9', '2008-03-24', '2025-12-16', 'JACIANE DOS SANTOS E SANTOS', '993058483', 'Rua Frutuoso de Jesus', false);
  PERFORM fn_fix_aluno_2026('BENJAMIN LEVI SILVA DA SILVA', v_escola_id, v_turma_f9t901, '9', '2011-08-03', '2025-12-12', 'EDMUNDO RODRIGUES DA SILVA', '993091979', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('DANIELLY LORENA FERNANDES MARTINS', v_escola_id, v_turma_f9t901, '9', '2011-11-23', '2025-12-18', 'DALILA FERNANDES MARTINS', '992398360', 'Rua Custódio Ferreira', false);
  PERFORM fn_fix_aluno_2026('DEBORA MENDES MELO', v_escola_id, v_turma_f9t901, '9', '2010-01-09', '2026-01-30', 'MARIA JACINTA MENDES RAMOS', '991349975', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('EMILLY DA SILVA COSTA', v_escola_id, v_turma_f9t901, '9', '2011-06-03', '2026-01-12', 'CELINA VIEIRA DA SILVA', '991401161', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ENDRIA GABRIELI FARIAS DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-09-22', '2026-01-22', 'RAYANE PANTOJA FARIAS', '991951504', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('ESTELA LIMA COUTINHO', v_escola_id, v_turma_f9t901, '9', '2009-12-03', '2026-01-08', 'CONSUELO RAMOS CANTÍDIO', '992021485', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('EVELI KAUANE DO NASCIMENTO FREITAS', v_escola_id, v_turma_f9t901, '9', '2009-07-27', '2026-03-02', 'JONIAS LIMA DO NASCIMENTO', '991120145', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('INARA SANTANA NASCIMENTO', v_escola_id, v_turma_f9t901, '9', '2009-10-01', '2026-01-29', 'CLIDENOR LIMA DO NASCIMENTO', '991567499', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('JAEL CAMPOS PANTOJA', v_escola_id, v_turma_f9t901, '9', '2012-01-14', '2026-01-19', 'JARDILENE SENA CAMPOS', '992874309', 'Rua 21 de Abril', false);
  PERFORM fn_fix_aluno_2026('JAMIRYANE DA SILVA CAMPOS', v_escola_id, v_turma_f9t901, '9', '2007-11-16', '2025-12-22', 'MARIA DO SOCORRO PORTILHO DA SILVA', '992856899', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('JARYANE DA SILVA CAMPOS', v_escola_id, v_turma_f9t901, '9', '2010-09-12', '2025-12-22', 'MARIA DO SOCORRO PORTILHO DA SILVA', '992856899', 'Pass. Maria Julia', false);
  PERFORM fn_fix_aluno_2026('JHENIFF PINHEIRO E PINHEIRO', v_escola_id, v_turma_f9t901, '9', '2011-10-30', '2026-01-05', 'MARIELE DA PINHEIRO E PINHEIRO', '993381638', 'Rua Padre Marcos', false);
  PERFORM fn_fix_aluno_2026('JHENNIFE THAIS DE ARAUJO SERRÃO', v_escola_id, v_turma_f9t901, '9', '2012-01-08', '2026-01-05', 'ERLANE GOMES DE ARAÚJO', '993527540', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('LEVI DE OLIVEIRA ALFAIA', v_escola_id, v_turma_f9t901, '9', '2009-07-03', '2025-12-12', 'SULAMITA DE OLIVEIRA ALFAIA', '993433110', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('MAISA AMARAL PEREIRA', v_escola_id, v_turma_f9t901, '9', '2010-10-28', '2026-01-14', 'MARIA MADALENA DE ASSIS AMARAL', '992241360', 'Rua Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('MARCELO MACIEL DA SILVA MAGNO', v_escola_id, v_turma_f9t901, '9', '2011-01-07', '2026-01-06', 'MARIA SEBASTIANA MAGNO DA SILVA', '993457325', 'Rua Custódio Ferreira', true);
  PERFORM fn_fix_aluno_2026('MATHEUS FERREIRA COSTA', v_escola_id, v_turma_f9t901, '9', '2011-11-27', '2025-12-12', 'ZÉLIA BARBOSA FERREIRA', '992470696', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('ROBSON ALMEIDA DA COSTA', v_escola_id, v_turma_f9t901, '9', '2011-08-22', '2025-12-12', 'SIMONE DOS SANTOS ALMEIDA', '991989652', 'Rua Dom Ângelo', false);
  PERFORM fn_fix_aluno_2026('RUAN COSTA MENDES', v_escola_id, v_turma_f9t901, '9', '2010-10-15', '2025-12-12', 'ANDREZA FERREIRA COSTA', '993591350', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('SAMILLY DE OLIVEIRA ALFAIA', v_escola_id, v_turma_f9t901, '9', '2011-06-20', '2025-12-12', 'SULAMITA DE OLIVEIRA ALFAIA', '993433110', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('SANDERSON KAIKI SERRÃO DOS SANTOS', v_escola_id, v_turma_f9t901, '9', '2011-12-20', '2026-01-23', 'NATALIA REREZINHA BATISTA SERRÃO', '991798203', 'Rua Lídia Doroteia Tavares', false);
  PERFORM fn_fix_aluno_2026('SANDIELY MARINHO DUARTE', v_escola_id, v_turma_f9t901, '9', '2012-04-06', '2026-01-06', 'LEIDIANE DE MELO MARINHO', '991328532', 'Rua Padre Marcos', false);
  PERFORM fn_fix_aluno_2026('SANDYANE DA SILVA CAMPOS', v_escola_id, v_turma_f9t901, '9', '2012-02-10', '2025-12-12', 'MARIA ADRIANA DA SILVA CAMPOS', '993275855', 'Rua Cirino Gomes', false);
  PERFORM fn_fix_aluno_2026('WENDEL DOS SANTOS DA SILVA', v_escola_id, v_turma_f9t901, '9', '2012-06-23', '2025-12-16', 'IONETE MORAES DOS SANTOS', '992263073', 'Rua Guaracy Frazão', false);
  PERFORM fn_fix_aluno_2026('WENNDA GABRYELA SOARES BELÉM', v_escola_id, v_turma_f9t901, '9', '2012-06-11', '2026-02-23', 'JHON WEYSLEM FERREIRA BELÉM', '992651855', 'Rua Padre Marcos', false);

END $$;

-- Gerar códigos para alunos sem código
UPDATE alunos
SET codigo = 'NSL-2026-' || LPAD(sub.row_num::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY serie, nome) as row_num
  FROM alunos
  WHERE escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
    AND ano_letivo = '2026'
    AND codigo IS NULL
) sub
WHERE alunos.id = sub.id;

-- Garantir resultados consolidados para todos
INSERT INTO resultados_consolidados (aluno_id, escola_id, turma_id, ano_letivo, serie, presenca, avaliacao_id)
SELECT
  a.id, a.escola_id, a.turma_id, '2026', a.serie, 'P', av.id
FROM alunos a
CROSS JOIN (
  SELECT id FROM avaliacoes WHERE ano_letivo = '2026' AND tipo = 'diagnostica' LIMIT 1
) av
WHERE a.escola_id = (SELECT id FROM escolas WHERE codigo = '15560350' AND ativo = true)
  AND a.ano_letivo = '2026'
  AND a.situacao = 'cursando'
  AND NOT EXISTS (
    SELECT 1 FROM resultados_consolidados rc
    WHERE rc.aluno_id = a.id AND rc.avaliacao_id = av.id
  );

-- Verificação final
DO $$
DECLARE
  v_escola_id UUID;
  v_total_2025 INT;
  v_total_2026 INT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo = '15560350' AND ativo = true;
  SELECT COUNT(*) INTO v_total_2025 FROM alunos WHERE escola_id = v_escola_id AND ano_letivo = '2025';
  SELECT COUNT(*) INTO v_total_2026 FROM alunos WHERE escola_id = v_escola_id AND ano_letivo = '2026';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Alunos 2025 restantes: %', v_total_2025;
  RAISE NOTICE 'Alunos 2026: % (esperado: 206)', v_total_2026;
  RAISE NOTICE '========================================';
END $$;

-- Limpar função
DROP FUNCTION IF EXISTS fn_fix_aluno_2026;
