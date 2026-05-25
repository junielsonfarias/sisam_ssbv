-- ============================================================================
-- MIGRATION: Biblioteca - Acervo + Emprestimos (Fase 3 SEMED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS biblioteca_acervo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn            VARCHAR(20),
  titulo          VARCHAR(500) NOT NULL,
  autor           VARCHAR(255),
  editora         VARCHAR(255),
  edicao          VARCHAR(20),
  ano_publicacao  SMALLINT,
  -- Classificacao (CDD/CDU/livre)
  classificacao   VARCHAR(50),
  categoria       VARCHAR(50) CHECK (categoria IN (
    'literatura_infantil', 'literatura_juvenil', 'literatura_adulta',
    'didatico', 'paradidatico', 'tecnico', 'referencia',
    'dicionario', 'enciclopedia', 'periodico', 'outro'
  )),
  -- Genero (romance, conto, biografia, poesia...)
  genero          VARCHAR(50),
  -- Escola dona do acervo
  escola_id       UUID REFERENCES escolas(id) ON DELETE CASCADE,
  -- Quantidade total + disponivel
  qtd_total       INTEGER NOT NULL DEFAULT 1 CHECK (qtd_total >= 0),
  qtd_disponivel  INTEGER NOT NULL DEFAULT 1 CHECK (qtd_disponivel >= 0),
  -- Localizacao fisica
  estante         VARCHAR(50),
  prateleira      VARCHAR(50),
  observacoes     TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bibl_acervo_escola ON biblioteca_acervo(escola_id);
CREATE INDEX IF NOT EXISTS idx_bibl_acervo_isbn ON biblioteca_acervo(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bibl_acervo_busca ON biblioteca_acervo USING gin(to_tsvector('portuguese', titulo || ' ' || COALESCE(autor, '')));
CREATE INDEX IF NOT EXISTS idx_bibl_acervo_disponivel ON biblioteca_acervo(qtd_disponivel) WHERE ativo = TRUE AND qtd_disponivel > 0;

-- Emprestimos (aluno ou servidor)
CREATE TABLE IF NOT EXISTS biblioteca_emprestimos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acervo_id       UUID NOT NULL REFERENCES biblioteca_acervo(id) ON DELETE CASCADE,
  -- Polimorfico: pode ser aluno OU servidor (apenas um)
  aluno_id        UUID REFERENCES alunos(id) ON DELETE CASCADE,
  servidor_id     UUID REFERENCES servidores(id) ON DELETE CASCADE,
  -- Quem registrou
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  data_emprestimo DATE NOT NULL DEFAULT CURRENT_DATE,
  data_devolucao_prevista DATE NOT NULL,
  data_devolucao_real DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'emprestado'
    CHECK (status IN ('emprestado', 'devolvido', 'atrasado', 'extraviado', 'danificado')),
  observacoes_devolucao TEXT,
  -- Renovacoes (incrementa quando renovar)
  renovacoes      SMALLINT NOT NULL DEFAULT 0,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Garante que e um aluno OU um servidor (xor)
  CHECK ((aluno_id IS NOT NULL)::int + (servidor_id IS NOT NULL)::int = 1)
);

CREATE INDEX IF NOT EXISTS idx_bibl_emp_acervo ON biblioteca_emprestimos(acervo_id);
CREATE INDEX IF NOT EXISTS idx_bibl_emp_aluno ON biblioteca_emprestimos(aluno_id) WHERE aluno_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bibl_emp_servidor ON biblioteca_emprestimos(servidor_id) WHERE servidor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bibl_emp_status ON biblioteca_emprestimos(status);

-- Reservas (fila de espera quando todas as copias estao emprestadas)
CREATE TABLE IF NOT EXISTS biblioteca_reservas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acervo_id       UUID NOT NULL REFERENCES biblioteca_acervo(id) ON DELETE CASCADE,
  aluno_id        UUID REFERENCES alunos(id) ON DELETE CASCADE,
  servidor_id     UUID REFERENCES servidores(id) ON DELETE CASCADE,
  data_reserva    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          VARCHAR(20) NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'disponivel', 'retirado', 'cancelado', 'expirado')),
  notificado_em   TIMESTAMPTZ,  -- quando avisamos que esta disponivel
  retirado_em     TIMESTAMPTZ,
  CHECK ((aluno_id IS NOT NULL)::int + (servidor_id IS NOT NULL)::int = 1)
);

CREATE INDEX IF NOT EXISTS idx_bibl_res_acervo ON biblioteca_reservas(acervo_id, status, data_reserva);

COMMENT ON TABLE biblioteca_acervo IS 'Acervo da biblioteca escolar.';
COMMENT ON TABLE biblioteca_emprestimos IS 'Emprestimos de livros para alunos e servidores.';
COMMENT ON TABLE biblioteca_reservas IS 'Fila de reservas quando o livro nao tem copia disponivel.';
