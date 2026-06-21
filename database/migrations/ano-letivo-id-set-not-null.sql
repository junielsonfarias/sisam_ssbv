-- ============================================================================
-- ano-letivo-id-set-not-null.sql
-- Data: 2026-06-21
-- Ciclo: 6 (FlowSchoolAgent) — gap Media, tipo banco-naodestrutivo
-- Auditoria: "Aposentadoria da dualidade de chaves — SET NOT NULL em ano_letivo_id"
--
-- Problema:
--   O eixo temporal do sistema tem DUAS fontes da verdade: a coluna texto
--   ano_letivo (character varying) e a FK ano_letivo_id (uuid -> anos_letivos).
--   Enquanto ano_letivo_id permanece NULLABLE, o modelo IDEAL (FK como unica
--   fonte) nao e imposto pelo banco: e possivel criar linhas sem o vinculo
--   relacional, mantendo a dualidade viva.
--
--   Esta migracao torna ano_letivo_id NOT NULL nas 5 tabelas do eixo temporal,
--   fechando o invariante no nivel do banco. A coluna texto ano_letivo e
--   MANTIDA por ora (sua descontinuacao e item futuro, fora deste ciclo).
--
-- Pre-requisitos (ja atendidos no educanet-demo, verificados em 2026-06-21):
--   * gaps Alta concluidos: backfill aplicado + escritas populando ano_letivo_id.
--   * Contagem de NULLs = 0 nas 5 tabelas (alunos, periodos_letivos,
--     professor_turmas, series_escola, turmas).
--   * FK ano_letivo_id -> anos_letivos (ON DELETE RESTRICT) ja existe nas 5,
--     entao deletar um ano_letivo nao recria NULLs.
--
-- Tabelas afetadas: alunos, periodos_letivos, professor_turmas,
--                    series_escola, turmas.
--   (calendario_eventos.ano_letivo_id ja era NOT NULL — fora do escopo.)
--
-- Idempotencia:
--   * Diagnostico (RAISE NOTICE) das contagens de NULL antes de qualquer ALTER.
--   * GUARDA defensiva: se houver QUALQUER NULL em alguma tabela, ABORTA com
--     RAISE EXCEPTION (NAO inventa dado, NAO deleta linhas — diferente das
--     tabelas de resultado, aqui as linhas sao entidades de negocio e nao podem
--     ser descartadas; um NULL aqui significa que o backfill nao convergiu).
--   * ALTER ... SET NOT NULL e no-op quando a coluna ja e NOT NULL.
--   * Bloco DO por tabela com to_regclass para tolerar ausencia de tabela.
--   * Verificacao final reconfirma is_nullable='NO' nas 5; falha se nao.
--
-- ROLLBACK:
--   Reverter o invariante (voltar a permitir NULL) em cada tabela:
--     ALTER TABLE alunos           ALTER COLUMN ano_letivo_id DROP NOT NULL;
--     ALTER TABLE periodos_letivos ALTER COLUMN ano_letivo_id DROP NOT NULL;
--     ALTER TABLE professor_turmas ALTER COLUMN ano_letivo_id DROP NOT NULL;
--     ALTER TABLE series_escola    ALTER COLUMN ano_letivo_id DROP NOT NULL;
--     ALTER TABLE turmas           ALTER COLUMN ano_letivo_id DROP NOT NULL;
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Diagnostico + guarda: contar NULLs; abortar se algum residuo existir.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl          TEXT;
  qtd_null     BIGINT;
  total_null   BIGINT := 0;
  alvos        TEXT[] := ARRAY[
                  'alunos','periodos_letivos','professor_turmas',
                  'series_escola','turmas'
                ];
BEGIN
  FOREACH tbl IN ARRAY alvos LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      RAISE NOTICE 'Tabela %.% inexistente — pulando.', 'public', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE ano_letivo_id IS NULL', tbl)
      INTO qtd_null;

    RAISE NOTICE 'Tabela %: % linha(s) com ano_letivo_id NULL.', tbl, qtd_null;
    total_null := total_null + qtd_null;
  END LOOP;

  IF total_null > 0 THEN
    RAISE EXCEPTION
      'ABORTANDO: % linha(s) ainda com ano_letivo_id NULL. Conclua o backfill (gaps Alta) antes do SET NOT NULL.',
      total_null;
  END IF;

  RAISE NOTICE 'Diagnostico OK: 0 NULLs nas 5 tabelas. Aplicando SET NOT NULL.';
END $$;

-- ----------------------------------------------------------------------------
-- 2) SET NOT NULL nas 5 tabelas (no-op se ja NOT NULL; tolera tabela ausente).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl    TEXT;
  alvos  TEXT[] := ARRAY[
            'alunos','periodos_letivos','professor_turmas',
            'series_escola','turmas'
          ];
BEGIN
  FOREACH tbl IN ARRAY alvos LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN ano_letivo_id SET NOT NULL', tbl
    );
    RAISE NOTICE 'SET NOT NULL aplicado em %.', tbl;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Verificacao final: as 5 colunas precisam estar is_nullable = 'NO'.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pendentes INT;
BEGIN
  SELECT COUNT(*) INTO pendentes
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name  = 'ano_letivo_id'
    AND table_name IN ('alunos','periodos_letivos','professor_turmas',
                       'series_escola','turmas')
    AND is_nullable = 'YES';

  IF pendentes > 0 THEN
    RAISE EXCEPTION 'VERIFICACAO FALHOU: % coluna(s) ano_letivo_id ainda NULLABLE.', pendentes;
  END IF;

  RAISE NOTICE 'Verificacao final OK: ano_letivo_id NOT NULL nas 5 tabelas.';
END $$;

COMMIT;
