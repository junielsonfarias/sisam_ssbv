-- ============================================================================
-- MIGRATION: RH Escolar - Servidores + Lotacao + Formacao (Fase 3 SEMED)
-- Versao basica: sem ponto eletronico e sem folha de pagamento
-- ============================================================================

-- Servidores (concursados, contratados, terceirizados)
CREATE TABLE IF NOT EXISTS servidores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Matricula funcional municipal (unica)
  matricula_funcional VARCHAR(20) UNIQUE,
  cpf             VARCHAR(11) UNIQUE NOT NULL,
  nome            VARCHAR(255) NOT NULL,
  data_nascimento DATE,
  sexo            VARCHAR(1) CHECK (sexo IN ('M', 'F')),
  -- Documentos
  rg              VARCHAR(20),
  pis             VARCHAR(11),
  -- Contato
  email           VARCHAR(254),
  telefone        VARCHAR(20),
  endereco        VARCHAR(500),
  -- Vinculo
  tipo_vinculo    VARCHAR(30) NOT NULL CHECK (tipo_vinculo IN (
    'concursado_efetivo', 'concursado_estavel',
    'contrato_temporario', 'comissionado', 'cedido',
    'terceirizado', 'estagiario', 'rpa'
  )),
  data_admissao   DATE NOT NULL,
  data_demissao   DATE,
  -- Cargo principal (string livre - pode evoluir para tabela de cargos)
  cargo           VARCHAR(255),
  -- Formacao academica resumida
  formacao_maxima VARCHAR(50) CHECK (formacao_maxima IN (
    'fundamental_incompleto', 'fundamental_completo',
    'medio_incompleto', 'medio_completo',
    'medio_normal_magisterio', 'superior_incompleto',
    'superior_completo_licenciatura', 'superior_completo_bacharelado',
    'especializacao', 'mestrado', 'doutorado'
  )),
  area_formacao   VARCHAR(255),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  -- Vinculo opcional com usuario do sistema (se servidor logar)
  usuario_id      UUID UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servidores_ativo ON servidores(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_servidores_vinculo ON servidores(tipo_vinculo);
CREATE INDEX IF NOT EXISTS idx_servidores_nome ON servidores USING gin(to_tsvector('portuguese', nome));

-- Lotacao do servidor (vinculo escola + funcao + carga horaria)
CREATE TABLE IF NOT EXISTS servidor_lotacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id     UUID NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  escola_id       UUID REFERENCES escolas(id) ON DELETE CASCADE,
  -- escola_id NULL = lotacao SEMED (sede)
  funcao          VARCHAR(100) NOT NULL,
  -- Exemplos: 'Professor Anos Iniciais', 'Diretor', 'Coordenador Pedagogico',
  -- 'Secretario Escolar', 'Merendeira', 'ASG', 'Vigia', 'Motorista Transporte'
  carga_horaria_semanal SMALLINT NOT NULL CHECK (carga_horaria_semanal > 0 AND carga_horaria_semanal <= 60),
  turno           VARCHAR(20) CHECK (turno IN ('matutino', 'vespertino', 'noturno', 'integral')),
  vigencia_inicio DATE NOT NULL,
  vigencia_fim    DATE,
  -- Vinculo principal? (servidor pode ter 2 vinculos por lei)
  e_principal     BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lotacoes_servidor ON servidor_lotacoes(servidor_id);
CREATE INDEX IF NOT EXISTS idx_lotacoes_escola ON servidor_lotacoes(escola_id);
-- Indice apenas para lotacoes em aberto. Comparacao com CURRENT_DATE nao funciona
-- em indice parcial (precisa IMMUTABLE). Para filtrar vigentes em runtime,
-- use: WHERE vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE
CREATE INDEX IF NOT EXISTS idx_lotacoes_em_aberto
  ON servidor_lotacoes(servidor_id) WHERE vigencia_fim IS NULL;

-- Formacao continuada (cursos, capacitacoes, certificados)
CREATE TABLE IF NOT EXISTS servidor_formacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id     UUID NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
  nome_curso      VARCHAR(500) NOT NULL,
  instituicao     VARCHAR(255),
  modalidade      VARCHAR(20) CHECK (modalidade IN ('presencial', 'ead', 'hibrida')),
  carga_horaria   INTEGER NOT NULL CHECK (carga_horaria > 0),
  data_inicio     DATE,
  data_conclusao  DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'concluido'
    CHECK (status IN ('inscrito', 'em_andamento', 'concluido', 'desistente', 'reprovado')),
  certificado_url VARCHAR(500),
  -- Categoria do curso (para relatorios)
  categoria       VARCHAR(50),
  -- ex: 'bncc', 'alfabetizacao', 'inclusao', 'gestao', 'tecnologia', 'lideranca'
  observacoes     TEXT,
  registrado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_formacoes_servidor ON servidor_formacoes(servidor_id);
CREATE INDEX IF NOT EXISTS idx_formacoes_categoria ON servidor_formacoes(categoria);

COMMENT ON TABLE servidores IS 'Servidores publicos lotados na rede municipal de ensino.';
COMMENT ON TABLE servidor_lotacoes IS 'Lotacao do servidor (escola/SEMED + funcao + carga horaria + vigencia).';
COMMENT ON TABLE servidor_formacoes IS 'Formacao continuada do servidor (cursos, capacitacoes, certificados).';
