-- ============================================================================
-- add-trigger-gate-origem-escola.sql
-- Data: 2026-06-21
-- Ciclo/Fase: FlowSchoolAgent — Ciclo 3, fase CORRECAO (branch auto/fluxo-escolar)
-- Gap (Media): Gestor Escolar (banco / fonte unica) — defesa em profundidade.
--
-- Problema:
--   A "fonte unica" da regra de quem cria dado mestre vive apenas no service
--   (lib/services/gestor/mestre.service.ts -> podeCriarMestre()). Qualquer bypass
--   do service (scripts, seeds, jobs futuros, INSERT manual) consegue criar uma
--   escola sem rastreio e, pior, com origem='sisam_etl' — violando o gate de
--   habilitacao (o ETL Sisam NUNCA pode criar escola). O banco nao protege a
--   fonte unica.
--
-- Objetivo:
--   Espelhar no banco a politica podeCriarMestre('sisam_etl','escola') === false,
--   como ultima linha de defesa. Trigger BEFORE INSERT OR UPDATE OF origem em
--   public.escolas que:
--     - exige origem definida e dentro do pseudo-enum (gestor|sisam_etl|seed);
--       (o CHECK escolas_origem_check ja cobre o pseudo-enum; a trigger reforca
--        com mensagem clara e cobre o caso de origem em branco)
--     - BLOQUEIA origem='sisam_etl' para escola (gate de habilitacao), com
--       RAISE EXCEPTION explicito — mesmo via bypass do service.
--
--   Escopo intencionalmente restrito a ESCOLAS: e a unica entidade cujo gate
--   (podeCriarMestre('sisam_etl', X)) e false. Para polo/turma/aluno o ETL PODE
--   criar (origem='sisam_etl' e legitima), entao trigger de bloqueio ali seria
--   incorreta. Para essas, o CHECK de origem (Ciclo 1) ja garante origem valida.
--
-- Custo de performance (avaliado p/ performance-sisam):
--   - Trigger por linha (FOR EACH ROW), porem so dispara em INSERT e em UPDATE
--     QUE TOCA a coluna origem (UPDATE OF origem). UPDATEs normais de escola
--     (que nao mexem em origem) NAO disparam.
--   - escolas e tabela de baixissimo volume (5 linhas no demo; dezenas em prod)
--     e importacao em massa nao cria escolas (gate). Overhead desprezivel.
--
-- Idempotencia:
--   - CREATE OR REPLACE FUNCTION (substitui a funcao sem erro).
--   - DROP TRIGGER IF EXISTS + CREATE TRIGGER (recria limpo).
--   - Guarda em information_schema: se a tabela escolas nao existir, faz
--     RAISE NOTICE e nao cria nada.
--
-- Nao-destrutivo: apenas CREATE FUNCTION/TRIGGER. Nenhum DROP de coluna/tabela,
--   nenhum DELETE/UPDATE de dados. Nao reclassifica linhas legadas.
--
-- Rollback (manual, se necessario):
--   DROP TRIGGER IF EXISTS trg_escolas_gate_origem ON public.escolas;
--   DROP FUNCTION IF EXISTS public.fn_escolas_gate_origem();
--
-- Aplicada via apply_migration SOMENTE no projeto educanet-demo
--   (project_id tbbnswuqsqhulserwtcc). NUNCA em producao.
-- ============================================================================

BEGIN;

-- Funcao do gate (idempotente via CREATE OR REPLACE).
-- Espelha a politica da fonte unica (mestre.service.ts):
--   podeCriarMestre('sisam_etl', 'escola') === false.
-- SET search_path = '' fixa o caminho de busca (hardening — advisor
-- function_search_path_mutable). A funcao so usa built-ins (btrim) e NEW.*,
-- entao nao depende do search_path; fixar e seguro.
CREATE OR REPLACE FUNCTION public.fn_escolas_gate_origem()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
    -- 1. origem deve estar definida (NULL/branco nao e aceito como "sem rastreio").
    IF NEW.origem IS NULL OR btrim(NEW.origem) = '' THEN
        RAISE EXCEPTION
            'escolas.origem e obrigatoria (gestor|sisam_etl|seed). Cadastro mestre exige rastreio de origem.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- 2. pseudo-enum (reforco da mensagem; CHECK escolas_origem_check ja garante).
    IF NEW.origem NOT IN ('gestor', 'sisam_etl', 'seed') THEN
        RAISE EXCEPTION
            'escolas.origem invalida: %. Valores aceitos: gestor, sisam_etl, seed.', NEW.origem
            USING ERRCODE = 'check_violation';
    END IF;

    -- 3. GATE: ETL Sisam NUNCA cria/marca escola. Espelha podeCriarMestre('sisam_etl','escola')=false.
    IF NEW.origem = 'sisam_etl' THEN
        RAISE EXCEPTION
            'Gate de habilitacao: o ETL Sisam (origem=sisam_etl) nao pode criar/definir escola. Escola e responsabilidade do modulo Gestor.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$fn$;

-- Trigger (idempotente via DROP IF EXISTS + CREATE). So dispara em INSERT e em
-- UPDATE que toca a coluna origem — UPDATEs comuns de escola nao pagam o custo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'escolas'
    ) THEN
        DROP TRIGGER IF EXISTS trg_escolas_gate_origem ON public.escolas;
        CREATE TRIGGER trg_escolas_gate_origem
            BEFORE INSERT OR UPDATE OF origem ON public.escolas
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_escolas_gate_origem();
        RAISE NOTICE 'Trigger trg_escolas_gate_origem (re)criada em public.escolas.';
    ELSE
        RAISE NOTICE 'Tabela public.escolas nao existe — trigger nao criada.';
    END IF;
END $$;

-- ============================================================================
-- Verificacao final: a trigger deve existir (quando escolas existe).
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'escolas'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgrelid = 'public.escolas'::regclass
              AND tgname = 'trg_escolas_gate_origem'
              AND NOT tgisinternal
        ) THEN
            RAISE EXCEPTION 'Verificacao falhou: trigger trg_escolas_gate_origem ausente em public.escolas.';
        END IF;
        RAISE NOTICE 'Verificacao final OK: gate de origem (defesa em profundidade) ativo em escolas.';
    END IF;
END $$;

COMMIT;
