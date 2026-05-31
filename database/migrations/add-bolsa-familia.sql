-- ============================================================================
-- MIGRATION: Bolsa Familia - Mapa de Frequencia Escolar (Fase 3 SEMED)
-- Base legal: Lei 14.601/2023 + Sistema Presenca MEC
-- Condicionalidade educacional: 60% para 4-5 anos / 75% para 6-17 anos
-- ============================================================================

-- Marcador de beneficiario no aluno
BEGIN;

ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS beneficiario_bolsa_familia BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nis VARCHAR(11),  -- Numero de Identificacao Social
  ADD COLUMN IF NOT EXISTS codigo_familiar VARCHAR(20);  -- codigo da familia no CadUnico

CREATE INDEX IF NOT EXISTS idx_alunos_bolsa_familia
  ON alunos(beneficiario_bolsa_familia)
  WHERE beneficiario_bolsa_familia = TRUE;

CREATE INDEX IF NOT EXISTS idx_alunos_nis
  ON alunos(nis) WHERE nis IS NOT NULL;

-- Registros bimestrais enviados ao Sistema Presenca
CREATE TABLE IF NOT EXISTS bolsa_familia_mapas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  ano_letivo      VARCHAR(4) NOT NULL,
  -- Bimestres do Sistema Presenca: Fev/Mar/Abr/Mai = bim1, Jun/Jul/Ago = bim2, etc.
  -- Sao 5 periodos bimestrais ao longo do ano educacional
  periodo         VARCHAR(20) NOT NULL CHECK (periodo IN (
    'fev_abr', 'mai_jun', 'ago_set', 'out_nov', 'dez'
  )),
  -- Dados calculados
  total_dias_letivos INTEGER NOT NULL DEFAULT 0,
  total_faltas    INTEGER NOT NULL DEFAULT 0,
  total_presencas INTEGER NOT NULL DEFAULT 0,
  frequencia_percentual NUMERIC(5,2),
  -- Faixa etaria define o minimo: 4-5 anos = 60%, 6-17 anos = 75%
  faixa_etaria    VARCHAR(20),
  cumpre_condicionalidade BOOLEAN,
  -- Motivo de baixa frequencia (justificativa para nao perder beneficio)
  motivo_baixa_frequencia TEXT,
  -- Status do envio ao Sistema Presenca
  status_envio    VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status_envio IN ('pendente', 'enviado', 'erro')),
  enviado_em      TIMESTAMPTZ,
  -- Quem registrou no sistema
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, ano_letivo, periodo)
);

CREATE INDEX IF NOT EXISTS idx_bf_mapas_aluno ON bolsa_familia_mapas(aluno_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_bf_mapas_periodo ON bolsa_familia_mapas(ano_letivo, periodo);
CREATE INDEX IF NOT EXISTS idx_bf_mapas_status ON bolsa_familia_mapas(status_envio);
CREATE INDEX IF NOT EXISTS idx_bf_mapas_alerta
  ON bolsa_familia_mapas(cumpre_condicionalidade)
  WHERE cumpre_condicionalidade = FALSE;

COMMENT ON TABLE bolsa_familia_mapas IS
  'Mapas bimestrais de frequencia escolar para o Sistema Presenca do Bolsa Familia.';

COMMENT ON COLUMN alunos.beneficiario_bolsa_familia IS
  'Indica se o aluno pertence a familia beneficiaria do Bolsa Familia (BPC + Auxilio Brasil + PBF).';

COMMIT;
