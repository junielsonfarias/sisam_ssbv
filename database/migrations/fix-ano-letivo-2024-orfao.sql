-- ============================================================================
-- MIGRACAO: Integridade interna do mestre (Gestor Escolar) — ano letivo 2024 orfao
-- Ciclo: 3 (FlowSchoolAgent) | Branch: auto/fluxo-escolar
-- Data: 2026-06-21
-- ============================================================================
--
-- OBJETIVO
--   A fonte unica (turmas) referencia o ano letivo por texto (turmas.ano_letivo),
--   mas a dimensao anos_letivos nao possui linha para 2024. Existem 36 turmas
--   historicas com ano_letivo='2024' sem ano cadastrado em anos_letivos, criando
--   buracos silenciosos nos modulos consumidores que fazem JOIN/lookup por ano.
--
--   Esta migracao registra o ano 2024 em anos_letivos com status='fechado',
--   resolvendo o orfao SEM tocar em nenhum dado de movimento (turmas/alunos
--   permanecem intactos).
--
-- NATUREZA
--   Idempotente e NAO-DESTRUTIVA. Apenas INSERT condicional via ON CONFLICT.
--   Apoia-se na UNIQUE constraint existente anos_letivos_ano_key (ano).
--   Pode ser reexecutada com seguranca (DO NOTHING em conflito).
--
-- DIAGNOSTICO (educanet-demo, 2026-06-21)
--   anos_letivos: 2025 (em_andamento), 2026 (em_andamento) — 2024 AUSENTE.
--   turmas ano_letivo='2024': 36 turmas, 36 sem ano cadastrado, 0 com aluno.
--   Sem CHECK constraint em anos_letivos.status no banco atual (status livre).
--
-- ROLLBACK
--   Remove apenas a linha-dimensao recem-criada (nao afeta dado de movimento):
--     DELETE FROM anos_letivos WHERE ano = '2024' AND status = 'fechado';
--   (Execucao manual; nao incluida na migracao por ser destrutiva.)
--
-- DIVIDAS DOCUMENTADAS (PROPOSTAS — NAO autoaplicaveis, ver relatorio)
--   1) FK turmas.ano_letivo -> anos_letivos(ano): exige decisao de modelagem
--      (texto vs id) e backfill; restritivo. Deixar para especialista-banco.
--   2) Destino das 36 turmas vazias de 2024 (inativar / UPDATE em massa):
--      destrutivo -> proposta, nao acao.
-- ============================================================================

BEGIN;

-- Diagnostico: quantas turmas de 2024 estao orfas antes da correcao
DO $$
DECLARE
  v_orfas INTEGER;
BEGIN
  SELECT count(*) INTO v_orfas
  FROM turmas t
  WHERE t.ano_letivo = '2024'
    AND NOT EXISTS (SELECT 1 FROM anos_letivos a WHERE a.ano = t.ano_letivo);
  RAISE NOTICE 'Turmas com ano_letivo=2024 sem ano cadastrado (antes): %', v_orfas;
END $$;

-- Correcao nao-destrutiva: registra a dimensao 2024 como ano fechado.
-- Idempotente via UNIQUE(ano): reexecucao nao duplica nem sobrescreve.
INSERT INTO anos_letivos (ano, status, observacao)
VALUES (
  '2024',
  'fechado',
  'Ano historico registrado para sanar orfaos do mestre (turmas 2024). Ciclo 3 FlowSchoolAgent.'
)
ON CONFLICT (ano) DO NOTHING;

-- Verificacao final: 2024 deve existir e nao pode restar turma 2024 orfa.
DO $$
DECLARE
  v_ano_existe BOOLEAN;
  v_orfas INTEGER;
BEGIN
  SELECT EXISTS (SELECT 1 FROM anos_letivos WHERE ano = '2024') INTO v_ano_existe;
  IF NOT v_ano_existe THEN
    RAISE EXCEPTION 'Falha: ano 2024 nao foi registrado em anos_letivos';
  END IF;

  SELECT count(*) INTO v_orfas
  FROM turmas t
  WHERE t.ano_letivo = '2024'
    AND NOT EXISTS (SELECT 1 FROM anos_letivos a WHERE a.ano = t.ano_letivo);
  IF v_orfas > 0 THEN
    RAISE EXCEPTION 'Falha: ainda restam % turmas de 2024 sem ano cadastrado', v_orfas;
  END IF;

  RAISE NOTICE 'OK: ano 2024 registrado; turmas 2024 orfas restantes: 0';
END $$;

COMMIT;
