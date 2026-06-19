-- ============================================================================
-- DIAGNÓSTICO A1 — fila_espera (somente leitura, NÃO altera nada)
-- Data: 2026-06-19
-- Objetivo: confirmar a forma REAL da tabela fila_espera no banco antes de
--   decidir a migration de reconciliação (separar fila pública vs canônica).
-- Seguro: só SELECT / information_schema / pg_constraint. Nenhum DDL/DML.
-- ============================================================================

\echo '== 1. Estrutura real da tabela fila_espera =='
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fila_espera'
ORDER BY ordinal_position;

\echo '== 2. CHECK constraints (existe CHECK de status?) =='
SELECT con.conname, pg_get_constraintdef(con.oid) AS definicao
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'fila_espera' AND con.contype = 'c';

\echo '== 2b. Demais constraints (UNIQUE / FK / NOT NULL via PK) =='
SELECT con.contype, con.conname, pg_get_constraintdef(con.oid) AS definicao
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'fila_espera'
ORDER BY con.contype;

\echo '== 3. Volume por cenario (decide a migracao de dados) =='
SELECT
  COUNT(*)                                                AS total,
  COUNT(*) FILTER (WHERE aluno_id IS NULL)                AS publicas_sem_aluno,
  COUNT(*) FILTER (WHERE aluno_id IS NOT NULL)            AS internas_com_aluno,
  COUNT(*) FILTER (WHERE status IN ('aprovado','rejeitado'))     AS status_publico,
  COUNT(*) FILTER (WHERE status IN ('convocado','desistente'))   AS status_interno,
  COUNT(*) FILTER (WHERE status NOT IN ('aguardando','convocado','matriculado','desistente','aprovado','rejeitado')) AS status_inesperado
FROM fila_espera;

\echo '== 4. Distribuicao de status (visao geral) =='
SELECT status, COUNT(*) AS qtd,
       COUNT(*) FILTER (WHERE aluno_id IS NULL) AS sem_aluno_id
FROM fila_espera
GROUP BY status
ORDER BY qtd DESC;
