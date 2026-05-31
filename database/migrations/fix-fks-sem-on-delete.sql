-- ============================================================================
-- fix-fks-sem-on-delete.sql
-- Data: 2026-05-31
-- Auditoria: BD-2 (auditoria completa 31/05 — agente "BD" reportou 35 FKs)
-- Validacao: information_schema.referential_constraints retornou 32 FKs com
--            delete_rule='NO ACTION' (padrao quando ON DELETE nao especificado).
--
-- Decisao de regras:
--  - CASCADE: junctions BNCC + estrutura curricular (filho nao faz sentido
--    sem pai, e BNCC eh referencia, nao dado de usuario).
--  - SET NULL: registrado_por (auditoria sobrevive ao delete do usuario) e
--    referencias historicas em historico_situacao / importacoes /
--    resultados_consolidados.nivel_aprendizagem_id.
--  - RESTRICT: configuracao critica (tipos_avaliacao, regras_avaliacao,
--    pdde_tipos_verba, ed_infantil_grupos_etarios, avaliacoes) — forca
--    cleanup explicito antes do delete.
--
-- Idempotencia: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT.
-- ============================================================================

BEGIN;

-- ============================================================================
-- CASCADE — junctions BNCC (sem habilidade pai, junction nao faz sentido)
-- ============================================================================

ALTER TABLE diario_classe_bncc_habilidades
  DROP CONSTRAINT IF EXISTS diario_classe_bncc_habilidades_habilidade_codigo_fkey,
  ADD  CONSTRAINT diario_classe_bncc_habilidades_habilidade_codigo_fkey
       FOREIGN KEY (habilidade_codigo) REFERENCES bncc_habilidades(codigo)
       ON DELETE CASCADE;

ALTER TABLE planos_aula_bncc_habilidades
  DROP CONSTRAINT IF EXISTS planos_aula_bncc_habilidades_habilidade_codigo_fkey,
  ADD  CONSTRAINT planos_aula_bncc_habilidades_habilidade_codigo_fkey
       FOREIGN KEY (habilidade_codigo) REFERENCES bncc_habilidades(codigo)
       ON DELETE CASCADE;

ALTER TABLE questoes_bncc_habilidades
  DROP CONSTRAINT IF EXISTS questoes_bncc_habilidades_habilidade_codigo_fkey,
  ADD  CONSTRAINT questoes_bncc_habilidades_habilidade_codigo_fkey
       FOREIGN KEY (habilidade_codigo) REFERENCES bncc_habilidades(codigo)
       ON DELETE CASCADE;

ALTER TABLE tarefas_turma_bncc_habilidades
  DROP CONSTRAINT IF EXISTS tarefas_turma_bncc_habilidades_habilidade_codigo_fkey,
  ADD  CONSTRAINT tarefas_turma_bncc_habilidades_habilidade_codigo_fkey
       FOREIGN KEY (habilidade_codigo) REFERENCES bncc_habilidades(codigo)
       ON DELETE CASCADE;

-- ============================================================================
-- CASCADE — estrutura curricular BNCC (filho depende do pai)
-- ============================================================================

ALTER TABLE bncc_areas_conhecimento
  DROP CONSTRAINT IF EXISTS bncc_areas_conhecimento_etapa_id_fkey,
  ADD  CONSTRAINT bncc_areas_conhecimento_etapa_id_fkey
       FOREIGN KEY (etapa_id) REFERENCES bncc_etapas(id)
       ON DELETE CASCADE;

ALTER TABLE bncc_componentes_curriculares
  DROP CONSTRAINT IF EXISTS bncc_componentes_curriculares_area_id_fkey,
  ADD  CONSTRAINT bncc_componentes_curriculares_area_id_fkey
       FOREIGN KEY (area_id) REFERENCES bncc_areas_conhecimento(id)
       ON DELETE CASCADE;

ALTER TABLE bncc_unidades_tematicas
  DROP CONSTRAINT IF EXISTS bncc_unidades_tematicas_componente_id_fkey,
  ADD  CONSTRAINT bncc_unidades_tematicas_componente_id_fkey
       FOREIGN KEY (componente_id) REFERENCES bncc_componentes_curriculares(id)
       ON DELETE CASCADE;

ALTER TABLE bncc_habilidades
  DROP CONSTRAINT IF EXISTS bncc_habilidades_componente_id_fkey,
  ADD  CONSTRAINT bncc_habilidades_componente_id_fkey
       FOREIGN KEY (componente_id) REFERENCES bncc_componentes_curriculares(id)
       ON DELETE CASCADE;

ALTER TABLE bncc_habilidades
  DROP CONSTRAINT IF EXISTS bncc_habilidades_etapa_id_fkey,
  ADD  CONSTRAINT bncc_habilidades_etapa_id_fkey
       FOREIGN KEY (etapa_id) REFERENCES bncc_etapas(id)
       ON DELETE CASCADE;

ALTER TABLE bncc_habilidades
  DROP CONSTRAINT IF EXISTS bncc_habilidades_unidade_tematica_id_fkey,
  ADD  CONSTRAINT bncc_habilidades_unidade_tematica_id_fkey
       FOREIGN KEY (unidade_tematica_id) REFERENCES bncc_unidades_tematicas(id)
       ON DELETE CASCADE;

-- ============================================================================
-- SET NULL — coluna registrado_por (auditoria sobrevive ao delete do usuario)
-- ============================================================================

ALTER TABLE conselho_classe
  DROP CONSTRAINT IF EXISTS conselho_classe_registrado_por_fkey,
  ADD  CONSTRAINT conselho_classe_registrado_por_fkey
       FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
       ON DELETE SET NULL;

ALTER TABLE embeddings_faciais
  DROP CONSTRAINT IF EXISTS embeddings_faciais_registrado_por_fkey,
  ADD  CONSTRAINT embeddings_faciais_registrado_por_fkey
       FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
       ON DELETE SET NULL;

ALTER TABLE frequencia_bimestral
  DROP CONSTRAINT IF EXISTS frequencia_bimestral_registrado_por_fkey,
  ADD  CONSTRAINT frequencia_bimestral_registrado_por_fkey
       FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
       ON DELETE SET NULL;

ALTER TABLE frequencia_diaria
  DROP CONSTRAINT IF EXISTS frequencia_diaria_registrado_por_fkey,
  ADD  CONSTRAINT frequencia_diaria_registrado_por_fkey
       FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
       ON DELETE SET NULL;

ALTER TABLE frequencia_hora_aula
  DROP CONSTRAINT IF EXISTS frequencia_hora_aula_registrado_por_fkey,
  ADD  CONSTRAINT frequencia_hora_aula_registrado_por_fkey
       FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
       ON DELETE SET NULL;

ALTER TABLE historico_situacao
  DROP CONSTRAINT IF EXISTS historico_situacao_registrado_por_fkey,
  ADD  CONSTRAINT historico_situacao_registrado_por_fkey
       FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
       ON DELETE SET NULL;

ALTER TABLE notas_escolares
  DROP CONSTRAINT IF EXISTS notas_escolares_registrado_por_fkey,
  ADD  CONSTRAINT notas_escolares_registrado_por_fkey
       FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
       ON DELETE SET NULL;

-- ============================================================================
-- SET NULL — referencias historicas que devem sobreviver ao delete da origem
-- ============================================================================

-- historico_situacao guarda transferencias entre escolas — se escola sai do
-- sistema, o registro do movimento ainda deve existir (apenas perde o link).
ALTER TABLE historico_situacao
  DROP CONSTRAINT IF EXISTS historico_situacao_escola_destino_id_fkey,
  ADD  CONSTRAINT historico_situacao_escola_destino_id_fkey
       FOREIGN KEY (escola_destino_id) REFERENCES escolas(id)
       ON DELETE SET NULL;

ALTER TABLE historico_situacao
  DROP CONSTRAINT IF EXISTS historico_situacao_escola_origem_id_fkey,
  ADD  CONSTRAINT historico_situacao_escola_origem_id_fkey
       FOREIGN KEY (escola_origem_id) REFERENCES escolas(id)
       ON DELETE SET NULL;

-- importacoes mantem log mesmo se avaliacao for removida (audit trail).
ALTER TABLE importacoes
  DROP CONSTRAINT IF EXISTS importacoes_avaliacao_id_fkey,
  ADD  CONSTRAINT importacoes_avaliacao_id_fkey
       FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id)
       ON DELETE SET NULL;

-- resultados_consolidados.nivel_aprendizagem_id — nivel pode ser
-- recalculado/recriado, resultado sobrevive como snapshot.
ALTER TABLE resultados_consolidados
  DROP CONSTRAINT IF EXISTS fk_resultados_consolidados_nivel,
  ADD  CONSTRAINT fk_resultados_consolidados_nivel
       FOREIGN KEY (nivel_aprendizagem_id) REFERENCES niveis_aprendizagem(id)
       ON DELETE SET NULL;

-- ============================================================================
-- RESTRICT — configuracao critica (forca cleanup explicito antes do delete)
-- ============================================================================

ALTER TABLE escola_regras_avaliacao
  DROP CONSTRAINT IF EXISTS escola_regras_avaliacao_regra_avaliacao_id_fkey,
  ADD  CONSTRAINT escola_regras_avaliacao_regra_avaliacao_id_fkey
       FOREIGN KEY (regra_avaliacao_id) REFERENCES regras_avaliacao(id)
       ON DELETE RESTRICT;

ALTER TABLE escola_regras_avaliacao
  DROP CONSTRAINT IF EXISTS escola_regras_avaliacao_tipo_avaliacao_id_fkey,
  ADD  CONSTRAINT escola_regras_avaliacao_tipo_avaliacao_id_fkey
       FOREIGN KEY (tipo_avaliacao_id) REFERENCES tipos_avaliacao(id)
       ON DELETE RESTRICT;

ALTER TABLE notas_escolares
  DROP CONSTRAINT IF EXISTS notas_escolares_tipo_avaliacao_id_fkey,
  ADD  CONSTRAINT notas_escolares_tipo_avaliacao_id_fkey
       FOREIGN KEY (tipo_avaliacao_id) REFERENCES tipos_avaliacao(id)
       ON DELETE RESTRICT;

ALTER TABLE regras_avaliacao
  DROP CONSTRAINT IF EXISTS regras_avaliacao_tipo_avaliacao_id_fkey,
  ADD  CONSTRAINT regras_avaliacao_tipo_avaliacao_id_fkey
       FOREIGN KEY (tipo_avaliacao_id) REFERENCES tipos_avaliacao(id)
       ON DELETE RESTRICT;

ALTER TABLE series_escolares
  DROP CONSTRAINT IF EXISTS series_escolares_regra_avaliacao_id_fkey,
  ADD  CONSTRAINT series_escolares_regra_avaliacao_id_fkey
       FOREIGN KEY (regra_avaliacao_id) REFERENCES regras_avaliacao(id)
       ON DELETE RESTRICT;

ALTER TABLE series_escolares
  DROP CONSTRAINT IF EXISTS series_escolares_tipo_avaliacao_id_fkey,
  ADD  CONSTRAINT series_escolares_tipo_avaliacao_id_fkey
       FOREIGN KEY (tipo_avaliacao_id) REFERENCES tipos_avaliacao(id)
       ON DELETE RESTRICT;

ALTER TABLE pdde_orcamentos
  DROP CONSTRAINT IF EXISTS pdde_orcamentos_tipo_verba_id_fkey,
  ADD  CONSTRAINT pdde_orcamentos_tipo_verba_id_fkey
       FOREIGN KEY (tipo_verba_id) REFERENCES pdde_tipos_verba(id)
       ON DELETE RESTRICT;

ALTER TABLE turmas
  DROP CONSTRAINT IF EXISTS turmas_grupo_etario_id_fkey,
  ADD  CONSTRAINT turmas_grupo_etario_id_fkey
       FOREIGN KEY (grupo_etario_id) REFERENCES ed_infantil_grupos_etarios(id)
       ON DELETE RESTRICT;

ALTER TABLE pnld_titulos
  DROP CONSTRAINT IF EXISTS pnld_titulos_componente_id_fkey,
  ADD  CONSTRAINT pnld_titulos_componente_id_fkey
       FOREIGN KEY (componente_id) REFERENCES bncc_componentes_curriculares(id)
       ON DELETE RESTRICT;

-- resultados_consolidados/resultados_provas avaliacao_id: RESTRICT obriga
-- arquivar resultados antes de deletar avaliacao. Reduz risco de perda
-- acidental de dados historicos.
ALTER TABLE resultados_consolidados
  DROP CONSTRAINT IF EXISTS resultados_consolidados_avaliacao_id_fkey,
  ADD  CONSTRAINT resultados_consolidados_avaliacao_id_fkey
       FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id)
       ON DELETE RESTRICT;

ALTER TABLE resultados_provas
  DROP CONSTRAINT IF EXISTS resultados_provas_avaliacao_id_fkey,
  ADD  CONSTRAINT resultados_provas_avaliacao_id_fkey
       FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id)
       ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- Verificacao pos-migration (deve retornar 0):
-- SELECT COUNT(*) FROM information_schema.referential_constraints rc
--  WHERE rc.constraint_schema = 'public' AND rc.delete_rule = 'NO ACTION';
-- ============================================================================
