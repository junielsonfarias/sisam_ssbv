-- ============================================================================
-- MIGRATION: PNATE - Programa Nacional de Apoio ao Transporte Escolar (Fase 3)
-- Base legal: Lei 10.880/2004, alterada pela Lei 11.947/2009
-- ============================================================================

-- Veiculos do transporte escolar
BEGIN;

CREATE TABLE IF NOT EXISTS pnate_veiculos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa             VARCHAR(10) UNIQUE NOT NULL,
  -- Tipo conforme DENATRAN
  tipo              VARCHAR(30) NOT NULL CHECK (tipo IN (
    'onibus', 'micro_onibus', 'van', 'kombi', 'lancha', 'barco', 'outro'
  )),
  marca             VARCHAR(50),
  modelo            VARCHAR(100),
  ano_fabricacao    SMALLINT,
  capacidade        SMALLINT NOT NULL,
  -- Combustivel
  combustivel       VARCHAR(20),
  -- Vinculo: proprio do municipio, terceirizado, conveniado
  vinculo           VARCHAR(20) NOT NULL DEFAULT 'proprio'
    CHECK (vinculo IN ('proprio', 'terceirizado', 'conveniado')),
  empresa_terceirizada VARCHAR(255),
  -- Vistoria veicular obrigatoria
  vistoria_data     DATE,
  vistoria_validade DATE,
  -- Acessibilidade
  acessivel_pcd     BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes       TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnate_veic_ativo ON pnate_veiculos(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_pnate_veic_vistoria ON pnate_veiculos(vistoria_validade) WHERE ativo = TRUE;

-- Motoristas / Condutores
CREATE TABLE IF NOT EXISTS pnate_motoristas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(255) NOT NULL,
  cpf             VARCHAR(14) UNIQUE NOT NULL,
  cnh_numero      VARCHAR(20) NOT NULL,
  cnh_categoria   VARCHAR(5) NOT NULL,
  cnh_validade    DATE NOT NULL,
  -- Curso transporte coletivo escolar e obrigatorio (Resolucao CONTRAN 789/2020)
  curso_escolar_validade DATE,
  telefone        VARCHAR(20),
  vinculo         VARCHAR(20) NOT NULL DEFAULT 'concursado'
    CHECK (vinculo IN ('concursado', 'contrato', 'terceirizado', 'rpa')),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnate_mot_cnh_validade ON pnate_motoristas(cnh_validade) WHERE ativo = TRUE;

-- Rotas (origem -> destino com paradas intermediarias)
CREATE TABLE IF NOT EXISTS pnate_rotas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          VARCHAR(20) UNIQUE NOT NULL,
  descricao       VARCHAR(255) NOT NULL,
  -- Escolas atendidas (uma rota pode passar por mais de uma escola)
  escolas_ids     UUID[] NOT NULL DEFAULT '{}',
  -- Veiculo principal e motorista principal
  veiculo_id      UUID REFERENCES pnate_veiculos(id) ON DELETE SET NULL,
  motorista_id    UUID REFERENCES pnate_motoristas(id) ON DELETE SET NULL,
  -- Turno
  turno           VARCHAR(20) CHECK (turno IN ('matutino', 'vespertino', 'noturno', 'integral')),
  -- Distancia total estimada (km)
  distancia_km    NUMERIC(6,2),
  -- Horario inicio/fim (HH:MM)
  hora_inicio     TIME,
  hora_fim        TIME,
  ativa           BOOLEAN NOT NULL DEFAULT TRUE,
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnate_rotas_ativa ON pnate_rotas(ativa) WHERE ativa = TRUE;

-- Paradas da rota (ordem importa)
CREATE TABLE IF NOT EXISTS pnate_paradas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id         UUID NOT NULL REFERENCES pnate_rotas(id) ON DELETE CASCADE,
  ordem           SMALLINT NOT NULL,
  endereco        VARCHAR(500) NOT NULL,
  ponto_referencia VARCHAR(255),
  -- Coordenadas opcionais
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  hora_estimada   TIME,
  UNIQUE (rota_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_pnate_par_rota ON pnate_paradas(rota_id, ordem);

-- Vinculo aluno <-> rota
CREATE TABLE IF NOT EXISTS pnate_alunos_rotas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  rota_id         UUID NOT NULL REFERENCES pnate_rotas(id) ON DELETE CASCADE,
  parada_id       UUID REFERENCES pnate_paradas(id) ON DELETE SET NULL,
  -- Tipo de uso: ida apenas, volta apenas, ida e volta
  tipo_uso        VARCHAR(20) NOT NULL DEFAULT 'ida_volta'
    CHECK (tipo_uso IN ('ida', 'volta', 'ida_volta')),
  vigencia_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim    DATE,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, rota_id, vigencia_inicio)
);

CREATE INDEX IF NOT EXISTS idx_pnate_alunorota_aluno ON pnate_alunos_rotas(aluno_id) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_pnate_alunorota_rota ON pnate_alunos_rotas(rota_id) WHERE ativo = TRUE;

COMMENT ON TABLE pnate_veiculos IS 'Frota do transporte escolar municipal (PNATE).';
COMMENT ON TABLE pnate_motoristas IS 'Condutores autorizados a operar transporte escolar (Resolucao CONTRAN 789/2020).';
COMMENT ON TABLE pnate_rotas IS 'Rotas de transporte escolar com paradas ordenadas.';

COMMIT;
