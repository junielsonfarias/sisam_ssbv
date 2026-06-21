-- =============================================================================
-- Migration: harden-search-path-fn-escolas-gate-origem
-- Objetivo : Versionar a função de gate de origem da tabela `escolas` que já
--            estava aplicada no banco demo (educanet-demo) mas sem arquivo no
--            repositório (divergência repo<->banco apontada na validação do
--            FlowSchoolAgent, ciclo 6).
--            A função:
--              - exige `escolas.origem` preenchida (gestor|sisam_etl|seed);
--              - bloqueia criação de escola pelo ETL Sisam (origem=sisam_etl),
--                garantindo o Gestor Escolar como fonte única do mestre;
--              - usa `SET search_path = ''` (hardening contra hijack de search_path).
-- Rollback : DROP FUNCTION IF EXISTS public.fn_escolas_gate_origem() CASCADE;
--            (removeria também as triggers que a referenciam — reavaliar antes)
-- Idempotente: sim (CREATE OR REPLACE FUNCTION).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_escolas_gate_origem()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    IF NEW.origem IS NULL OR btrim(NEW.origem) = '' THEN
        RAISE EXCEPTION
            'escolas.origem e obrigatoria (gestor|sisam_etl|seed). Cadastro mestre exige rastreio de origem.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.origem NOT IN ('gestor', 'sisam_etl', 'seed') THEN
        RAISE EXCEPTION
            'escolas.origem invalida: %. Valores aceitos: gestor, sisam_etl, seed.', NEW.origem
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.origem = 'sisam_etl' THEN
        RAISE EXCEPTION
            'Gate de habilitacao: o ETL Sisam (origem=sisam_etl) nao pode criar/definir escola. Escola e responsabilidade do modulo Gestor.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$function$;
