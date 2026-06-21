-- ============================================================================
-- adr-003-boletim-secao-sisam.sql
-- Data: 2026-06-21
-- ADR: docs/adr/ADR-003-bidirecionalidade-sisam-boletim.md (alternativa A2)
--
-- OBJETIVO
--   Formalizar, de forma ADITIVA, a "Avaliacao Municipal (SISAM)" como SECAO
--   COMPLEMENTAR do boletim — vinculada por `avaliacao_id` — SEM interferir na
--   nota escolar regular (`notas_escolares`).
--
--   O ADR-003 decidiu (A2) NAO adicionar `avaliacao_id` em `notas_escolares` e
--   NAO fazer write-back. O vinculo entre boletim e resultado da avaliacao
--   municipal e feito pela coluna `avaliacao_id` que JA EXISTE (NOT NULL) em
--   `resultados_consolidados`. Esta migracao apenas cria uma VIEW que formaliza
--   esse JOIN (resultados_consolidados x avaliacoes via avaliacao_id), para que
--   a leitura do boletim consuma uma estrutura estavel e nomeada, distinta da
--   nota escolar.
--
--   Nada em `notas_escolares` e tocado. Nenhuma coluna/tabela e dropada. A view
--   e read-only por natureza.
--
-- IDEMPOTENCIA
--   - `CREATE OR REPLACE VIEW`: reaplicar e no-op (substitui a definicao).
--   - Guardas `IF EXISTS` nas dependencias (avaliacoes/resultados_consolidados)
--     evitam falha caso a migracao base ainda nao tenha rodado.
--   - GRANT/COMMENT sao idempotentes.
--
-- ROLLBACK
--   DROP VIEW IF EXISTS public.vw_boletim_resultados_sisam;
--   (Reversao segura: a view nao guarda dado proprio; e apenas uma projecao de
--    leitura sobre resultados_consolidados + avaliacoes.)
-- ============================================================================

BEGIN;

DO $$
BEGIN
  -- So cria a view se as tabelas-base existirem (defensivo/idempotente).
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_consolidados')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avaliacoes') THEN

    EXECUTE $view$
      CREATE OR REPLACE VIEW public.vw_boletim_resultados_sisam AS
      SELECT
        rc.aluno_id,
        rc.ano_letivo,
        rc.avaliacao_id,
        av.nome  AS avaliacao_nome,
        av.tipo  AS avaliacao_tipo,
        av.ordem AS avaliacao_ordem,
        rc.presenca,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        rc.nota_producao,
        rc.media_aluno,
        rc.nivel_aprendizagem,
        rc.total_acertos_lp,
        rc.total_acertos_mat,
        rc.total_acertos_ch,
        rc.total_acertos_cn
      FROM resultados_consolidados rc
      INNER JOIN avaliacoes av ON av.id = rc.avaliacao_id
      WHERE (
        rc.nota_lp IS NOT NULL OR rc.nota_mat IS NOT NULL OR
        rc.nota_ch IS NOT NULL OR rc.nota_cn IS NOT NULL OR
        rc.nota_producao IS NOT NULL OR
        COALESCE(rc.total_acertos_lp, 0) > 0 OR COALESCE(rc.total_acertos_mat, 0) > 0
      )
    $view$;

    -- SECURITY INVOKER (padrao do projeto, BD-6): a view roda com privilegios
    -- do executor, respeitando a RLS de resultados_consolidados/avaliacoes.
    EXECUTE 'ALTER VIEW public.vw_boletim_resultados_sisam SET (security_invoker = on)';

  END IF;
END $$;

-- Documentacao da view (idempotente).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'vw_boletim_resultados_sisam') THEN
    EXECUTE $c$
      COMMENT ON VIEW public.vw_boletim_resultados_sisam IS
      'ADR-003: secao complementar "Avaliacao Municipal (SISAM)" do boletim, vinculada por avaliacao_id. Read-only; NAO compoe nota_escolar (notas_escolares nao e tocada).'
    $c$;
  END IF;
END $$;

COMMIT;
