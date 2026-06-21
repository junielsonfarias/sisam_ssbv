-- ============================================================================
-- add-resumo-divergencias-importacoes.sql
-- Data: 2026-06-21
-- Ciclo/Fase: FlowSchoolAgent — Ciclo 2, fase CORRECAO (branch auto/fluxo-escolar)
-- Gap (Media): Gestor -> historico de migracoes/importacoes.
--
-- Problema:
--   O historico de importacoes ja persiste contadores em colunas dedicadas
--   (polos_criados, escolas_existentes, ...), mas NAO deixa uma trilha
--   consultavel por ENTIDADE AFETADA: divergencias (registros de cadastro
--   mestre ausentes / criados pelo ETL) ficavam apenas no campo de texto livre
--   `erros`, sem estrutura para listar e regularizar.
--
-- Objetivo:
--   Persistir, por importacao, um RESUMO estruturado (JSON) com os contadores
--   por entidade incluindo `divergentes` — base para a tela do Gestor listar e
--   disparar a regularizacao. A trilha por entidade afetada (turmas/alunos
--   criados pelo ETL) ja e consultavel via `origem_importacao_id`
--   (migration add-origem-dado-mestre.sql).
--
-- O que faz:
--   1. ADD COLUMN resumo JSONB NULL  (resumo por entidade da importacao)
--
-- Idempotencia:
--   - ADD COLUMN IF NOT EXISTS.
--
-- Nao-destrutivo: apenas ADD COLUMN. Nenhum DROP/DELETE/UPDATE em massa.
--
-- Rollback (manual, se necessario):
--   ALTER TABLE importacoes DROP COLUMN IF EXISTS resumo;
--
-- Aplicada via apply_migration SOMENTE no projeto educanet-demo
--   (project_id tbbnswuqsqhulserwtcc). NUNCA em producao.
-- ============================================================================

BEGIN;

ALTER TABLE importacoes
ADD COLUMN IF NOT EXISTS resumo JSONB;

COMMENT ON COLUMN importacoes.resumo IS
  'Resumo estruturado da importacao por entidade (criados/existentes/divergentes). '
  'Base do historico de migracoes consultavel pelo Gestor.';

COMMIT;
