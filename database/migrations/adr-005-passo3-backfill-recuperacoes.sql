-- =====================================================================
-- Migration de DADOS: ADR-005 Passo 3 — Backfill de recuperacoes legadas
-- Data: 2026-06-21
-- Autor: especialista-banco-sisam
-- Banco-alvo: educanet-demo (tbbnswuqsqhulserwtcc) — producao desvinculada
-- ADR: docs/adr/ADR-005-recuperacao-flexivel-por-escola.md (plano, passo 3)
-- Pre-requisito: passo 2 (adr-005-passo2-recuperacao-flexivel-schema.sql)
--
-- OBJETIVO:
--   Para cada linha de notas_escolares com nota_recuperacao NOT NULL,
--   criar 1 linha em recuperacoes_escolares (esquema='por_periodo',
--   copiando aluno/disciplina/escola/ano/nota) + 1 linha em
--   recuperacoes_periodos apontando para o periodo_id daquela nota.
--   O campo legado nota_recuperacao PERMANECE (dual-read transitorio).
--
-- IDEMPOTENCIA:
--   Guard NOT EXISTS: nao recria recuperacao 'por_periodo' que ja exista
--   para o mesmo (aluno, disciplina, ano) ligada ao mesmo periodo na ponte.
--   Reexecucao e segura (no-op). Sem DELETE em massa.
--
-- ROLLBACK (manual — nao executar sem decisao humana):
--   DELETE FROM recuperacoes_periodos rp USING recuperacoes_escolares re
--     WHERE rp.recuperacao_id = re.id AND re.esquema = 'por_periodo';
--   DELETE FROM recuperacoes_escolares WHERE esquema = 'por_periodo';
-- =====================================================================

BEGIN;

-- Diagnostico do que sera afetado.
DO $$
DECLARE
  v_origem  BIGINT;
  v_ja      BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_origem
    FROM notas_escolares WHERE nota_recuperacao IS NOT NULL;

  SELECT COUNT(*) INTO v_ja
    FROM recuperacoes_escolares re
    JOIN recuperacoes_periodos rp ON rp.recuperacao_id = re.id
    WHERE re.esquema = 'por_periodo';

  RAISE NOTICE 'Backfill ADR-005: notas com recuperacao=% | recuperacoes por_periodo ja existentes=%',
    v_origem, v_ja;
END $$;

-- (1) Inserir recuperacoes_escolares (1 por nota com recuperacao).
--     CTE devolve os ids criados ja pareados com o periodo de origem,
--     para alimentar a tabela ponte sem reconsultar pela chave natural.
WITH origem AS (
  SELECT n.id          AS nota_id,
         n.aluno_id,
         n.disciplina_id,
         n.escola_id,
         n.ano_letivo,
         n.periodo_id,
         n.nota_recuperacao
  FROM notas_escolares n
  WHERE n.nota_recuperacao IS NOT NULL
    -- Guard de idempotencia: pula se ja existe recuperacao por_periodo
    -- para este (aluno, disciplina, ano) cobrindo este periodo.
    AND NOT EXISTS (
      SELECT 1
      FROM recuperacoes_escolares re
      JOIN recuperacoes_periodos rp ON rp.recuperacao_id = re.id
      WHERE re.esquema       = 'por_periodo'
        AND re.aluno_id      = n.aluno_id
        AND re.disciplina_id = n.disciplina_id
        AND re.ano_letivo    = n.ano_letivo
        AND rp.periodo_id    = n.periodo_id
    )
),
inseridas AS (
  INSERT INTO recuperacoes_escolares
    (aluno_id, disciplina_id, escola_id, ano_letivo, esquema, nota_recuperacao)
  SELECT aluno_id, disciplina_id, escola_id, ano_letivo, 'por_periodo', nota_recuperacao
  FROM origem
  RETURNING id, aluno_id, disciplina_id, ano_letivo, nota_recuperacao
)
-- (2) Ponte: liga cada recuperacao recem-criada ao periodo da nota de origem.
--     O join usa a chave natural; como ainda nao havia recuperacao por_periodo
--     para essas linhas (garantido pelo guard acima), o pareamento e 1:1.
INSERT INTO recuperacoes_periodos (recuperacao_id, periodo_id)
SELECT DISTINCT i.id, o.periodo_id
FROM inseridas i
JOIN origem o
  ON o.aluno_id      = i.aluno_id
 AND o.disciplina_id = i.disciplina_id
 AND o.ano_letivo    = i.ano_letivo
 AND o.nota_recuperacao IS NOT DISTINCT FROM i.nota_recuperacao
ON CONFLICT (recuperacao_id, periodo_id) DO NOTHING;

-- Verificacao final: contagem de recuperacoes por_periodo == nº de notas com recuperacao.
DO $$
DECLARE
  v_origem BIGINT;
  v_rec    BIGINT;
  v_ponte  BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_origem
    FROM notas_escolares WHERE nota_recuperacao IS NOT NULL;

  SELECT COUNT(*) INTO v_rec
    FROM recuperacoes_escolares WHERE esquema = 'por_periodo';

  SELECT COUNT(*) INTO v_ponte
    FROM recuperacoes_periodos rp
    JOIN recuperacoes_escolares re ON re.id = rp.recuperacao_id
    WHERE re.esquema = 'por_periodo';

  RAISE NOTICE 'Pos-backfill: origem=% | recuperacoes_escolares(por_periodo)=% | ponte=%',
    v_origem, v_rec, v_ponte;

  IF v_rec <> v_origem THEN
    RAISE EXCEPTION 'Divergencia: recuperacoes por_periodo (%) != notas com recuperacao (%)',
      v_rec, v_origem;
  END IF;

  IF v_ponte <> v_origem THEN
    RAISE EXCEPTION 'Divergencia na ponte: linhas (%) != notas com recuperacao (%)',
      v_ponte, v_origem;
  END IF;
END $$;

COMMIT;
