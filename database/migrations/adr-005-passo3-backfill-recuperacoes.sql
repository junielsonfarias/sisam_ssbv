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
-- COLUNA DE RASTREIO (aditiva):
--   Adiciona recuperacoes_escolares.nota_id_origem (FK opcional p/ notas_escolares)
--   para correlacionar 1:1 a recuperacao de backfill com a nota de origem.
--   Necessaria porque um mesmo (aluno,disciplina,ano) pode ter varios periodos
--   com recuperacao de MESMO valor — sem essa ancora, o pareamento pela chave
--   natural cruzaria linhas e inflaria a ponte. Tambem serve de guard de
--   idempotencia limpo. Nullable: lancamentos novos (nao-backfill) ficam NULL.
--
-- IDEMPOTENCIA:
--   Guard NOT EXISTS por nota_id_origem: nao recria recuperacao 'por_periodo'
--   ja gerada para aquela nota. Reexecucao e segura (no-op). Sem DELETE em massa.
--
-- ROLLBACK (manual — nao executar sem decisao humana):
--   DELETE FROM recuperacoes_periodos rp USING recuperacoes_escolares re
--     WHERE rp.recuperacao_id = re.id
--       AND re.esquema = 'por_periodo' AND re.nota_id_origem IS NOT NULL;
--   DELETE FROM recuperacoes_escolares
--     WHERE esquema = 'por_periodo' AND nota_id_origem IS NOT NULL;
-- =====================================================================

BEGIN;

-- (0) Coluna de rastreio da origem do backfill (aditiva, idempotente).
ALTER TABLE recuperacoes_escolares
  ADD COLUMN IF NOT EXISTS nota_id_origem UUID
    REFERENCES notas_escolares(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rec_esc_nota_origem
  ON recuperacoes_escolares(nota_id_origem);

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

-- Mapeamento temporario nota_id -> recuperacao_id para garantir pareamento
-- 1:1 exato nota->recuperacao->periodo. Necessario porque recuperacoes_escolares
-- nao carrega periodo_id, e um mesmo (aluno,disciplina,ano) pode ter varios
-- periodos com recuperacao de MESMO valor (cross-join pela chave natural
-- inflaria a ponte). A correlacao por nota_id elimina essa ambiguidade.
CREATE TEMP TABLE _map_rec_backfill (
  nota_id        UUID PRIMARY KEY,
  periodo_id     UUID NOT NULL,
  recuperacao_id UUID NOT NULL
) ON COMMIT DROP;

-- (1) Inserir 1 recuperacoes_escolares por nota com recuperacao e capturar
--     o id criado junto do nota_id/periodo_id de origem (linha-a-linha).
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
    -- Guard de idempotencia exato: pula notas ja migradas (mesma nota de origem).
    AND NOT EXISTS (
      SELECT 1 FROM recuperacoes_escolares re
      WHERE re.esquema = 'por_periodo'
        AND re.nota_id_origem = n.id
    )
),
inseridas AS (
  INSERT INTO recuperacoes_escolares
    (aluno_id, disciplina_id, escola_id, ano_letivo, esquema, nota_recuperacao, nota_id_origem)
  SELECT aluno_id, disciplina_id, escola_id, ano_letivo, 'por_periodo', nota_recuperacao, nota_id
  FROM origem
  RETURNING id, nota_id_origem
)
INSERT INTO _map_rec_backfill (nota_id, periodo_id, recuperacao_id)
SELECT o.nota_id, o.periodo_id, i.id
FROM inseridas i
JOIN origem o ON o.nota_id = i.nota_id_origem;

-- (2) Ponte: 1 linha por nota, pareada deterministicamente via mapa temporario.
INSERT INTO recuperacoes_periodos (recuperacao_id, periodo_id)
SELECT recuperacao_id, periodo_id
FROM _map_rec_backfill
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
