-- ============================================================================
-- corrigir-view-add-serie-numero.sql
-- Data: 2026-06-17
--
-- PROBLEMA (regressao):
--   ~50 queries do modulo SISAM (dashboard, graficos, comparativos, resultados)
--   usam `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, ...))` sobre
--   a VIEW `resultados_consolidados_unificada` (alias rc). Mas a VIEW NAO expoe
--   a coluna `serie_numero` — alguma recriacao anterior da VIEW a omitiu, ainda
--   que a TABELA base `resultados_consolidados` a possua. Como o COALESCE nao
--   protege contra coluna inexistente (Postgres valida no parse), TODAS essas
--   queries falham com "column rc.serie_numero does not exist". O erro fica
--   mascarado por executarQuerySegura (retorna fallback), entao o painel carrega
--   com varias secoes vazias (media geral, aprovacao, por tipo de ensino).
--
--   O mesmo se aplica a `rp.serie_numero` em graficos: a tabela
--   `resultados_provas` tambem nao tem a coluna.
--
-- CORRECAO (na raiz, 1 lugar conserta as ~50 queries, mantem o indice):
--   1. Expor `serie_numero` na VIEW (reproduz a definicao ATUAL exata +
--      a coluna no final — CREATE OR REPLACE so permite adicionar no final).
--   2. Adicionar `serie_numero` em `resultados_provas` (idempotente).
--
--   serie_numero pode estar NULL em linhas nao populadas — o COALESCE no codigo
--   ja cai no REGEXP_REPLACE(serie) nesse caso. Expor a coluna faz a referencia
--   parar de falhar e usa o indice quando a coluna esta preenchida.
--
-- COMO APLICAR: Supabase Dashboard -> SQL Editor (ou apply_migration).
-- VALIDAR DEPOIS: abrir /admin/sisam/dashboard -> media geral / aprovacao /
--   por tipo de ensino devem preencher; o log do dev nao deve mais mostrar
--   "column rc.serie_numero does not exist".
-- ============================================================================

BEGIN;

-- 1) Tabela resultados_provas ganha serie_numero (idempotente).
ALTER TABLE resultados_provas ADD COLUMN IF NOT EXISTS serie_numero VARCHAR(10);

-- 2) Recriar a VIEW reproduzindo a definicao ATUAL + rc.serie_numero no final.
--    (definicao obtida via pg_get_viewdef em 17/06/2026)
CREATE OR REPLACE VIEW resultados_consolidados_unificada AS
SELECT rc.aluno_id,
    rc.escola_id,
    rc.turma_id,
    rc.ano_letivo,
    rc.serie,
    rc.avaliacao_id,
    av.nome AS avaliacao_nome,
    av.tipo AS avaliacao_tipo,
    av.ordem AS avaliacao_ordem,
    rc.presenca::text AS presenca,
    rc.total_acertos_lp,
    rc.total_acertos_ch,
    rc.total_acertos_mat,
    rc.total_acertos_cn,
    rc.nota_lp,
    rc.nota_ch,
    rc.nota_mat,
    rc.nota_cn,
    rc.nota_producao,
        CASE
            WHEN regexp_replace(rc.serie::text, '[^0-9]'::text, ''::text, 'g'::text) = ANY (ARRAY['2'::text, '3'::text, '5'::text]) THEN round((COALESCE(rc.nota_lp::numeric, 0::numeric) + COALESCE(rc.nota_mat::numeric, 0::numeric) + COALESCE(rc.nota_producao::numeric, 0::numeric)) / 3.0, 2)
            ELSE round((COALESCE(rc.nota_lp::numeric, 0::numeric) + COALESCE(rc.nota_ch::numeric, 0::numeric) + COALESCE(rc.nota_mat::numeric, 0::numeric) + COALESCE(rc.nota_cn::numeric, 0::numeric)) / 4.0, 2)
        END AS media_aluno,
    rc.criado_em,
    rc.atualizado_em,
    rc.serie_numero
   FROM resultados_consolidados rc
     JOIN avaliacoes av ON rc.avaliacao_id = av.id;

COMMIT;
