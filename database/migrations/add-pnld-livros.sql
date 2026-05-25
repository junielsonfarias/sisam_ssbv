-- ============================================================================
-- MIGRATION: PNLD - Programa Nacional do Livro e Material Didatico (Fase 3)
-- Base legal: Decreto 9.099/2017
-- ============================================================================

-- Catalogo de titulos PNLD
CREATE TABLE IF NOT EXISTS pnld_titulos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn            VARCHAR(20),
  -- Codigo PNLD (do programa)
  codigo_pnld     VARCHAR(20),
  titulo          VARCHAR(500) NOT NULL,
  autor           VARCHAR(255),
  editora         VARCHAR(255),
  edicao          VARCHAR(20),
  ano_pnld        SMALLINT NOT NULL,  -- ano do programa PNLD (ex: 2024)
  -- Componente curricular alvo (relacionado a BNCC se possivel)
  componente_id   VARCHAR(30) REFERENCES bncc_componentes_curriculares(id),
  -- Serie/ano alvo
  ano_escolar     SMALLINT,
  -- Tipo de obra
  tipo_obra       VARCHAR(30) NOT NULL CHECK (tipo_obra IN (
    'livro_aluno', 'manual_professor', 'caderno_atividades',
    'literatura', 'dicionario', 'paradidatico', 'outro'
  )),
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnld_tit_isbn ON pnld_titulos(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pnld_tit_componente ON pnld_titulos(componente_id, ano_escolar);
CREATE INDEX IF NOT EXISTS idx_pnld_tit_busca ON pnld_titulos USING gin(to_tsvector('portuguese', titulo));

-- Estoque por escola (quantidade total disponivel)
CREATE TABLE IF NOT EXISTS pnld_estoque_escola (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  titulo_id       UUID NOT NULL REFERENCES pnld_titulos(id) ON DELETE CASCADE,
  -- Quantidades por estado
  qtd_total       INTEGER NOT NULL DEFAULT 0,
  qtd_disponivel  INTEGER NOT NULL DEFAULT 0,
  qtd_emprestada  INTEGER NOT NULL DEFAULT 0,
  qtd_danificada  INTEGER NOT NULL DEFAULT 0,
  qtd_extraviada  INTEGER NOT NULL DEFAULT 0,
  ano_letivo      VARCHAR(4) NOT NULL,
  observacoes     TEXT,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (escola_id, titulo_id, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_pnld_est_escola ON pnld_estoque_escola(escola_id, ano_letivo);

-- Distribuicao individual (aluno recebeu livro)
CREATE TABLE IF NOT EXISTS pnld_distribuicao_aluno (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  titulo_id       UUID NOT NULL REFERENCES pnld_titulos(id) ON DELETE CASCADE,
  ano_letivo      VARCHAR(4) NOT NULL,
  -- Identificacao fisica (numero patrimonial/tombamento do livro especifico)
  numero_tombamento VARCHAR(50),
  data_entrega    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_devolucao_prevista DATE,
  data_devolucao_real DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'emprestado'
    CHECK (status IN ('emprestado', 'devolvido', 'extraviado', 'danificado')),
  observacoes_devolucao TEXT,
  -- Quem registrou
  entregue_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  recebido_por    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnld_dist_aluno ON pnld_distribuicao_aluno(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pnld_dist_titulo ON pnld_distribuicao_aluno(titulo_id);
CREATE INDEX IF NOT EXISTS idx_pnld_dist_status ON pnld_distribuicao_aluno(status);
CREATE INDEX IF NOT EXISTS idx_pnld_dist_ano ON pnld_distribuicao_aluno(ano_letivo);

COMMENT ON TABLE pnld_titulos IS 'Catalogo de obras do PNLD por ano do programa.';
COMMENT ON TABLE pnld_estoque_escola IS 'Estoque de cada titulo PNLD por escola e ano letivo.';
COMMENT ON TABLE pnld_distribuicao_aluno IS 'Distribuicao individual: qual aluno recebeu qual livro especifico.';
