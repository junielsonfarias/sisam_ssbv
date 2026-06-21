-- ============================================================================
-- divergencias-historico-acao-realizada-text.sql
-- Data: 2026-06-21
-- FIX 1 (ADR) — Persistência de divergências no gate estrito do ETL
--
-- Problema:
--   divergencias_historico.acao_realizada era varchar(100). No gate estrito,
--   registrarMestreAusente (lib/services/importacao/governanca.ts) grava nessa
--   coluna uma frase de ~103 chars, ex.:
--     'aluno "<nome>" recusada pelo ETL (gate estrito): ausente no cadastro
--      mestre do Gestor'
--   O INSERT falha com "value too long for type character varying(100)" e o erro
--   era ENGOLIDO pelo try/catch de registrarHistorico (lib/divergencias/
--   corretores.ts), resultando em divergências de aluno/turma que NÃO persistem.
--   registrarMestreCriado tem o mesmo bug latente para nomes longos.
--
-- Correção (não-destrutiva / aditiva):
--   Amplia acao_realizada de varchar(100) para TEXT. Não há DROP de coluna nem
--   NOVA constraint NOT NULL. Idempotente: só altera quando o tipo ainda não é
--   text. PostgreSQL converte varchar(100) -> text sem perda de dados.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'divergencias_historico'
      AND column_name = 'acao_realizada'
      AND data_type = 'character varying'
  ) THEN
    ALTER TABLE divergencias_historico
      ALTER COLUMN acao_realizada TYPE text;
  END IF;
END $$;
