-- =====================================================
-- MIGRACAO: Adicionar CHECK Constraints para Validacao
-- Data: 2026-01-06
-- Descricao: Adiciona constraints para garantir integridade dos dados
-- =====================================================

-- IMPORTANTE: Execute este script em uma transacao
-- Se houver dados invalidos, a migracao falhara
-- Use o script de correcao primeiro se necessario

BEGIN;

-- =====================================================
-- 1. CONSTRAINTS PARA NOTAS (0 a 10)
-- =====================================================

-- Tabela: resultados_provas
-- Primeiro, corrigir dados invalidos existentes (se houver)
UPDATE resultados_provas
SET nota = CASE
    WHEN nota < 0 THEN 0
    WHEN nota > 10 THEN 10
    ELSE nota
END
WHERE nota IS NOT NULL AND (nota < 0 OR nota > 10);

-- Adicionar constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_resultados_provas_nota_range'
    ) THEN
        ALTER TABLE resultados_provas
        ADD CONSTRAINT chk_resultados_provas_nota_range
        CHECK (nota IS NULL OR (nota >= 0 AND nota <= 10));
        RAISE NOTICE 'Constraint chk_resultados_provas_nota_range adicionada';
    ELSE
        RAISE NOTICE 'Constraint chk_resultados_provas_nota_range ja existe';
    END IF;
END $$;

-- Tabela: resultados_consolidados - notas por disciplina
UPDATE resultados_consolidados
SET nota_lp = CASE WHEN nota_lp < 0 THEN 0 WHEN nota_lp > 10 THEN 10 ELSE nota_lp END
WHERE nota_lp IS NOT NULL AND (nota_lp < 0 OR nota_lp > 10);

UPDATE resultados_consolidados
SET nota_ch = CASE WHEN nota_ch < 0 THEN 0 WHEN nota_ch > 10 THEN 10 ELSE nota_ch END
WHERE nota_ch IS NOT NULL AND (nota_ch < 0 OR nota_ch > 10);

UPDATE resultados_consolidados
SET nota_mat = CASE WHEN nota_mat < 0 THEN 0 WHEN nota_mat > 10 THEN 10 ELSE nota_mat END
WHERE nota_mat IS NOT NULL AND (nota_mat < 0 OR nota_mat > 10);

UPDATE resultados_consolidados
SET nota_cn = CASE WHEN nota_cn < 0 THEN 0 WHEN nota_cn > 10 THEN 10 ELSE nota_cn END
WHERE nota_cn IS NOT NULL AND (nota_cn < 0 OR nota_cn > 10);

UPDATE resultados_consolidados
SET media_aluno = CASE WHEN media_aluno < 0 THEN 0 WHEN media_aluno > 10 THEN 10 ELSE media_aluno END
WHERE media_aluno IS NOT NULL AND (media_aluno < 0 OR media_aluno > 10);

-- Adicionar constraints para notas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_nota_lp') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_nota_lp
        CHECK (nota_lp IS NULL OR (nota_lp >= 0 AND nota_lp <= 10));
        RAISE NOTICE 'Constraint chk_resultados_consolidados_nota_lp adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_nota_ch') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_nota_ch
        CHECK (nota_ch IS NULL OR (nota_ch >= 0 AND nota_ch <= 10));
        RAISE NOTICE 'Constraint chk_resultados_consolidados_nota_ch adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_nota_mat') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_nota_mat
        CHECK (nota_mat IS NULL OR (nota_mat >= 0 AND nota_mat <= 10));
        RAISE NOTICE 'Constraint chk_resultados_consolidados_nota_mat adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_nota_cn') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_nota_cn
        CHECK (nota_cn IS NULL OR (nota_cn >= 0 AND nota_cn <= 10));
        RAISE NOTICE 'Constraint chk_resultados_consolidados_nota_cn adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_media') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_media
        CHECK (media_aluno IS NULL OR (media_aluno >= 0 AND media_aluno <= 10));
        RAISE NOTICE 'Constraint chk_resultados_consolidados_media adicionada';
    END IF;
END $$;


-- =====================================================
-- 2. CONSTRAINTS PARA PRESENCA ('P' ou 'F')
-- =====================================================

-- Normalizar dados existentes (converter para maiusculo)
UPDATE resultados_provas
SET presenca = UPPER(TRIM(presenca))
WHERE presenca IS NOT NULL;

UPDATE resultados_consolidados
SET presenca = UPPER(TRIM(presenca))
WHERE presenca IS NOT NULL;

-- Corrigir valores invalidos (converter para 'P' como padrao)
UPDATE resultados_provas
SET presenca = 'P'
WHERE presenca IS NOT NULL AND presenca NOT IN ('P', 'F');

UPDATE resultados_consolidados
SET presenca = 'P'
WHERE presenca IS NOT NULL AND presenca NOT IN ('P', 'F');

-- Adicionar constraints para presenca
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_provas_presenca') THEN
        ALTER TABLE resultados_provas
        ADD CONSTRAINT chk_resultados_provas_presenca
        CHECK (presenca IS NULL OR presenca IN ('P', 'F'));
        RAISE NOTICE 'Constraint chk_resultados_provas_presenca adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_presenca') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_presenca
        CHECK (presenca IS NULL OR presenca IN ('P', 'F'));
        RAISE NOTICE 'Constraint chk_resultados_consolidados_presenca adicionada';
    END IF;
END $$;


-- =====================================================
-- 3. CONSTRAINTS PARA TOTAL DE ACERTOS (>= 0)
-- =====================================================

-- Corrigir valores negativos
UPDATE resultados_consolidados
SET total_acertos_lp = 0 WHERE total_acertos_lp < 0;

UPDATE resultados_consolidados
SET total_acertos_ch = 0 WHERE total_acertos_ch < 0;

UPDATE resultados_consolidados
SET total_acertos_mat = 0 WHERE total_acertos_mat < 0;

UPDATE resultados_consolidados
SET total_acertos_cn = 0 WHERE total_acertos_cn < 0;

-- Adicionar constraints para acertos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_acertos_lp') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_acertos_lp
        CHECK (total_acertos_lp IS NULL OR total_acertos_lp >= 0);
        RAISE NOTICE 'Constraint chk_resultados_consolidados_acertos_lp adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_acertos_ch') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_acertos_ch
        CHECK (total_acertos_ch IS NULL OR total_acertos_ch >= 0);
        RAISE NOTICE 'Constraint chk_resultados_consolidados_acertos_ch adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_acertos_mat') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_acertos_mat
        CHECK (total_acertos_mat IS NULL OR total_acertos_mat >= 0);
        RAISE NOTICE 'Constraint chk_resultados_consolidados_acertos_mat adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_acertos_cn') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_acertos_cn
        CHECK (total_acertos_cn IS NULL OR total_acertos_cn >= 0);
        RAISE NOTICE 'Constraint chk_resultados_consolidados_acertos_cn adicionada';
    END IF;
END $$;


-- =====================================================
-- 4. CONSTRAINT PARA RESPOSTA DO ALUNO (A, B, C, D, E)
-- =====================================================

-- Normalizar respostas existentes
UPDATE resultados_provas
SET resposta_aluno = UPPER(TRIM(resposta_aluno))
WHERE resposta_aluno IS NOT NULL;

-- Limpar respostas invalidas (definir como NULL)
UPDATE resultados_provas
SET resposta_aluno = NULL
WHERE resposta_aluno IS NOT NULL
AND resposta_aluno NOT IN ('A', 'B', 'C', 'D', 'E', '');

-- Converter vazio para NULL
UPDATE resultados_provas
SET resposta_aluno = NULL
WHERE resposta_aluno = '';

-- Adicionar constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_provas_resposta') THEN
        ALTER TABLE resultados_provas
        ADD CONSTRAINT chk_resultados_provas_resposta
        CHECK (resposta_aluno IS NULL OR resposta_aluno IN ('A', 'B', 'C', 'D', 'E'));
        RAISE NOTICE 'Constraint chk_resultados_provas_resposta adicionada';
    END IF;
END $$;


-- =====================================================
-- 5. CONSTRAINT PARA ANO LETIVO (formato valido)
-- =====================================================

-- Adicionar constraint para ano_letivo (4 digitos numericos)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_provas_ano_letivo') THEN
        ALTER TABLE resultados_provas
        ADD CONSTRAINT chk_resultados_provas_ano_letivo
        CHECK (ano_letivo ~ '^\d{4}$');
        RAISE NOTICE 'Constraint chk_resultados_provas_ano_letivo adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resultados_consolidados_ano_letivo') THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT chk_resultados_consolidados_ano_letivo
        CHECK (ano_letivo ~ '^\d{4}$');
        RAISE NOTICE 'Constraint chk_resultados_consolidados_ano_letivo adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_turmas_ano_letivo') THEN
        ALTER TABLE turmas
        ADD CONSTRAINT chk_turmas_ano_letivo
        CHECK (ano_letivo ~ '^\d{4}$');
        RAISE NOTICE 'Constraint chk_turmas_ano_letivo adicionada';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_alunos_ano_letivo') THEN
        ALTER TABLE alunos
        ADD CONSTRAINT chk_alunos_ano_letivo
        CHECK (ano_letivo IS NULL OR ano_letivo ~ '^\d{4}$');
        RAISE NOTICE 'Constraint chk_alunos_ano_letivo adicionada';
    END IF;
END $$;


-- =====================================================
-- 6. CONSTRAINT PARA GABARITO (A, B, C, D, E)
-- =====================================================

-- Normalizar gabaritos existentes
UPDATE questoes
SET gabarito = UPPER(TRIM(gabarito))
WHERE gabarito IS NOT NULL;

-- Adicionar constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_questoes_gabarito') THEN
        ALTER TABLE questoes
        ADD CONSTRAINT chk_questoes_gabarito
        CHECK (gabarito IS NULL OR gabarito IN ('A', 'B', 'C', 'D', 'E'));
        RAISE NOTICE 'Constraint chk_questoes_gabarito adicionada';
    END IF;
END $$;


-- =====================================================
-- COMMIT DA TRANSACAO
-- =====================================================

COMMIT;

-- =====================================================
-- VERIFICACAO FINAL
-- =====================================================

-- Listar todas as constraints adicionadas
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
AND tc.table_schema = 'public'
AND tc.table_name IN ('resultados_provas', 'resultados_consolidados', 'questoes', 'turmas', 'alunos')
ORDER BY tc.table_name, tc.constraint_name;
