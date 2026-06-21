-- ============================================================================
-- add-trigger-coerencia-origem-aluno.sql
-- Data: 2026-06-21
-- Ciclo/Fase: FlowSchoolAgent — Ciclo 4, fase CORRECAO (branch auto/fluxo-escolar)
-- Gap (Baixa): Sisam/Gestor (governanca de mestre) — defesa em profundidade.
--
-- Problema:
--   A regra de quem cria/marca aluno e sua origem vive apenas no service
--   (lib/services/gestor/mestre.service.ts e a porta do ETL). Um bypass do
--   service (script, seed, job futuro, INSERT manual) consegue inserir um aluno
--   vindo de importacao ETL marcado como origem='gestor' (ou um aluno 'gestor'
--   carregando um origem_importacao_id), quebrando a rastreabilidade. Combinado
--   com o gap 1 (porta que nao marca origem), o banco hoje nao impede esse
--   estado incoerente entre origem e origem_importacao_id.
--
-- Objetivo:
--   Espelhar no banco, como ultima linha de defesa, a coerencia entre a coluna
--   origem e a presenca do vinculo de importacao (origem_importacao_id):
--     - se origem_importacao_id IS NOT NULL  -> origem DEVE ser 'sisam_etl'
--     - se origem = 'sisam_etl'              -> origem_importacao_id DEVE existir
--   Em palavras: ter vinculo de importacao <=> ser um aluno do ETL Sisam.
--   Para origem 'gestor' e 'seed' o vinculo de importacao deve ser NULL.
--
--   Diferente do gate de ESCOLAS (add-trigger-gate-origem-escola.sql), aqui o
--   ETL PODE criar aluno (origem='sisam_etl' e legitima). A trigger NAO bloqueia
--   criacao legitima — apenas exige que origem e rastreio (origem_importacao_id)
--   sejam coerentes entre si. Cadastro manual via Gestor (origem='gestor',
--   sem importacao) e seed continuam passando normalmente.
--
-- Custo de performance (avaliado p/ performance-sisam):
--   - Trigger por linha (FOR EACH ROW), porem so dispara em INSERT e em UPDATE
--     QUE TOCA origem ou origem_importacao_id (UPDATE OF origem,
--     origem_importacao_id). UPDATEs comuns de aluno (nome, turma, situacao etc.)
--     NAO disparam.
--   - A funcao so le NEW.* e built-ins — sem query adicional ao banco. Overhead
--     desprezivel mesmo em importacao em massa (um IF por linha inserida).
--
-- Idempotencia:
--   - CREATE OR REPLACE FUNCTION (substitui sem erro).
--   - DROP TRIGGER IF EXISTS + CREATE TRIGGER (recria limpo).
--   - Guarda em information_schema: se a tabela alunos (ou as colunas) nao
--     existir, faz RAISE NOTICE e nao cria nada.
--
-- Nao-destrutivo: apenas CREATE FUNCTION/TRIGGER. Nenhum DROP de coluna/tabela,
--   nenhum DELETE/UPDATE de dados, nenhuma reclassificacao de linhas legadas.
--   (Diagnostico no demo em 2026-06-21: 1608 alunos, todos origem='gestor' sem
--    origem_importacao_id — 100% coerentes, nada bloqueado.)
--
-- Rollback (manual, se necessario):
--   DROP TRIGGER IF EXISTS trg_alunos_coerencia_origem ON public.alunos;
--   DROP FUNCTION IF EXISTS public.fn_alunos_coerencia_origem();
--
-- Aplicada via apply_migration SOMENTE no projeto educanet-demo
--   (project_id tbbnswuqsqhulserwtcc). NUNCA em producao.
-- ============================================================================

BEGIN;

-- Funcao de coerencia (idempotente via CREATE OR REPLACE).
-- SET search_path = '' fixa o caminho de busca (hardening — advisor
-- function_search_path_mutable). A funcao so usa NEW.* e built-ins.
CREATE OR REPLACE FUNCTION public.fn_alunos_coerencia_origem()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
    -- 1. Vinculo de importacao implica origem do ETL.
    --    Tem origem_importacao_id mas origem != 'sisam_etl' -> incoerente.
    IF NEW.origem_importacao_id IS NOT NULL AND NEW.origem IS DISTINCT FROM 'sisam_etl' THEN
        RAISE EXCEPTION
            'Incoerencia de origem: aluno com origem_importacao_id (vinculo de importacao ETL) deve ter origem = sisam_etl, mas tem origem = %.', NEW.origem
            USING ERRCODE = 'check_violation';
    END IF;

    -- 2. Origem do ETL implica vinculo de importacao.
    --    origem='sisam_etl' sem origem_importacao_id -> rastreio ausente.
    IF NEW.origem = 'sisam_etl' AND NEW.origem_importacao_id IS NULL THEN
        RAISE EXCEPTION
            'Incoerencia de origem: aluno com origem = sisam_etl deve referenciar a importacao de origem (origem_importacao_id NOT NULL). Cadastro ETL exige rastreio.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$fn$;

-- Trigger (idempotente via DROP IF EXISTS + CREATE). So dispara em INSERT e em
-- UPDATE que toca origem ou origem_importacao_id.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'alunos'
          AND column_name = 'origem'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'alunos'
          AND column_name = 'origem_importacao_id'
    ) THEN
        DROP TRIGGER IF EXISTS trg_alunos_coerencia_origem ON public.alunos;
        CREATE TRIGGER trg_alunos_coerencia_origem
            BEFORE INSERT OR UPDATE OF origem, origem_importacao_id ON public.alunos
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_alunos_coerencia_origem();
        RAISE NOTICE 'Trigger trg_alunos_coerencia_origem (re)criada em public.alunos.';
    ELSE
        RAISE NOTICE 'Tabela public.alunos (ou colunas origem/origem_importacao_id) ausente — trigger nao criada.';
    END IF;
END $$;

-- ============================================================================
-- Verificacao final: a trigger deve existir (quando alunos+colunas existem).
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'alunos'
          AND column_name = 'origem_importacao_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgrelid = 'public.alunos'::regclass
              AND tgname = 'trg_alunos_coerencia_origem'
              AND NOT tgisinternal
        ) THEN
            RAISE EXCEPTION 'Verificacao falhou: trigger trg_alunos_coerencia_origem ausente em public.alunos.';
        END IF;
        RAISE NOTICE 'Verificacao final OK: coerencia origem<->origem_importacao_id (defesa em profundidade) ativa em alunos.';
    END IF;
END $$;

COMMIT;
