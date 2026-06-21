-- ============================================================================
-- fix-indices-fks-faltantes.sql
-- Data: 2026-06-21
-- Branch: auto/melhorias-recuperacao
-- Banco-alvo: educanet-demo (tbbnswuqsqhulserwtcc). Producao desvinculada.
--
-- Objetivo (MELHORIA B / Parte 2 — higiene de banco):
--   Adicionar indice de suporte para FOREIGN KEYS que nao possuem indice na
--   coluna referenciadora. FK sem indice no lado "filho" faz o Postgres varrer
--   a tabela inteira (seq scan) a cada DELETE/UPDATE da chave na tabela "pai"
--   (verificacao de RESTRICT/CASCADE/SET NULL) e degrada JOINs por essa coluna.
--
--   Lista derivada do proprio catalogo do demo (pg_constraint x pg_index):
--   80 FKs de coluna unica cujo primeiro atributo nao prefixa indice algum.
--
-- Seguranca:
--   - 100% ADITIVO: apenas CREATE INDEX IF NOT EXISTS. Nao remove nada, nao
--     altera dados, nao toca indices que dao suporte a ON CONFLICT/UNIQUE.
--   - Idempotente: IF NOT EXISTS (no-op em re-execucao).
--   - Nomes deterministicos: idx_<tabela>_<coluna> (<= 63 chars).
--
-- ROLLBACK (se necessario): DROP INDEX IF EXISTS public.<nome>; para cada um.
-- ============================================================================

BEGIN;

-- AEE
CREATE INDEX IF NOT EXISTS idx_aee_atendimentos_professor_id ON public.aee_atendimentos (professor_id);
CREATE INDEX IF NOT EXISTS idx_aee_planos_individuais_professor_aee_id ON public.aee_planos_individuais (professor_aee_id);
CREATE INDEX IF NOT EXISTS idx_aee_salas_recursos_professor_responsavel_id ON public.aee_salas_recursos (professor_responsavel_id);

-- Avaliacoes descritivas
CREATE INDEX IF NOT EXISTS idx_avaliacoes_descritivas_disciplina_id ON public.avaliacoes_descritivas (disciplina_id);

-- Biblioteca
CREATE INDEX IF NOT EXISTS idx_biblioteca_emprestimos_registrado_por ON public.biblioteca_emprestimos (registrado_por);
CREATE INDEX IF NOT EXISTS idx_biblioteca_reservas_aluno_id ON public.biblioteca_reservas (aluno_id);
CREATE INDEX IF NOT EXISTS idx_biblioteca_reservas_servidor_id ON public.biblioteca_reservas (servidor_id);

-- BNCC
CREATE INDEX IF NOT EXISTS idx_bncc_areas_conhecimento_etapa_id ON public.bncc_areas_conhecimento (etapa_id);
CREATE INDEX IF NOT EXISTS idx_bncc_componentes_curriculares_area_id ON public.bncc_componentes_curriculares (area_id);
CREATE INDEX IF NOT EXISTS idx_bncc_habilidades_unidade_tematica_id ON public.bncc_habilidades (unidade_tematica_id);
CREATE INDEX IF NOT EXISTS idx_bncc_unidades_tematicas_componente_id ON public.bncc_unidades_tematicas (componente_id);

-- Bolsa Familia
CREATE INDEX IF NOT EXISTS idx_bolsa_familia_mapas_registrado_por ON public.bolsa_familia_mapas (registrado_por);

-- Configuracoes / Conselho
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_atualizado_por ON public.configuracoes_sistema (atualizado_por);
CREATE INDEX IF NOT EXISTS idx_conselho_classe_registrado_por ON public.conselho_classe (registrado_por);

-- Diario de classe
CREATE INDEX IF NOT EXISTS idx_diario_classe_disciplina_id ON public.diario_classe (disciplina_id);

-- Documentos emitidos
CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_cancelado_por ON public.documentos_emitidos (cancelado_por);
CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_emitido_por ON public.documentos_emitidos (emitido_por);
CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_escola_id ON public.documentos_emitidos (escola_id);
CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_substituido_por_id ON public.documentos_emitidos (substituido_por_id);

-- Educacao infantil / EJA
CREATE INDEX IF NOT EXISTS idx_ed_infantil_relatorios_professor_id ON public.ed_infantil_relatorios (professor_id);
CREATE INDEX IF NOT EXISTS idx_eja_certificacoes_emitida_por ON public.eja_certificacoes (emitida_por);

-- Faciais
CREATE INDEX IF NOT EXISTS idx_embeddings_faciais_registrado_por ON public.embeddings_faciais (registrado_por);

-- Regras de avaliacao por escola
CREATE INDEX IF NOT EXISTS idx_escola_regras_avaliacao_regra_avaliacao_id ON public.escola_regras_avaliacao (regra_avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_escola_regras_avaliacao_tipo_avaliacao_id ON public.escola_regras_avaliacao (tipo_avaliacao_id);

-- Eventos
CREATE INDEX IF NOT EXISTS idx_eventos_criado_por ON public.eventos (criado_por);

-- FICAI
CREATE INDEX IF NOT EXISTS idx_ficai_acoes_realizado_por ON public.ficai_acoes (realizado_por);
CREATE INDEX IF NOT EXISTS idx_ficai_casos_responsavel_caso_id ON public.ficai_casos (responsavel_caso_id);
CREATE INDEX IF NOT EXISTS idx_ficai_encaminhamentos_ct_responsavel_envio_id ON public.ficai_encaminhamentos_ct (responsavel_envio_id);

-- Folha de pagamento
CREATE INDEX IF NOT EXISTS idx_folha_pagamento_fechado_por ON public.folha_pagamento (fechado_por);

-- Frequencia
CREATE INDEX IF NOT EXISTS idx_frequencia_bimestral_registrado_por ON public.frequencia_bimestral (registrado_por);
CREATE INDEX IF NOT EXISTS idx_frequencia_diaria_registrado_por ON public.frequencia_diaria (registrado_por);
CREATE INDEX IF NOT EXISTS idx_frequencia_hora_aula_escola_id ON public.frequencia_hora_aula (escola_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_hora_aula_registrado_por ON public.frequencia_hora_aula (registrado_por);

-- Historico / Horarios
CREATE INDEX IF NOT EXISTS idx_historico_situacao_registrado_por ON public.historico_situacao (registrado_por);
CREATE INDEX IF NOT EXISTS idx_horarios_aula_disciplina_id ON public.horarios_aula (disciplina_id);

-- Importacao
CREATE INDEX IF NOT EXISTS idx_importacao_divergencias_resolvido_por ON public.importacao_divergencias (resolvido_por);
CREATE INDEX IF NOT EXISTS idx_importacoes_avaliacao_id ON public.importacoes (avaliacao_id);

-- LGPD / Logs
CREATE INDEX IF NOT EXISTS idx_lgpd_solicitacoes_processado_por ON public.lgpd_solicitacoes (processado_por);
CREATE INDEX IF NOT EXISTS idx_logs_backup_executado_por ON public.logs_backup (executado_por);

-- Auditoria de notas
CREATE INDEX IF NOT EXISTS idx_notas_escolares_auditoria_alterado_por ON public.notas_escolares_auditoria (alterado_por);

-- Notificacoes
CREATE INDEX IF NOT EXISTS idx_notificacoes_aluno_id ON public.notificacoes (aluno_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida_por ON public.notificacoes (lida_por);
CREATE INDEX IF NOT EXISTS idx_notificacoes_polo_id ON public.notificacoes (polo_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_turma_id ON public.notificacoes (turma_id);

-- Ordens de servico
CREATE INDEX IF NOT EXISTS idx_ordens_servico_aberta_por ON public.ordens_servico (aberta_por);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_comentarios_autor_id ON public.ordens_servico_comentarios (autor_id);

-- Ouvidoria
CREATE INDEX IF NOT EXISTS idx_ouvidoria_escola_id ON public.ouvidoria (escola_id);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_respondido_por ON public.ouvidoria (respondido_por);

-- Patrimonio
CREATE INDEX IF NOT EXISTS idx_patrimonio_movimentacoes_escola_destino_id ON public.patrimonio_movimentacoes (escola_destino_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_movimentacoes_escola_origem_id ON public.patrimonio_movimentacoes (escola_origem_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_movimentacoes_registrado_por ON public.patrimonio_movimentacoes (registrado_por);

-- PDDE
CREATE INDEX IF NOT EXISTS idx_pdde_despesas_criado_por ON public.pdde_despesas (criado_por);
CREATE INDEX IF NOT EXISTS idx_pdde_orcamentos_criado_por ON public.pdde_orcamentos (criado_por);

-- Planos de aula
CREATE INDEX IF NOT EXISTS idx_planos_aula_disciplina_id ON public.planos_aula (disciplina_id);

-- PNAE
CREATE INDEX IF NOT EXISTS idx_pnae_atendimentos_diarios_registrado_por ON public.pnae_atendimentos_diarios (registrado_por);
CREATE INDEX IF NOT EXISTS idx_pnae_cardapios_nutricionista_id ON public.pnae_cardapios (nutricionista_id);
CREATE INDEX IF NOT EXISTS idx_pnae_restricoes_alunos_registrada_por ON public.pnae_restricoes_alunos (registrada_por);

-- PNATE
CREATE INDEX IF NOT EXISTS idx_pnate_alunos_rotas_parada_id ON public.pnate_alunos_rotas (parada_id);
CREATE INDEX IF NOT EXISTS idx_pnate_rotas_motorista_id ON public.pnate_rotas (motorista_id);
CREATE INDEX IF NOT EXISTS idx_pnate_rotas_veiculo_id ON public.pnate_rotas (veiculo_id);

-- PNLD
CREATE INDEX IF NOT EXISTS idx_pnld_distribuicao_aluno_entregue_por ON public.pnld_distribuicao_aluno (entregue_por);
CREATE INDEX IF NOT EXISTS idx_pnld_distribuicao_aluno_recebido_por ON public.pnld_distribuicao_aluno (recebido_por);
CREATE INDEX IF NOT EXISTS idx_pnld_estoque_escola_titulo_id ON public.pnld_estoque_escola (titulo_id);

-- Ponto / Pre-matriculas
CREATE INDEX IF NOT EXISTS idx_ponto_registros_validado_por ON public.ponto_registros (validado_por);
CREATE INDEX IF NOT EXISTS idx_pre_matriculas_analisado_por ON public.pre_matriculas (analisado_por);

-- Presenca facial
CREATE INDEX IF NOT EXISTS idx_presenca_facial_eventos_dispositivo_id ON public.presenca_facial_eventos (dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_presenca_facial_eventos_registrado_por ON public.presenca_facial_eventos (registrado_por);

-- Publicacoes / QR
CREATE INDEX IF NOT EXISTS idx_publicacoes_publicado_por ON public.publicacoes (publicado_por);
CREATE INDEX IF NOT EXISTS idx_qr_presenca_gerado_por ON public.qr_presenca (gerado_por);

-- Tokens / Responsaveis
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_parent_jti ON public.refresh_tokens (parent_jti);
CREATE INDEX IF NOT EXISTS idx_responsaveis_alunos_aprovado_por ON public.responsaveis_alunos (aprovado_por);

-- Resultados de producao
CREATE INDEX IF NOT EXISTS idx_resultados_producao_item_producao_id ON public.resultados_producao (item_producao_id);

-- Saude
CREATE INDEX IF NOT EXISTS idx_saude_atendimentos_registrado_por ON public.saude_atendimentos (registrado_por);
CREATE INDEX IF NOT EXISTS idx_saude_restricoes_alimentares_registrado_por ON public.saude_restricoes_alimentares (registrado_por);
CREATE INDEX IF NOT EXISTS idx_saude_vacinas_registrado_por ON public.saude_vacinas (registrado_por);

-- Servidor
CREATE INDEX IF NOT EXISTS idx_servidor_formacoes_registrado_por ON public.servidor_formacoes (registrado_por);

-- Site / Status
CREATE INDEX IF NOT EXISTS idx_site_config_atualizado_por ON public.site_config (atualizado_por);
CREATE INDEX IF NOT EXISTS idx_status_atualizacoes_criado_por ON public.status_atualizacoes (criado_por);
CREATE INDEX IF NOT EXISTS idx_status_incidentes_criado_por ON public.status_incidentes (criado_por);

-- Verificacao final: nenhuma FK de coluna unica deve restar sem indice de suporte.
DO $$
DECLARE
  v_restantes integer;
BEGIN
  SELECT count(*) INTO v_restantes
  FROM pg_constraint c
  WHERE c.contype = 'f'
    AND c.connamespace = 'public'::regnamespace
    AND array_length(c.conkey, 1) = 1
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]
    );

  IF v_restantes <> 0 THEN
    RAISE EXCEPTION 'fix-indices-fks-faltantes: ainda restam % FK(s) de coluna unica sem indice.', v_restantes;
  END IF;

  RAISE NOTICE 'fix-indices-fks-faltantes: OK — todas as FKs de coluna unica possuem indice de suporte.';
END $$;

COMMIT;
