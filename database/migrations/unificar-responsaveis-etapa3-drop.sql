-- ============================================================================
-- unificar-responsaveis-etapa3-drop.sql
-- Data: 2026-06-19
-- Auditoria: 3.2 — ETAPA 3 (DROP). Remove as tabelas legadas do modelo duplo,
--            agora que o código foi repontado (Lote 3.2) e os dados migrados
--            (etapa 2) para `responsaveis_alunos`.
--
-- PRÉ-REQUISITOS (verificados na demo antes de aplicar):
--   - Nenhuma FK de outras tabelas aponta para `responsaveis`/`aluno_responsaveis`.
--   - Nenhum código de produção referencia mais essas tabelas (service repontado).
--   - Dados legados migrados pela etapa 2 (na demo as tabelas estavam vazias).
--
-- Ordem: filho (`aluno_responsaveis`, FK → responsaveis) antes do pai.
-- IDEMPOTENTE: DROP ... IF EXISTS.
--
-- ⚠️ IRREVERSÍVEL. Em produção, rodar SOMENTE após confirmar etapa 2 e ter backup.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS aluno_responsaveis;
DROP TABLE IF EXISTS responsaveis;

COMMIT;
