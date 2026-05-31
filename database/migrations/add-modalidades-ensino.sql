-- ============================================================================
-- MIGRATION: Modalidades de Ensino (Fase 2 SEMED)
-- Permite distinguir Regular, EJA e Educacao Infantil em turmas e series.
-- Adiciona campos especificos por modalidade.
-- ============================================================================

-- 1. Coluna modalidade em series_escolares (se nao existir)
BEGIN;

ALTER TABLE series_escolares
  ADD COLUMN IF NOT EXISTS modalidade VARCHAR(30) NOT NULL DEFAULT 'regular'
    CHECK (modalidade IN ('regular', 'eja_fundamental', 'ed_infantil_creche', 'ed_infantil_pre'));

CREATE INDEX IF NOT EXISTS idx_series_modalidade
  ON series_escolares(modalidade)
  WHERE modalidade != 'regular';

COMMENT ON COLUMN series_escolares.modalidade IS
  'regular | eja_fundamental | ed_infantil_creche (0-3a) | ed_infantil_pre (4-5a)';

-- 2. Coluna modalidade em turmas (derivada da serie, mas redundante para queries)
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS modalidade VARCHAR(30) NOT NULL DEFAULT 'regular'
    CHECK (modalidade IN ('regular', 'eja_fundamental', 'ed_infantil_creche', 'ed_infantil_pre'));

CREATE INDEX IF NOT EXISTS idx_turmas_modalidade
  ON turmas(modalidade)
  WHERE modalidade != 'regular';

-- 3. Coluna semestre em periodos_letivos (EJA usa semestres em vez de bimestres)
ALTER TABLE periodos_letivos
  ADD COLUMN IF NOT EXISTS tipo_periodo VARCHAR(20) DEFAULT 'bimestre'
    CHECK (tipo_periodo IN ('bimestre', 'trimestre', 'semestre', 'anual'));

COMMENT ON COLUMN periodos_letivos.tipo_periodo IS
  'EJA usa semestre; regular usa bimestre/trimestre; Ed. Infantil pode usar anual.';

-- 4. Etapa EJA (Fundamental I = 1a-5a serie equivalente, II = 6a-9a)
-- Estrutura sugerida (insercao opcional - depende do municipio):
-- EJA F1.1 (1o segmento - alfabetizacao) ate EJA F1.4 = equivalente a 1o-5o anos
-- EJA F2.1 ate EJA F2.4 = equivalente a 6o-9o anos

-- 5. Campos especificos para EJA
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS modalidade VARCHAR(30) DEFAULT 'regular'
    CHECK (modalidade IN ('regular', 'eja_fundamental', 'ed_infantil_creche', 'ed_infantil_pre'));

CREATE INDEX IF NOT EXISTS idx_alunos_modalidade
  ON alunos(modalidade)
  WHERE modalidade != 'regular';

-- 6. Certificacao EJA por etapa concluida
CREATE TABLE IF NOT EXISTS eja_certificacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  etapa           VARCHAR(20) NOT NULL,  -- ex: 'EJA_F1', 'EJA_F2'
  data_conclusao  DATE NOT NULL,
  numero_certificado VARCHAR(50) UNIQUE,
  ano_letivo      VARCHAR(4),
  observacoes     TEXT,
  emitida_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emitida_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_eja_cert_aluno ON eja_certificacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_eja_cert_numero ON eja_certificacoes(numero_certificado);

COMMENT ON TABLE eja_certificacoes IS
  'Certificados emitidos por etapa de EJA concluida (Fundamental I, II).';

COMMIT;
