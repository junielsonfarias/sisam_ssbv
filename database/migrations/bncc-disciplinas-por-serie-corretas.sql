-- =====================================================
-- Migração: Disciplinas corretas por série conforme BNCC
-- Data: 2026-04-01
-- Município: São Sebastião da Boa Vista/PA
-- Descrição: Corrige disciplinas que estavam iguais para todas as séries.
--            Agora segue a BNCC com diferenciação por etapa/ano.
--
-- BNCC - Áreas do Conhecimento e Componentes Curriculares:
--   1. Linguagens: Língua Portuguesa, Arte, Educação Física, Língua Inglesa (6º-9º)
--   2. Matemática: Matemática
--   3. Ciências da Natureza: Ciências
--   4. Ciências Humanas: História, Geografia
--   5. Ensino Religioso: Ensino Religioso (facultativo ao aluno)
--
-- Referências:
--   - BNCC (basenacionalcomum.mec.gov.br)
--   - Documento Curricular do Estado do Pará (SEDUC-PA)
--   - Resolução CNE/CEB nº 7/2010 (Ensino Fundamental 9 anos)
-- =====================================================

BEGIN;

-- ============================================
-- PARTE 1: Garantir que todas as disciplinas existem
-- ============================================

-- Educação Infantil usa "Campos de Experiência", não disciplinas tradicionais
-- Vamos criar os campos de experiência como "disciplinas" especiais para EI
INSERT INTO disciplinas_escolares (codigo, nome, abreviacao, ordem, ativo)
VALUES
  ('ETS', 'O eu, o outro e o nós', 'Eu/Outro', 10, true),
  ('CMP', 'Corpo, gestos e movimentos', 'Corpo', 11, true),
  ('TSF', 'Traços, sons, cores e formas', 'Traços', 12, true),
  ('EFO', 'Escuta, fala, pensamento e imaginação', 'Escuta', 13, true),
  ('ENQ', 'Espaços, tempos, quantidades, relações e transformações', 'Espaço', 14, true)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  abreviacao = EXCLUDED.abreviacao,
  ordem = EXCLUDED.ordem,
  ativo = true;

-- ============================================
-- PARTE 2: Limpar associações antigas (resetar para recriar corretas)
-- ============================================

-- Desativar todas as associações existentes (não deletar para manter histórico)
UPDATE series_disciplinas SET ativo = false;

-- ============================================
-- PARTE 3: EDUCAÇÃO INFANTIL — Campos de Experiência (BNCC)
-- ============================================
-- Creche (0-3 anos) e Pré-escola (4-5 anos)
-- Avaliação: parecer descritivo, sem notas numéricas
-- 5 Campos de Experiência da BNCC

INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true, 4, true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.etapa = 'educacao_infantil'
  AND de.codigo IN ('ETS', 'CMP', 'TSF', 'EFO', 'ENQ')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = true,
  carga_horaria_semanal = 4,
  ativo = true;

-- ============================================
-- PARTE 4: 1º ANO — Foco na Alfabetização (BNCC)
-- ============================================
-- Disciplinas: LP (ênfase), MAT, CIE, HIS, GEO, ART, EDF, REL
-- Sem Inglês (obrigatório só a partir do 6º ano)
-- Carga horária: LP e MAT com mais horas (alfabetização)

INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 7   -- Ênfase em alfabetização
        WHEN 'MAT' THEN 5  -- Ênfase em numeramento
        WHEN 'CIE' THEN 2
        WHEN 'HIS' THEN 2
        WHEN 'GEO' THEN 2
        WHEN 'ART' THEN 2
        WHEN 'EDF' THEN 2
        WHEN 'REL' THEN 1
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo = '1'
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = EXCLUDED.obrigatoria,
  carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
  ativo = true;

-- ============================================
-- PARTE 5: 2º e 3º ANO — Consolidação Alfabetização (BNCC)
-- ============================================
-- BNCC: "toda criança deve estar plenamente alfabetizada até o fim do 2º ano"
-- Disciplinas: LP, MAT, CIE, HIS, GEO, ART, EDF, REL (8 disciplinas)
-- LP ainda com carga alta para consolidar alfabetização

INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 6
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 2
        WHEN 'HIS' THEN 2
        WHEN 'GEO' THEN 2
        WHEN 'ART' THEN 2
        WHEN 'EDF' THEN 2
        WHEN 'REL' THEN 1
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('2', '3')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = EXCLUDED.obrigatoria,
  carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
  ativo = true;

-- ============================================
-- PARTE 6: 4º e 5º ANO — Aprofundamento Anos Iniciais (BNCC)
-- ============================================
-- Transição: aluno já alfabetizado, aprofundar todas as áreas
-- Disciplinas: LP, MAT, CIE, HIS, GEO, ART, EDF, REL (8 disciplinas)
-- Distribuição mais equilibrada (LP/MAT perdem um pouco para CIE/HIS/GEO)

INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 5
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 3
        WHEN 'HIS' THEN 3
        WHEN 'GEO' THEN 3
        WHEN 'ART' THEN 2
        WHEN 'EDF' THEN 2
        WHEN 'REL' THEN 1
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('4', '5')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = EXCLUDED.obrigatoria,
  carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
  ativo = true;

-- ============================================
-- PARTE 7: 6º e 7º ANO — Início Anos Finais (BNCC)
-- ============================================
-- Transição para Anos Finais: professores por disciplina
-- NOVIDADE: Língua Inglesa obrigatória (BNCC Art. 26, §5º da LDB)
-- Disciplinas: LP, MAT, CIE, HIS, GEO, ART, EDF, REL, ING (9 disciplinas)

INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id,
    CASE de.codigo
        WHEN 'REL' THEN false  -- Ensino Religioso: facultativo ao aluno (BNCC)
        ELSE true
    END,
    CASE de.codigo
        WHEN 'LP' THEN 5
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 3
        WHEN 'HIS' THEN 3
        WHEN 'GEO' THEN 3
        WHEN 'ART' THEN 1
        WHEN 'EDF' THEN 2
        WHEN 'REL' THEN 1
        WHEN 'ING' THEN 2
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('6', '7')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL', 'ING')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = EXCLUDED.obrigatoria,
  carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
  ativo = true;

-- ============================================
-- PARTE 8: 8º e 9º ANO — Consolidação Anos Finais (BNCC)
-- ============================================
-- Aprofundamento e preparação para Ensino Médio
-- Disciplinas: LP, MAT, CIE, HIS, GEO, ART, EDF, REL, ING (9 disciplinas)
-- Ciências com mais carga (Física, Química, Biologia integradas)

INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id,
    CASE de.codigo
        WHEN 'REL' THEN false
        ELSE true
    END,
    CASE de.codigo
        WHEN 'LP' THEN 5
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 4  -- Mais carga: Física + Química + Biologia
        WHEN 'HIS' THEN 3
        WHEN 'GEO' THEN 3
        WHEN 'ART' THEN 1
        WHEN 'EDF' THEN 2
        WHEN 'REL' THEN 1
        WHEN 'ING' THEN 2
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('8', '9')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'EDF', 'REL', 'ING')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = EXCLUDED.obrigatoria,
  carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
  ativo = true;

-- ============================================
-- PARTE 9: EJA — Educação de Jovens e Adultos
-- ============================================
-- EJA 1-2 (equivalente Anos Iniciais): 5 disciplinas básicas
-- EJA 3-4 (equivalente Anos Finais): 6 disciplinas (inclui Inglês)

-- EJA 1-2 (Anos Iniciais)
INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 5
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 3
        WHEN 'HIS' THEN 3
        WHEN 'GEO' THEN 3
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('EJA1', 'EJA2')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = EXCLUDED.obrigatoria,
  carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
  ativo = true;

-- EJA 3-4 (Anos Finais) — inclui Inglês
INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
SELECT se.id, de.id, true,
    CASE de.codigo
        WHEN 'LP' THEN 5
        WHEN 'MAT' THEN 5
        WHEN 'CIE' THEN 3
        WHEN 'HIS' THEN 3
        WHEN 'GEO' THEN 3
        WHEN 'ING' THEN 2
    END,
    true
FROM series_escolares se
CROSS JOIN disciplinas_escolares de
WHERE se.codigo IN ('EJA3', 'EJA4')
  AND de.codigo IN ('LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ING')
  AND de.ativo = true
ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
  obrigatoria = EXCLUDED.obrigatoria,
  carga_horaria_semanal = EXCLUDED.carga_horaria_semanal,
  ativo = true;

COMMIT;
