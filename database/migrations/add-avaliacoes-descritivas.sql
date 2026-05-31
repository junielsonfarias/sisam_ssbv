-- ============================================================================
-- MIGRATION: Avaliacoes descritivas (Fase 2 SEMED)
-- Para anos iniciais e Educacao Infantil, onde nao se usa nota numerica.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS avaliacoes_descritivas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  periodo_id      UUID REFERENCES periodos_letivos(id) ON DELETE SET NULL,
  disciplina_id   UUID REFERENCES disciplinas_escolares(id) ON DELETE SET NULL,
  professor_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  texto_descritivo TEXT NOT NULL,
  conceito        VARCHAR(50) CHECK (conceito IN (
    'plenamente_satisfatorio',  -- PS
    'satisfatorio',             -- S
    'em_desenvolvimento',       -- ED
    'insuficiente',             -- I
    -- Conceitos especificos Ed. Infantil
    'consolidado',
    'em_processo',
    'nao_observado'
  )),
  -- Habilidades BNCC avaliadas (array de codigos)
  habilidades_avaliadas TEXT[] DEFAULT '{}',
  -- Status: rascunho ou publicada
  status          VARCHAR(20) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicada')),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, periodo_id, disciplina_id, professor_id)
);

CREATE INDEX IF NOT EXISTS idx_avdesc_aluno ON avaliacoes_descritivas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_avdesc_periodo ON avaliacoes_descritivas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_avdesc_professor ON avaliacoes_descritivas(professor_id);
CREATE INDEX IF NOT EXISTS idx_avdesc_status ON avaliacoes_descritivas(status);

COMMENT ON TABLE avaliacoes_descritivas IS
  'Avaliacoes qualitativas (sem nota numerica) para anos iniciais e Educacao Infantil. Cada registro descreve o progresso de um aluno em uma disciplina/periodo.';

COMMENT ON COLUMN avaliacoes_descritivas.conceito IS
  'Conceitos padronizados: PS/S/ED/I para anos iniciais; consolidado/em_processo/nao_observado para Ed. Infantil.';

COMMIT;
