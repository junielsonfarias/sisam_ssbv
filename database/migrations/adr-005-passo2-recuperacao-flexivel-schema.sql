-- =====================================================================
-- Migration: ADR-005 Passo 2 — Schema aditivo de recuperacao flexivel
-- Data: 2026-06-21
-- Autor: especialista-banco-sisam
-- Banco-alvo: educanet-demo (tbbnswuqsqhulserwtcc) — producao desvinculada
-- ADR: docs/adr/ADR-005-recuperacao-flexivel-por-escola.md (secao "Consequencias > Schema")
--
-- OBJETIVO:
--   Tornar a recuperacao academica parametrizavel por escola/serie/ano,
--   de forma ADITIVA (sem DROP, sem NOT NULL novo em coluna existente,
--   sem DELETE em massa). O campo legado notas_escolares.nota_recuperacao
--   PERMANECE intacto (DROP e decisao humana — passo 8 do ADR).
--   (1) coluna esquema_recuperacao em escola_regras_avaliacao
--   (2) tabela recuperacoes_escolares (nova entidade)
--   (3) tabela ponte recuperacoes_periodos (decisao A4 do ADR — N:N)
--   (4) indices idx_rec_esc_aluno_disc_ano e idx_rec_esc_escola_ano
--   (5) RLS habilitado (sem policy) nas 2 tabelas novas — padrao do projeto
--
-- IDEMPOTENCIA:
--   ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS /
--   CREATE INDEX IF NOT EXISTS / ENABLE RLS dentro de bloco DO guard.
--   Reexecucao e segura (no-op).
--
-- ROLLBACK (manual, fora desta migration — nao executar sem decisao humana):
--   DROP TABLE IF EXISTS recuperacoes_periodos;
--   DROP TABLE IF EXISTS recuperacoes_escolares;
--   ALTER TABLE escola_regras_avaliacao DROP COLUMN IF EXISTS esquema_recuperacao;
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- (1) Nova coluna esquema_recuperacao em escola_regras_avaliacao
--     DEFAULT 'por_periodo' = comportamento atual (sem regressao).
-- ---------------------------------------------------------------------
ALTER TABLE escola_regras_avaliacao
  ADD COLUMN IF NOT EXISTS esquema_recuperacao VARCHAR(30)
    NOT NULL DEFAULT 'por_periodo'
    CHECK (esquema_recuperacao IN ('por_periodo','por_bloco_periodos','semestral','final'));

-- ---------------------------------------------------------------------
-- (2) Nova entidade recuperacoes_escolares
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recuperacoes_escolares (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  disciplina_id    UUID NOT NULL REFERENCES disciplinas_escolares(id) ON DELETE CASCADE,
  escola_id        UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  ano_letivo       VARCHAR(10) NOT NULL,
  esquema          VARCHAR(30) NOT NULL DEFAULT 'por_periodo'
                     CHECK (esquema IN ('por_periodo','por_bloco_periodos','semestral','final')),
  nota_recuperacao DECIMAL(5,2) CHECK (nota_recuperacao >= 0),
  nota_final_calc  DECIMAL(5,2),
  registrado_por   UUID REFERENCES usuarios(id),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- (3) Tabela ponte recuperacoes_periodos (A4) — N:N recuperacao x periodos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recuperacoes_periodos (
  recuperacao_id   UUID NOT NULL REFERENCES recuperacoes_escolares(id) ON DELETE CASCADE,
  periodo_id       UUID NOT NULL REFERENCES periodos_letivos(id) ON DELETE CASCADE,
  PRIMARY KEY (recuperacao_id, periodo_id)
);

-- ---------------------------------------------------------------------
-- (4) Indices
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rec_esc_aluno_disc_ano
  ON recuperacoes_escolares(aluno_id, disciplina_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_rec_esc_escola_ano
  ON recuperacoes_escolares(escola_id, ano_letivo);
-- Suporte ao JOIN reverso periodo -> recuperacao (lado nao-prefixo da PK composta)
CREATE INDEX IF NOT EXISTS idx_rec_periodos_periodo
  ON recuperacoes_periodos(periodo_id);

-- ---------------------------------------------------------------------
-- (5) RLS habilitado sem policy (padrao do projeto para tabelas SEMED novas).
--     Acesso se da via service role (pool PG server-side); sem policy = nega
--     acesso anon/authenticated direto.
-- ---------------------------------------------------------------------
ALTER TABLE recuperacoes_escolares ENABLE ROW LEVEL SECURITY;
ALTER TABLE recuperacoes_periodos  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Verificacao final: aborta se algo nao convergiu.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='escola_regras_avaliacao'
      AND column_name='esquema_recuperacao'
  ) THEN
    RAISE EXCEPTION 'Falha: coluna esquema_recuperacao nao foi criada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='recuperacoes_escolares') THEN
    RAISE EXCEPTION 'Falha: tabela recuperacoes_escolares nao foi criada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='recuperacoes_periodos') THEN
    RAISE EXCEPTION 'Falha: tabela recuperacoes_periodos nao foi criada';
  END IF;

  RAISE NOTICE 'ADR-005 Passo 2: schema aditivo aplicado com sucesso.';
END $$;

COMMIT;
