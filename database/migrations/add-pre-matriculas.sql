BEGIN;
CREATE TABLE IF NOT EXISTS pre_matriculas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocolo VARCHAR(20) NOT NULL UNIQUE,
  -- Dados do aluno
  aluno_nome VARCHAR(255) NOT NULL,
  aluno_data_nascimento DATE NOT NULL,
  aluno_cpf VARCHAR(14),
  aluno_genero VARCHAR(20),
  aluno_pcd BOOLEAN DEFAULT false,
  -- Dados do responsável
  responsavel_nome VARCHAR(255) NOT NULL,
  responsavel_cpf VARCHAR(14),
  responsavel_telefone VARCHAR(20) NOT NULL,
  responsavel_email VARCHAR(255),
  parentesco VARCHAR(30),
  -- Endereço
  endereco TEXT,
  bairro VARCHAR(100),
  -- Escola/Série pretendida
  escola_pretendida_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
  serie_pretendida VARCHAR(50) NOT NULL,
  ano_letivo VARCHAR(10) NOT NULL,
  -- Status
  status VARCHAR(20) DEFAULT 'pendente',
  motivo_rejeicao TEXT,
  analisado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  analisado_em TIMESTAMP,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pre_mat_protocolo ON pre_matriculas(protocolo);
CREATE INDEX IF NOT EXISTS idx_pre_mat_status ON pre_matriculas(status);
CREATE INDEX IF NOT EXISTS idx_pre_mat_escola ON pre_matriculas(escola_pretendida_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_pre_mat_data ON pre_matriculas(criado_em DESC);
COMMIT;
