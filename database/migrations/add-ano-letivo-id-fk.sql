-- ============================================================================
-- add-ano-letivo-id-fk.sql
-- Data: 2026-06-21
-- Ciclo: 5 (FlowSchoolAgent) — Gestor Escolar (interno) -> integridade do Ano Letivo
-- Banco: aplicado SOMENTE no educanet-demo (tbbnswuqsqhulserwtcc).
--
-- PROBLEMA (Media):
--   O ano letivo e dado mestre (tabela anos_letivos), mas as tabelas
--   operacionais (turmas, alunos, series_escola, professor_turmas,
--   periodos_letivos) referenciam o ano apenas por VARCHAR (coluna ano_letivo).
--   O casamento por string permite ano orfao/typo ('2026' vs '2026 ' vs '26'),
--   que o FlowSchoolAgent nao consegue confiar como chave. Nao ha integridade
--   referencial.
--
-- OBJETIVO (NAO-DESTRUTIVO / IDEMPOTENTE):
--   Adicionar em cada tabela operacional uma coluna ano_letivo_id UUID NULLABLE
--   com FK -> anos_letivos(id) ON DELETE RESTRICT, e um indice de suporte.
--   A coluna VARCHAR (ano_letivo) PERMANECE por compatibilidade (deprecacao
--   futura). Adicionar coluna+FK NULLABLE e operacao nao-destrutiva: nenhuma
--   linha existente e alterada e nenhuma restricao e violada (todas ficam NULL).
--
-- POR QUE ON DELETE RESTRICT:
--   anos_letivos e configuracao critica. Impedir o delete de um ano que ainda
--   tem dado operacional pendurado e o comportamento correto (forca cleanup
--   explicito). Mesmo criterio ja usado para configuracao critica na migration
--   fix-fks-sem-on-delete.sql.
--
-- POR QUE NULLABLE (e nao NOT NULL agora):
--   1) Mantem a migration nao-destrutiva: linhas legadas ficam com id NULL ate
--      o backfill rodar.
--   2) O backfill (preencher os ids casando varchar->anos_letivos.ano) e um
--      passo de DADOS (UPDATE em massa) e, por regra do ciclo, NAO e executado
--      automaticamente aqui — fica como PROPOSTA abaixo.
--
-- DIAGNOSTICO no demo (2026-06-21) — base para a PROPOSTA de backfill:
--   anos_letivos: 3 anos limpos (2024, 2025, 2026), sem typo/duplicata.
--   turmas=183, alunos=1608, series_escola=36, professor_turmas=331,
--   periodos_letivos=12 — ZERO ano_letivo NULL e ZERO orfao (todo varchar
--   casa com anos_letivos.ano). Logo o backfill cobriria 100% das linhas.
--
-- ---------------------------------------------------------------------------
-- PROPOSTA (passo de DADOS — NAO aplicado por este arquivo; requer aprovacao):
--   -- Backfill: preencher ano_letivo_id casando o varchar com anos_letivos.ano.
--   -- (TRIM defensivo contra espacos; nao corrige typo de digito como '26'.)
--   UPDATE turmas t            SET ano_letivo_id = a.id FROM anos_letivos a WHERE t.ano_letivo_id IS NULL AND a.ano = btrim(t.ano_letivo);
--   UPDATE alunos al           SET ano_letivo_id = a.id FROM anos_letivos a WHERE al.ano_letivo_id IS NULL AND a.ano = btrim(al.ano_letivo);
--   UPDATE series_escola s     SET ano_letivo_id = a.id FROM anos_letivos a WHERE s.ano_letivo_id IS NULL AND a.ano = btrim(s.ano_letivo);
--   UPDATE professor_turmas p  SET ano_letivo_id = a.id FROM anos_letivos a WHERE p.ano_letivo_id IS NULL AND a.ano = btrim(p.ano_letivo);
--   UPDATE periodos_letivos pl SET ano_letivo_id = a.id FROM anos_letivos a WHERE pl.ano_letivo_id IS NULL AND a.ano = btrim(pl.ano_letivo);
--   -- Apos backfill 100% (e validacao por tabela de que nao restou id NULL),
--   -- avaliar ALTER ... SET NOT NULL (passo restritivo, tambem proposta).
-- ---------------------------------------------------------------------------
--
-- IMPACTO PARA CONSUMIDORES (handoff):
--   - Nenhum imediato: a coluna varchar ano_letivo segue intacta e e a fonte de
--     verdade ate o backfill+deprecacao. Services/routes nao precisam mudar agora.
--   - Futuro: migrar JOINs/filtros de ano_letivo (varchar) para ano_letivo_id.
--
-- Idempotencia: ADD COLUMN IF NOT EXISTS + FK criada via DO/checagem em
--   pg_constraint + CREATE INDEX IF NOT EXISTS. Reexecucao = no-op.
-- Atomicidade: BEGIN/COMMIT.
--
-- ROLLBACK (reverter estrutura — nao-destrutivo, so descarta colunas vazias):
--   ALTER TABLE turmas            DROP CONSTRAINT IF EXISTS turmas_ano_letivo_id_fkey;
--   ALTER TABLE turmas            DROP COLUMN IF EXISTS ano_letivo_id;
--   ALTER TABLE alunos            DROP CONSTRAINT IF EXISTS alunos_ano_letivo_id_fkey;
--   ALTER TABLE alunos            DROP COLUMN IF EXISTS ano_letivo_id;
--   ALTER TABLE series_escola     DROP CONSTRAINT IF EXISTS series_escola_ano_letivo_id_fkey;
--   ALTER TABLE series_escola     DROP COLUMN IF EXISTS ano_letivo_id;
--   ALTER TABLE professor_turmas  DROP CONSTRAINT IF EXISTS professor_turmas_ano_letivo_id_fkey;
--   ALTER TABLE professor_turmas  DROP COLUMN IF EXISTS ano_letivo_id;
--   ALTER TABLE periodos_letivos  DROP CONSTRAINT IF EXISTS periodos_letivos_ano_letivo_id_fkey;
--   ALTER TABLE periodos_letivos  DROP COLUMN IF EXISTS ano_letivo_id;
-- ============================================================================

BEGIN;

-- Funcao auxiliar inline: adiciona coluna + FK + indice de forma idempotente.
-- (Bloco DO por tabela; FK so e criada se ainda nao existir, evitando erro de
--  reexecucao — ADD CONSTRAINT nao suporta IF NOT EXISTS no Postgres.)

DO $$
DECLARE
  v_tbl text;
  v_tabelas text[] := ARRAY[
    'turmas',
    'alunos',
    'series_escola',
    'professor_turmas',
    'periodos_letivos'
  ];
  v_fk   text;
  v_idx  text;
BEGIN
  -- Pre-requisito: a tabela mestre precisa existir.
  IF to_regclass('public.anos_letivos') IS NULL THEN
    RAISE EXCEPTION 'add-ano-letivo-id-fk: tabela mestre public.anos_letivos nao existe.';
  END IF;

  FOREACH v_tbl IN ARRAY v_tabelas
  LOOP
    -- Tabela operacional pode nao existir em algum ambiente: pular com aviso.
    IF to_regclass('public.' || v_tbl) IS NULL THEN
      RAISE NOTICE 'add-ano-letivo-id-fk: tabela % nao existe — pulando.', v_tbl;
      CONTINUE;
    END IF;

    -- 1) Coluna ano_letivo_id UUID NULLABLE (idempotente)
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS ano_letivo_id uuid',
      v_tbl
    );

    -- 2) FK -> anos_letivos(id) ON DELETE RESTRICT (criar so se nao existir)
    v_fk := v_tbl || '_ano_letivo_id_fkey';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = v_fk
        AND conrelid = ('public.' || v_tbl)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I
           ADD CONSTRAINT %I
           FOREIGN KEY (ano_letivo_id)
           REFERENCES public.anos_letivos(id)
           ON DELETE RESTRICT',
        v_tbl, v_fk
      );
      RAISE NOTICE 'add-ano-letivo-id-fk: FK % criada.', v_fk;
    ELSE
      RAISE NOTICE 'add-ano-letivo-id-fk: FK % ja existe — no-op.', v_fk;
    END IF;

    -- 3) Indice de suporte para a FK (join/filtro por ano_letivo_id)
    v_idx := 'idx_' || v_tbl || '_ano_letivo_id';
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (ano_letivo_id)',
      v_idx, v_tbl
    );
  END LOOP;
END $$;

-- Verificacao final: as 5 colunas + 5 FKs devem existir (para tabelas que existem).
DO $$
DECLARE
  v_tbl text;
  v_tabelas text[] := ARRAY[
    'turmas','alunos','series_escola','professor_turmas','periodos_letivos'
  ];
  v_cols  integer := 0;
  v_fks   integer := 0;
  v_alvos integer := 0;
BEGIN
  FOREACH v_tbl IN ARRAY v_tabelas
  LOOP
    IF to_regclass('public.' || v_tbl) IS NULL THEN
      CONTINUE;
    END IF;
    v_alvos := v_alvos + 1;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_tbl AND column_name='ano_letivo_id'
    ) THEN
      v_cols := v_cols + 1;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = v_tbl || '_ano_letivo_id_fkey'
        AND conrelid = ('public.' || v_tbl)::regclass
    ) THEN
      v_fks := v_fks + 1;
    END IF;
  END LOOP;

  IF v_cols <> v_alvos THEN
    RAISE EXCEPTION 'add-ano-letivo-id-fk: esperado % coluna(s) ano_letivo_id, encontrado %.', v_alvos, v_cols;
  END IF;
  IF v_fks <> v_alvos THEN
    RAISE EXCEPTION 'add-ano-letivo-id-fk: esperado % FK(s), encontrado %.', v_alvos, v_fks;
  END IF;

  RAISE NOTICE 'add-ano-letivo-id-fk: OK — % tabela(s) alvo, colunas=%, fks=%.', v_alvos, v_cols, v_fks;
END $$;

COMMIT;
