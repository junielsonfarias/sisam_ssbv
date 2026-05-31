-- ============================================================================
-- enable-rls-tabelas-legadas.sql
-- Data: 2026-05-31
-- Auditoria: BD-6 — RLS em todas as tabelas legadas.
--
-- App SISAM usa service_role via pg pool (lib/database/connection.ts) que
-- BYPASSA RLS por design do PostgreSQL. Habilitar RLS sem policies NAO
-- quebra o app — apenas fecha o acesso via anon/authenticated (que nao eh
-- usado, validado via grep em app/ e lib/).
--
-- Defesa em profundidade: se algum endpoint vazar credencial de pool, o
-- atacante via PostgREST/anon nao consegue ler nada.
--
-- Resultado pos-migration: 100% de cobertura RLS (114/114 tabelas em public).
-- ============================================================================

-- Fase 1: tabelas operacionais (alunos, frequencia, notas, etc.)
ALTER TABLE public.alunos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anos_letivos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conselho_classe           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_classe             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas_escolares     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositivos_faciais      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings_faciais        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencia_bimestral      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencia_diaria         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencia_hora_aula      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_situacao        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_aula             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_escolares           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_letivos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_aula               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_turmas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultados_consolidados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultados_provas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_turma             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas                    ENABLE ROW LEVEL SECURITY;

-- Fase 2: avaliacoes, configuracoes, logs, ouvidoria, etc.
ALTER TABLE public.avaliacoes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questoes                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalizacao                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_producao                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_notas_escola       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_tecnico                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niveis_aprendizagem             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_series_disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acesso                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divergencias_historico          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conselho_classe_alunos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos_faciais          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_dispositivos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_escola                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_disciplinas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracao_series             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_avaliacao                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_avaliacao                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_regras_avaliacao         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_escolares                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sisam_series_participantes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacoes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_escola                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_turma               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_espera                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ouvidoria                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_matriculas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema           ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.usuarios IS 'RLS habilitada — autorizacao primaria via withAuth (service_role bypassa).';
