-- ============================================================================
-- MIGRATION: Diario de Classe completo (Fase 2 SEMED)
-- Estende a tabela diario_classe para registrar:
--  - Recursos didaticos
--  - Atividades realizadas (estrutura JSON)
--  - Observacoes individuais por aluno
--  - Vinculo com habilidades BNCC
--  - Status (rascunho/publicado/assinado)
-- ============================================================================

ALTER TABLE diario_classe
  ADD COLUMN IF NOT EXISTS recursos_didaticos TEXT,
  ADD COLUMN IF NOT EXISTS atividades        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS observacoes_individuais JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status            VARCHAR(20) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicado', 'assinado')),
  ADD COLUMN IF NOT EXISTS publicado_em      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assinado_em       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quantidade_aulas  SMALLINT DEFAULT 1;

COMMENT ON COLUMN diario_classe.atividades IS
  'Array JSON com atividades realizadas. Cada item: { tipo: string, descricao: string, duracao_min?: number }.';

COMMENT ON COLUMN diario_classe.observacoes_individuais IS
  'Objeto JSON { aluno_id: "observacao do professor sobre o aluno na aula" }.';

COMMENT ON COLUMN diario_classe.status IS
  'rascunho (editavel) | publicado (visivel responsavel) | assinado (digitalmente, imutavel).';

COMMENT ON COLUMN diario_classe.quantidade_aulas IS
  'Quantas aulas (hora-aula) foram ministradas neste registro. Default 1.';

-- Indice para listar diarios por status e turma
CREATE INDEX IF NOT EXISTS idx_diario_status_turma
  ON diario_classe(turma_id, status, data_aula DESC);

-- ----------------------------------------------------------------------------
-- Tabela junction: diario_classe <-> bncc_habilidades
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diario_classe_bncc_habilidades (
  diario_id         UUID NOT NULL REFERENCES diario_classe(id) ON DELETE CASCADE,
  habilidade_codigo VARCHAR(20) NOT NULL REFERENCES bncc_habilidades(codigo),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (diario_id, habilidade_codigo)
);

CREATE INDEX IF NOT EXISTS idx_dcbncc_habilidade ON diario_classe_bncc_habilidades(habilidade_codigo);
