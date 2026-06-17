-- ============================================================================
-- add-progressao-parcial-situacao.sql
-- Data: 2026-06-17
--
-- Progressão parcial / dependência (Plano Fase 2.2).
--
-- Adiciona o valor 'progressao_parcial' ao CHECK de situação em `alunos` e
-- `historico_situacao`. Significa "aprovado com dependência": o aluno AVANÇA
-- de ano carregando 1+ disciplina(s) abaixo da média, dentro do limite
-- `series_escolares.max_dependencias` (LDB art. 24, e/ regimento da rede).
--
-- A decisão de progressão parcial é PROPOSTA pelo cálculo do fechamento e
-- aplicada pelo gestor/Conselho de Classe (parecer 'progressao_parcial').
--
-- As constraints originais são CHECK de coluna anônimas (criadas em
-- add-situacao-aluno.sql), nomeadas pelo Postgres como
-- <tabela>_situacao_check. Para ser robusto, localizamos e dropamos por
-- catálogo qualquer CHECK que referencie 'situacao IN' na coluna, e recriamos
-- com a lista expandida. Idempotente. Aplicar no Supabase (fora do acesso MCP).
-- ============================================================================

BEGIN;

-- alunos.situacao -----------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'alunos'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%situacao%'
       AND pg_get_constraintdef(con.oid) NOT ILIKE '%situacao_funcionamento%'
  LOOP
    EXECUTE format('ALTER TABLE alunos DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE alunos ADD CONSTRAINT alunos_situacao_check
  CHECK (situacao IN ('cursando', 'transferido', 'abandono', 'aprovado',
                      'reprovado', 'remanejado', 'progressao_parcial'));

-- historico_situacao.situacao ----------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'historico_situacao'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%situacao%'
  LOOP
    EXECUTE format('ALTER TABLE historico_situacao DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE historico_situacao ADD CONSTRAINT historico_situacao_situacao_check
  CHECK (situacao IN ('cursando', 'transferido', 'abandono', 'aprovado',
                      'reprovado', 'remanejado', 'progressao_parcial'));

COMMENT ON COLUMN alunos.situacao IS
  'Situação acadêmica: cursando, transferido, abandono, aprovado, reprovado, '
  'remanejado, progressao_parcial (aprovado com dependência — avança de ano).';

COMMIT;

-- Verificação (read-only): confirmar que o novo valor é aceito
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conname IN ('alunos_situacao_check','historico_situacao_situacao_check');
