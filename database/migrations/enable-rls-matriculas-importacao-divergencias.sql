-- ============================================================================
-- enable-rls-matriculas-importacao-divergencias.sql
-- Data: 2026-06-21
-- Auditoria: BD-6 — RLS em todas as tabelas (tabelas novas do ADR ainda sem RLS).
--
-- Objetivo: habilitar Row Level Security nas duas tabelas novas criadas pelo
-- ADR (`matriculas` e `importacao_divergencias`), fechando o desvio do padrao
-- do projeto (toda tabela nova tem RLS).
--
-- Padrao BD-6 (igual a `fila_espera_publica`, `importacoes` e demais legadas):
-- apenas `ENABLE ROW LEVEL SECURITY`, SEM criar policy. O app SISAM acessa o
-- banco via service_role pelo pg pool (database/connection.ts), que BYPASSA RLS
-- por design do PostgreSQL — habilitar RLS sem policy NAO quebra o app, apenas
-- fecha o acesso via anon/authenticated (PostgREST), que nao e usado.
--
-- Defesa em profundidade: se uma credencial anon/authenticated vazar, o
-- atacante via PostgREST nao consegue ler/escrever nestas tabelas.
--
-- Idempotente: re-executar nao gera erro (ENABLE em tabela ja com RLS e no-op);
-- o bloco DO so atua se a tabela existir.
--
-- Rollback:
--   ALTER TABLE public.matriculas               DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.importacao_divergencias  DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'matriculas'
  ) THEN
    EXECUTE 'ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'importacao_divergencias'
  ) THEN
    EXECUTE 'ALTER TABLE public.importacao_divergencias ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

COMMIT;
