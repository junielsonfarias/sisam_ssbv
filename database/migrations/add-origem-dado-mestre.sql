-- ============================================================================
-- add-origem-dado-mestre.sql
-- Data: 2026-06-21
-- Ciclo/Fase: FlowSchoolAgent — Ciclo 1, fase CORRECAO (branch auto/fluxo-escolar)
-- Gap (Media): Gestor (governanca) — rastreabilidade de origem do dado mestre.
--
-- Objetivo:
--   Permitir distinguir um cadastro mestre criado pelo Gestor de um criado pelo
--   ETL Sisam (ou seed), e manter o vinculo do registro com a importacao que o
--   originou. Sem isso nao ha como auditar nem reverter criacoes indevidas do ETL.
--
-- O que faz (em alunos, escolas, turmas, polos):
--   1. ADD COLUMN origem VARCHAR(16) NOT NULL DEFAULT 'gestor'
--        + CHECK origem IN ('gestor','sisam_etl','seed')  (pseudo-enum defensivo)
--   2. ADD COLUMN origem_importacao_id UUID NULL
--        + FK -> importacoes(id) ON DELETE SET NULL  (auditoria sobrevive ao
--          delete da importacao; coluna nullable porque cadastro do Gestor/seed
--          nao tem importacao associada)
--   3. Indice parcial em origem_importacao_id (WHERE NOT NULL) para consultas de
--      "o que veio desta importacao".
--
-- Idempotencia:
--   - ADD COLUMN IF NOT EXISTS (Postgres aplica DEFAULT a linhas existentes).
--   - CHECK e FK adicionados via bloco DO $$ ... $$ com guarda em pg_constraint
--     (ADD CONSTRAINT nao suporta IF NOT EXISTS).
--   - CREATE INDEX IF NOT EXISTS.
--   - Loop sobre as 4 tabelas: se alguma nao existir, faz RAISE NOTICE e pula.
--
-- Nao-destrutivo: apenas ADD COLUMN / ADD CONSTRAINT / CREATE INDEX. Nenhum
--   DROP/DELETE/UPDATE em massa. Linhas legadas recebem origem='gestor' pelo
--   DEFAULT (assuncao conservadora; reclassificacao de legado fica como PROPOSTA,
--   nao e feita aqui).
--
-- Rollback (manual, se necessario — NAO incluido por ser destrutivo):
--   ALTER TABLE <t> DROP CONSTRAINT IF EXISTS <t>_origem_importacao_id_fkey;
--   ALTER TABLE <t> DROP CONSTRAINT IF EXISTS <t>_origem_check;
--   DROP INDEX IF EXISTS idx_<t>_origem_importacao;
--   ALTER TABLE <t> DROP COLUMN IF EXISTS origem_importacao_id;
--   ALTER TABLE <t> DROP COLUMN IF EXISTS origem;
--
-- Aplicada via apply_migration SOMENTE no projeto educanet-demo
--   (project_id tbbnswuqsqhulserwtcc). NUNCA em producao.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    t TEXT;
    tabelas TEXT[] := ARRAY['alunos', 'escolas', 'turmas', 'polos'];
    n_existem INT := 0;
BEGIN
    FOREACH t IN ARRAY tabelas
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            RAISE NOTICE 'Tabela %.% nao existe — pulando.', 'public', t;
            CONTINUE;
        END IF;

        n_existem := n_existem + 1;

        -- 1. Coluna origem (pseudo-enum via CHECK), default 'gestor'
        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS origem VARCHAR(16) NOT NULL DEFAULT %L',
            t, 'gestor'
        );

        -- CHECK da origem (ADD CONSTRAINT nao tem IF NOT EXISTS — guarda manual)
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = format('public.%I', t)::regclass
              AND conname = format('%s_origem_check', t)
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (origem IN (%L, %L, %L))',
                t, format('%s_origem_check', t), 'gestor', 'sisam_etl', 'seed'
            );
        END IF;

        -- 2. Coluna origem_importacao_id (nullable) + FK -> importacoes(id)
        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS origem_importacao_id UUID',
            t
        );

        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'importacoes'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = format('public.%I', t)::regclass
              AND conname = format('%s_origem_importacao_id_fkey', t)
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ADD CONSTRAINT %I '
                'FOREIGN KEY (origem_importacao_id) REFERENCES public.importacoes(id) ON DELETE SET NULL',
                t, format('%s_origem_importacao_id_fkey', t)
            );
        END IF;

        -- 3. Indice parcial para "registros desta importacao"
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (origem_importacao_id) WHERE origem_importacao_id IS NOT NULL',
            format('idx_%s_origem_importacao', t), t
        );

        RAISE NOTICE 'Tabela %.%: colunas origem/origem_importacao_id garantidas.', 'public', t;
    END LOOP;

    IF n_existem = 0 THEN
        RAISE EXCEPTION 'Nenhuma das tabelas alvo (alunos/escolas/turmas/polos) existe — migration nao convergiu.';
    END IF;
END $$;

-- ============================================================================
-- Verificacao final: as 4 colunas devem existir em cada tabela presente.
-- ============================================================================
DO $$
DECLARE
    t TEXT;
    tabelas TEXT[] := ARRAY['alunos', 'escolas', 'turmas', 'polos'];
    faltando INT;
BEGIN
    FOREACH t IN ARRAY tabelas
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            CONTINUE;
        END IF;

        SELECT 2 - COUNT(*) INTO faltando
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t
          AND column_name IN ('origem', 'origem_importacao_id');

        IF faltando <> 0 THEN
            RAISE EXCEPTION 'Verificacao falhou em public.%: coluna(s) de origem ausente(s).', t;
        END IF;
    END LOOP;

    RAISE NOTICE 'Verificacao final OK: rastreabilidade de origem aplicada.';
END $$;

COMMIT;
