-- ============================================================================
-- fix-views-security-invoker.sql
-- Data: 2026-05-31
-- Auditoria: BD-6 extra — 4 views com SECURITY DEFINER.
--
-- SECURITY DEFINER em view permite que usuario com menos privilegios veja
-- dados via privilegios do criador (postgres) — contorna RLS das tabelas
-- subjacentes. SECURITY INVOKER (padrao recomendado a partir de PG 15) faz
-- a view rodar com privilegios do executor da query.
-- ============================================================================

ALTER VIEW public.pdde_saldos                       SET (security_invoker = on);
ALTER VIEW public.resultados_consolidados_unificada SET (security_invoker = on);
ALTER VIEW public.vw_estatisticas_serie             SET (security_invoker = on);
ALTER VIEW public.vw_resultados_por_serie           SET (security_invoker = on);
