-- ============================================================================
-- fix-search-path-funcoes.sql
-- Data: 2026-05-31
-- Auditoria: BD-5 — funcoes do projeto sem SET search_path (advisor INFO).
--
-- search_path mutable permite que uma sessao mude o resolve de schemas e
-- afete a funcao. Fixar em 'public' garante resolucao consistente.
--
-- Apenas funcoes DO PROJETO sao alteradas — funcoes de extensoes pg_trgm
-- e unaccent (gin_*, gtrgm_*, similarity_*, unaccent_*, etc.) sao
-- gerenciadas pelos respectivos pacotes e NAO devem ser tocadas.
-- ============================================================================

BEGIN;

ALTER FUNCTION public.atualizar_timestamp_anos_letivos()                          SET search_path = public;
ALTER FUNCTION public.atualizar_timestamp_fila_espera()                           SET search_path = public;
ALTER FUNCTION public.atualizar_timestamp_notificacoes()                          SET search_path = public;
ALTER FUNCTION public.calcular_media_aluno()                                      SET search_path = public;
ALTER FUNCTION public.calcular_nivel_aprendizagem(numeric, varchar)               SET search_path = public;
ALTER FUNCTION public.contar_dias_letivos(uuid, uuid, date, date)                 SET search_path = public;
ALTER FUNCTION public.fn_sync_serie_numero()                                      SET search_path = public;
ALTER FUNCTION public.fn_upsert_aluno_2026_v2(text, uuid, uuid, text, date, text) SET search_path = public;
ALTER FUNCTION public.limpar_historico_divergencias()                             SET search_path = public;
ALTER FUNCTION public.normalizar_nome_escola(varchar)                             SET search_path = public;
ALTER FUNCTION public.obter_config_serie(varchar)                                 SET search_path = public;
ALTER FUNCTION public.trigger_update_escola_regras_avaliacao_timestamp()          SET search_path = public;
ALTER FUNCTION public.update_professor_turmas_timestamp()                         SET search_path = public;
ALTER FUNCTION public.update_updated_at_column()                                  SET search_path = public;
-- gerar_numero_os ja foi alterada em fix-gerar-numero-os-race.sql

COMMIT;
