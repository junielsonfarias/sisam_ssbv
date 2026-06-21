-- ============================================================================
-- add-trigger-coerencia-origem-turma.sql
-- Data: 2026-06-21
-- Ciclo/Fase: FlowSchoolAgent — Ciclo 6, fase CORRECAO (branch auto/fluxo-escolar)
-- Gap (Baixa): Gestor como fonte unica — defesa em profundidade no banco
--              (anti-duplicacao / anti-mestre-cruzado).
--
-- Problema:
--   alunos ja possui trg_alunos_coerencia_origem (Ciclo 4) e escolas possui
--   trg_escolas_gate_origem (Ciclo 3) — o banco protege a fonte unica para essas
--   duas entidades. turmas, porem, ficou SEM barreira: em tese um INSERT/UPDATE
--   de mestre fora do fluxo Gestor (script, seed, job futuro, INSERT manual)
--   pode gravar uma turma com origem/origem_importacao_id incoerentes, sem que o
--   banco impeca. Isso cria assimetria na defesa em profundidade frente a
--   escolas e alunos. A regra de coerencia vive hoje so no service
--   (lib/services/gestor/mestre.service.ts e a porta do ETL).
--
-- Objetivo:
--   Espelhar em turmas EXATAMENTE a politica de coerencia ja aplicada em alunos
--   (NAO o gate de bloqueio de escolas — turma, assim como aluno, PODE ser criada
--    pelo ETL Sisam com origem='sisam_etl' legitima). Como ultima linha de defesa,
--   exigir coerencia entre a coluna origem e o vinculo de importacao
--   (origem_importacao_id):
--     - se origem_importacao_id IS NOT NULL  -> origem DEVE ser 'sisam_etl'
--     - se origem = 'sisam_etl'              -> origem_importacao_id DEVE existir
--   Em palavras: ter vinculo de importacao <=> ser uma turma do ETL Sisam.
--   Para origem 'gestor' e 'seed' o vinculo de importacao deve ser NULL.
--
--   A trigger NAO bloqueia criacao legitima (cadastro Gestor com origem='gestor'
--   sem importacao, seed, ou ETL com origem='sisam_etl' + origem_importacao_id
--   passam normalmente) — apenas barra estados incoerentes (anti-mestre-cruzado).
--   O CHECK turmas_origem_check (gestor|sisam_etl|seed) ja cobre o pseudo-enum.
--
-- Custo de performance (avaliado p/ performance-sisam):
--   - Trigger por linha (FOR EACH ROW), porem so dispara em INSERT e em UPDATE
--     QUE TOCA origem ou origem_importacao_id (UPDATE OF origem,
--     origem_importacao_id). UPDATEs comuns de turma (nome, serie, turno,
--     ano_letivo, ativo etc.) NAO disparam.
--   - A funcao so le NEW.* e built-ins — sem query adicional ao banco. Overhead
--     desprezivel mesmo em importacao em massa (um IF por linha inserida).
--
-- Idempotencia:
--   - CREATE OR REPLACE FUNCTION (substitui sem erro).
--   - DROP TRIGGER IF EXISTS + CREATE TRIGGER (recria limpo).
--   - Guarda em information_schema: se a tabela turmas (ou as colunas) nao
--     existir, faz RAISE NOTICE e nao cria nada.
--
-- Nao-destrutivo: apenas CREATE FUNCTION/TRIGGER. Nenhum DROP de coluna/tabela,
--   nenhum DELETE/UPDATE de dados, nenhuma reclassificacao de linhas legadas.
--   (Diagnostico no demo em 2026-06-21: 183 turmas, todas origem='gestor' sem
--    origem_importacao_id — 100% coerentes, nada bloqueado.)
--
-- Rollback (manual, se necessario):
--   DROP TRIGGER IF EXISTS trg_turmas_coerencia_origem ON public.turmas;
--   DROP FUNCTION IF EXISTS public.fn_turmas_coerencia_origem();
--
-- Aplicada via apply_migration SOMENTE no projeto educanet-demo
--   (project_id tbbnswuqsqhulserwtcc). NUNCA em producao.
-- ============================================================================

BEGIN;

-- Funcao de coerencia (idempotente via CREATE OR REPLACE).
-- Espelha fn_alunos_coerencia_origem. SET search_path = '' fixa o caminho de
-- busca (hardening — advisor function_search_path_mutable). A funcao so usa
-- NEW.* e built-ins.
CREATE OR REPLACE FUNCTION public.fn_turmas_coerencia_origem()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
    -- 1. Vinculo de importacao implica origem do ETL.
    --    Tem origem_importacao_id mas origem != 'sisam_etl' -> incoerente.
    IF NEW.origem_importacao_id IS NOT NULL AND NEW.origem IS DISTINCT FROM 'sisam_etl' THEN
        RAISE EXCEPTION
            'Incoerencia de origem: turma com origem_importacao_id (vinculo de importacao ETL) deve ter origem = sisam_etl, mas tem origem = %.', NEW.origem
            USING ERRCODE = 'check_violation';
    END IF;

    -- 2. Origem do ETL implica vinculo de importacao.
    --    origem='sisam_etl' sem origem_importacao_id -> rastreio ausente.
    IF NEW.origem = 'sisam_etl' AND NEW.origem_importacao_id IS NULL THEN
        RAISE EXCEPTION
            'Incoerencia de origem: turma com origem = sisam_etl deve referenciar a importacao de origem (origem_importacao_id NOT NULL). Cadastro ETL exige rastreio.'
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
        WHERE table_schema = 'public' AND table_name = 'turmas'
          AND column_name = 'origem'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'turmas'
          AND column_name = 'origem_importacao_id'
    ) THEN
        DROP TRIGGER IF EXISTS trg_turmas_coerencia_origem ON public.turmas;
        CREATE TRIGGER trg_turmas_coerencia_origem
            BEFORE INSERT OR UPDATE OF origem, origem_importacao_id ON public.turmas
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_turmas_coerencia_origem();
        RAISE NOTICE 'Trigger trg_turmas_coerencia_origem (re)criada em public.turmas.';
    ELSE
        RAISE NOTICE 'Tabela public.turmas (ou colunas origem/origem_importacao_id) ausente — trigger nao criada.';
    END IF;
END $$;

-- ============================================================================
-- Verificacao final: a trigger deve existir (quando turmas+colunas existem).
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'turmas'
          AND column_name = 'origem_importacao_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgrelid = 'public.turmas'::regclass
              AND tgname = 'trg_turmas_coerencia_origem'
              AND NOT tgisinternal
        ) THEN
            RAISE EXCEPTION 'Verificacao falhou: trigger trg_turmas_coerencia_origem ausente em public.turmas.';
        END IF;
        RAISE NOTICE 'Verificacao final OK: coerencia origem<->origem_importacao_id (defesa em profundidade) ativa em turmas.';
    END IF;
END $$;

COMMIT;
