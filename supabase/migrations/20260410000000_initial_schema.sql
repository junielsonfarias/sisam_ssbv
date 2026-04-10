-- ============================================================================
-- SISAM - Sistema de Avaliacao Municipal
-- Migracao inicial completa do schema
-- Data: 2026-04-10
-- ============================================================================
-- Este arquivo contem TODO o schema do banco PostgreSQL do SISAM:
-- - 55 tabelas com todas as colunas, constraints e foreign keys
-- - Functions e triggers customizados
-- - Indices de performance
-- - Materialized view
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSOES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- FUNCOES UTILITARIAS (devem existir antes dos triggers)
-- ============================================================================

-- Funcao generica para atualizar coluna atualizado_em
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Funcao para atualizar timestamp de anos_letivos
CREATE OR REPLACE FUNCTION atualizar_timestamp_anos_letivos()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Funcao para atualizar timestamp de fila_espera
CREATE OR REPLACE FUNCTION atualizar_timestamp_fila_espera()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Funcao para atualizar timestamp de notificacoes
CREATE OR REPLACE FUNCTION atualizar_timestamp_notificacoes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Funcao para atualizar timestamp de professor_turmas
CREATE OR REPLACE FUNCTION update_professor_turmas_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Funcao para atualizar timestamp de escola_regras_avaliacao
CREATE OR REPLACE FUNCTION trigger_update_escola_regras_avaliacao_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Funcao para sincronizar serie_numero a partir de serie
CREATE OR REPLACE FUNCTION fn_sync_serie_numero()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.serie IS NOT NULL THEN
    NEW.serie_numero := REGEXP_REPLACE(NEW.serie::text, '[^0-9]', '', 'g');
  ELSE
    NEW.serie_numero := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Funcao para calcular media do aluno nos resultados consolidados
CREATE OR REPLACE FUNCTION calcular_media_aluno()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_serie_numero TEXT;
  v_soma NUMERIC := 0;
  v_count INTEGER := 0;
BEGIN
  v_serie_numero := REGEXP_REPLACE(NEW.serie::TEXT, '[^0-9]', '', 'g');

  IF v_serie_numero IN ('2', '3', '5') THEN
    IF COALESCE(NEW.nota_lp, 0) > 0 THEN v_soma := v_soma + NEW.nota_lp; v_count := v_count + 1; END IF;
    IF COALESCE(NEW.nota_mat, 0) > 0 THEN v_soma := v_soma + NEW.nota_mat; v_count := v_count + 1; END IF;
    IF COALESCE(NEW.nota_producao, 0) > 0 THEN v_soma := v_soma + NEW.nota_producao; v_count := v_count + 1; END IF;
  ELSE
    IF COALESCE(NEW.nota_lp, 0) > 0 THEN v_soma := v_soma + NEW.nota_lp; v_count := v_count + 1; END IF;
    IF COALESCE(NEW.nota_ch, 0) > 0 THEN v_soma := v_soma + NEW.nota_ch; v_count := v_count + 1; END IF;
    IF COALESCE(NEW.nota_mat, 0) > 0 THEN v_soma := v_soma + NEW.nota_mat; v_count := v_count + 1; END IF;
    IF COALESCE(NEW.nota_cn, 0) > 0 THEN v_soma := v_soma + NEW.nota_cn; v_count := v_count + 1; END IF;
  END IF;

  IF v_count > 0 THEN
    NEW.media_aluno := ROUND(v_soma / v_count, 2);
  ELSE
    NEW.media_aluno := NULL;
  END IF;

  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

-- Funcao para calcular nivel de aprendizagem a partir da media
CREATE OR REPLACE FUNCTION calcular_nivel_aprendizagem(p_media numeric, p_serie varchar DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_nivel_id UUID;
BEGIN
  SELECT id INTO v_nivel_id
  FROM niveis_aprendizagem
  WHERE p_media >= nota_minima
    AND p_media <= nota_maxima
    AND ativo = true
    AND (serie_aplicavel IS NULL OR serie_aplicavel = p_serie)
  ORDER BY ordem DESC
  LIMIT 1;
  RETURN v_nivel_id;
END;
$$;

-- Funcao para obter configuracao de uma serie
CREATE OR REPLACE FUNCTION obter_config_serie(p_serie varchar)
RETURNS TABLE(
  serie varchar,
  nome_serie varchar,
  qtd_questoes_lp integer,
  qtd_questoes_mat integer,
  qtd_questoes_ch integer,
  qtd_questoes_cn integer,
  total_questoes_objetivas integer,
  tem_producao_textual boolean,
  qtd_itens_producao integer,
  avalia_lp boolean,
  avalia_mat boolean,
  avalia_ch boolean,
  avalia_cn boolean,
  usa_nivel_aprendizagem boolean
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT cs.serie, cs.nome_serie, cs.qtd_questoes_lp, cs.qtd_questoes_mat,
         cs.qtd_questoes_ch, cs.qtd_questoes_cn, cs.total_questoes_objetivas,
         cs.tem_producao_textual, cs.qtd_itens_producao, cs.avalia_lp,
         cs.avalia_mat, cs.avalia_ch, cs.avalia_cn, cs.usa_nivel_aprendizagem
  FROM configuracao_series cs
  WHERE cs.serie = REGEXP_REPLACE(p_serie, '[^0-9]', '', 'g')
     OR cs.serie = p_serie
  LIMIT 1;
END;
$$;

-- Funcao para normalizar nome de escola
CREATE OR REPLACE FUNCTION normalizar_nome_escola(nome varchar)
RETURNS varchar LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(nome, '\s+', ' ', 'g'), '\.', '', 'g')));
END;
$$;

-- Funcao para limpar historico de divergencias com mais de 30 dias
CREATE OR REPLACE FUNCTION limpar_historico_divergencias()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  registros_removidos INTEGER;
BEGIN
  DELETE FROM divergencias_historico WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS registros_removidos = ROW_COUNT;
  RETURN registros_removidos;
END;
$$;

-- ============================================================================
-- TABELA 1: polos
-- ============================================================================

CREATE TABLE IF NOT EXISTS polos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar(255) NOT NULL,
  codigo varchar(50) UNIQUE,
  descricao text,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 2: escolas
-- ============================================================================

CREATE TABLE IF NOT EXISTS escolas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar(255) NOT NULL,
  codigo varchar(50) UNIQUE,
  polo_id uuid NOT NULL REFERENCES polos(id),
  endereco text,
  telefone varchar(50),
  email varchar(255),
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  codigo_inep varchar(8),
  situacao_funcionamento varchar(20) DEFAULT 'ativa',
  dependencia_administrativa varchar(20) DEFAULT 'municipal',
  categoria_escola varchar(30) DEFAULT 'nao_se_aplica',
  localizacao varchar(10) DEFAULT 'urbana',
  localizacao_diferenciada varchar(30) DEFAULT 'nenhuma',
  tipo_atendimento_escolarizacao varchar(20) DEFAULT 'presencial',
  etapas_ensino text[] DEFAULT '{}',
  modalidade_ensino varchar(20) DEFAULT 'regular',
  agua_potavel boolean DEFAULT false,
  energia_eletrica boolean DEFAULT false,
  esgoto_sanitario boolean DEFAULT false,
  coleta_lixo boolean DEFAULT false,
  internet boolean DEFAULT false,
  banda_larga boolean DEFAULT false,
  quadra_esportiva boolean DEFAULT false,
  biblioteca boolean DEFAULT false,
  laboratorio_informatica boolean DEFAULT false,
  laboratorio_ciencias boolean DEFAULT false,
  acessibilidade_deficiente boolean DEFAULT false,
  alimentacao_escolar boolean DEFAULT false,
  latitude numeric(10,7),
  longitude numeric(10,7),
  cep varchar(10),
  bairro varchar(100),
  municipio varchar(100) DEFAULT 'Sao Sebastiao da Boa Vista',
  uf varchar(2) DEFAULT 'PA',
  distrito varchar(100),
  complemento text,
  telefone_ddd varchar(3),
  telefone_numero varchar(15),
  cnpj_mantenedora varchar(18),
  data_criacao date,
  gestor_escolar_habilitado boolean DEFAULT false
);

-- ============================================================================
-- TABELA 3: usuarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  senha varchar(255) NOT NULL,
  tipo_usuario varchar(20) NOT NULL,
  polo_id uuid REFERENCES polos(id),
  escola_id uuid REFERENCES escolas(id),
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  auth_uid uuid,
  cpf varchar(14),
  telefone varchar(20)
);

-- Indice unico parcial para CPF (permite NULL e vazios)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf_unique
  ON usuarios(cpf) WHERE cpf IS NOT NULL AND cpf <> '';

-- ============================================================================
-- TABELA 4: tipos_avaliacao
-- ============================================================================

CREATE TABLE IF NOT EXISTS tipos_avaliacao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo varchar(30) NOT NULL UNIQUE,
  nome varchar(100) NOT NULL,
  descricao text,
  tipo_resultado varchar(20) NOT NULL,
  escala_conceitos jsonb,
  nota_minima numeric(5,2) DEFAULT 0,
  nota_maxima numeric(5,2) DEFAULT 10,
  permite_decimal boolean DEFAULT true,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 5: regras_avaliacao
-- ============================================================================

CREATE TABLE IF NOT EXISTS regras_avaliacao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar(150) NOT NULL,
  descricao text,
  tipo_avaliacao_id uuid NOT NULL REFERENCES tipos_avaliacao(id),
  tipo_periodo varchar(20) NOT NULL DEFAULT 'bimestral',
  qtd_periodos integer NOT NULL DEFAULT 4,
  media_aprovacao numeric(5,2) DEFAULT 6.00,
  media_recuperacao numeric(5,2) DEFAULT 5.00,
  nota_maxima numeric(5,2) DEFAULT 10.00,
  permite_recuperacao boolean DEFAULT true,
  recuperacao_por_periodo boolean DEFAULT false,
  max_dependencias integer DEFAULT 0,
  formula_media varchar(30) DEFAULT 'media_aritmetica',
  pesos_periodos jsonb,
  arredondamento varchar(10) DEFAULT 'normal',
  casas_decimais integer DEFAULT 1,
  aprovacao_automatica boolean DEFAULT false,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 6: series_escolares
-- ============================================================================

CREATE TABLE IF NOT EXISTS series_escolares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo varchar(20) NOT NULL UNIQUE,
  nome varchar(100) NOT NULL,
  etapa varchar(30) NOT NULL,
  ordem integer NOT NULL,
  media_aprovacao numeric(5,2) DEFAULT 6.00,
  media_recuperacao numeric(5,2) DEFAULT 5.00,
  nota_maxima numeric(5,2) DEFAULT 10.00,
  max_dependencias integer DEFAULT 0,
  formula_nota_final varchar(20) DEFAULT 'media_aritmetica',
  permite_recuperacao boolean DEFAULT true,
  idade_minima integer,
  idade_maxima integer,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  tipo_avaliacao_id uuid REFERENCES tipos_avaliacao(id),
  regra_avaliacao_id uuid REFERENCES regras_avaliacao(id)
);

-- ============================================================================
-- TABELA 7: disciplinas_escolares
-- ============================================================================

CREATE TABLE IF NOT EXISTS disciplinas_escolares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar(255) NOT NULL,
  codigo varchar(50) UNIQUE,
  abreviacao varchar(20),
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 8: turmas
-- ============================================================================

CREATE TABLE IF NOT EXISTS turmas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo varchar(50) NOT NULL,
  nome varchar(255),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  serie varchar(50),
  ano_letivo varchar(10) NOT NULL,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  capacidade_maxima integer DEFAULT 35,
  multiserie boolean DEFAULT false,
  multietapa boolean DEFAULT false,
  turno varchar(20),
  tipo_atendimento varchar(30) DEFAULT 'escolarizacao',
  modalidade varchar(20) DEFAULT 'regular',
  etapa_ensino varchar(50),
  tipo_mediacao varchar(20) DEFAULT 'presencial',
  hora_inicio time,
  hora_fim time,
  serie_numero varchar(10),
  UNIQUE(escola_id, codigo, ano_letivo)
);

-- ============================================================================
-- TABELA 9: alunos
-- ============================================================================

CREATE TABLE IF NOT EXISTS alunos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo varchar(100) UNIQUE,
  nome varchar(255) NOT NULL,
  escola_id uuid NOT NULL REFERENCES escolas(id),
  turma_id uuid REFERENCES turmas(id),
  serie varchar(50),
  ano_letivo varchar(10),
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  cpf varchar(14),
  data_nascimento date,
  pcd boolean DEFAULT false,
  situacao varchar(20) DEFAULT 'cursando',
  data_matricula date,
  nome_mae varchar(255),
  nome_pai varchar(255),
  responsavel varchar(255),
  telefone_responsavel varchar(20),
  genero varchar(20),
  raca_cor varchar(30),
  naturalidade varchar(100),
  nacionalidade varchar(100) DEFAULT 'Brasileira',
  rg varchar(20),
  certidao_nascimento varchar(50),
  sus varchar(20),
  endereco text,
  bairro varchar(100),
  cidade varchar(100),
  cep varchar(10),
  bolsa_familia boolean DEFAULT false,
  nis varchar(20),
  projeto_contraturno boolean DEFAULT false,
  projeto_nome varchar(255),
  tipo_deficiencia varchar(255),
  alergia text,
  medicacao text,
  observacoes text,
  codigo_inep_aluno varchar(12),
  zona_residencia varchar(10),
  utiliza_transporte_publico boolean DEFAULT false,
  tipo_transporte varchar(30),
  serie_numero varchar(10)
);

-- Indices unicos parciais para alunos
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_cpf_unique
  ON alunos(cpf) WHERE cpf IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_inep_unique
  ON alunos(codigo_inep_aluno) WHERE codigo_inep_aluno IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_nome_escola_ano_unique
  ON alunos(UPPER(TRIM(nome)), escola_id, ano_letivo);

-- ============================================================================
-- TABELA 10: anos_letivos
-- ============================================================================

CREATE TABLE IF NOT EXISTS anos_letivos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano varchar(4) NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'planejamento',
  data_inicio date,
  data_fim date,
  dias_letivos_total integer DEFAULT 200,
  observacao text,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 11: periodos_letivos
-- ============================================================================

CREATE TABLE IF NOT EXISTS periodos_letivos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar(255) NOT NULL,
  tipo varchar(20) NOT NULL,
  numero integer NOT NULL,
  ano_letivo varchar(10) NOT NULL,
  data_inicio date,
  data_fim date,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  dias_letivos integer DEFAULT 50,
  UNIQUE(tipo, numero, ano_letivo)
);

-- ============================================================================
-- TABELA 12: avaliacoes
-- ============================================================================

CREATE TABLE IF NOT EXISTS avaliacoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar(255) NOT NULL,
  descricao text,
  ano_letivo varchar(10) NOT NULL,
  tipo varchar(20) NOT NULL,
  ordem integer NOT NULL DEFAULT 1,
  data_inicio date,
  data_fim date,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ano_letivo, tipo)
);

-- ============================================================================
-- TABELA 13: configuracao_series
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracao_series (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  serie varchar(50) NOT NULL UNIQUE,
  nome_serie varchar(100) NOT NULL,
  qtd_questoes_lp integer DEFAULT 0,
  qtd_questoes_mat integer DEFAULT 0,
  qtd_questoes_ch integer DEFAULT 0,
  qtd_questoes_cn integer DEFAULT 0,
  total_questoes_objetivas integer,
  tem_producao_textual boolean DEFAULT false,
  qtd_itens_producao integer DEFAULT 0,
  avalia_lp boolean DEFAULT true,
  avalia_mat boolean DEFAULT true,
  avalia_ch boolean DEFAULT false,
  avalia_cn boolean DEFAULT false,
  peso_lp numeric(3,2) DEFAULT 1.00,
  peso_mat numeric(3,2) DEFAULT 1.00,
  peso_ch numeric(3,2) DEFAULT 1.00,
  peso_cn numeric(3,2) DEFAULT 1.00,
  peso_producao numeric(3,2) DEFAULT 1.00,
  usa_nivel_aprendizagem boolean DEFAULT false,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  tipo_ensino varchar(20) DEFAULT 'anos_iniciais',
  media_aprovacao numeric(5,2) DEFAULT 6.00,
  media_recuperacao numeric(5,2) DEFAULT 5.00,
  nota_maxima numeric(5,2) DEFAULT 10.00,
  max_dependencias integer DEFAULT 0,
  formula_nota_final varchar(20) DEFAULT 'media_aritmetica'
);

-- ============================================================================
-- TABELA 14: configuracao_series_disciplinas
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracao_series_disciplinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serie_id uuid NOT NULL REFERENCES configuracao_series(id),
  disciplina varchar(100) NOT NULL,
  sigla varchar(10) NOT NULL,
  ordem integer NOT NULL DEFAULT 1,
  questao_inicio integer NOT NULL,
  questao_fim integer NOT NULL,
  qtd_questoes integer NOT NULL,
  valor_questao numeric(5,2) DEFAULT 0.50,
  nota_maxima numeric(5,2) DEFAULT 10.00,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(serie_id, sigla),
  UNIQUE(serie_id, ordem)
);

-- ============================================================================
-- TABELA 15: configuracao_notas_escola
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuracao_notas_escola (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  ano_letivo varchar(10) NOT NULL,
  tipo_periodo varchar(20) NOT NULL DEFAULT 'bimestre',
  nota_maxima numeric(5,2) NOT NULL DEFAULT 10.00,
  media_aprovacao numeric(5,2) NOT NULL DEFAULT 6.00,
  media_recuperacao numeric(5,2) NOT NULL DEFAULT 5.00,
  peso_avaliacao numeric(3,2) NOT NULL DEFAULT 0.60,
  peso_recuperacao numeric(3,2) NOT NULL DEFAULT 0.40,
  permite_recuperacao boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  ativo boolean NOT NULL DEFAULT true,
  UNIQUE(escola_id, ano_letivo)
);

-- ============================================================================
-- TABELA 16: escola_regras_avaliacao
-- ============================================================================

CREATE TABLE IF NOT EXISTS escola_regras_avaliacao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  serie_escolar_id uuid NOT NULL REFERENCES series_escolares(id),
  tipo_avaliacao_id uuid REFERENCES tipos_avaliacao(id),
  regra_avaliacao_id uuid REFERENCES regras_avaliacao(id),
  media_aprovacao numeric(5,2),
  media_recuperacao numeric(5,2),
  nota_maxima numeric(5,2),
  permite_recuperacao boolean,
  observacao text,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(escola_id, serie_escolar_id)
);

-- ============================================================================
-- TABELA 17: series_escola
-- ============================================================================

CREATE TABLE IF NOT EXISTS series_escola (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  serie varchar(50) NOT NULL,
  ano_letivo varchar(10) NOT NULL,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(escola_id, serie, ano_letivo)
);

-- ============================================================================
-- TABELA 18: series_disciplinas
-- ============================================================================

CREATE TABLE IF NOT EXISTS series_disciplinas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  serie_id uuid NOT NULL REFERENCES series_escolares(id),
  disciplina_id uuid NOT NULL REFERENCES disciplinas_escolares(id),
  obrigatoria boolean DEFAULT true,
  carga_horaria_semanal integer DEFAULT 4,
  ativo boolean DEFAULT true,
  UNIQUE(serie_id, disciplina_id)
);

-- ============================================================================
-- TABELA 19: notas_escolares
-- ============================================================================

CREATE TABLE IF NOT EXISTS notas_escolares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL REFERENCES alunos(id),
  disciplina_id uuid NOT NULL REFERENCES disciplinas_escolares(id),
  periodo_id uuid NOT NULL REFERENCES periodos_letivos(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  ano_letivo varchar(10) NOT NULL,
  nota numeric(5,2),
  nota_recuperacao numeric(5,2),
  nota_final numeric(5,2),
  faltas integer DEFAULT 0,
  observacao text,
  registrado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  turma_id uuid REFERENCES turmas(id),
  parecer_descritivo text,
  conceito varchar(5),
  tipo_avaliacao_id uuid REFERENCES tipos_avaliacao(id),
  UNIQUE(aluno_id, disciplina_id, periodo_id)
);

-- ============================================================================
-- TABELA 20: frequencia_bimestral
-- ============================================================================

CREATE TABLE IF NOT EXISTS frequencia_bimestral (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL REFERENCES alunos(id),
  periodo_id uuid NOT NULL REFERENCES periodos_letivos(id),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  ano_letivo varchar(10) NOT NULL,
  dias_letivos integer NOT NULL DEFAULT 0,
  presencas integer NOT NULL DEFAULT 0,
  faltas integer NOT NULL DEFAULT 0,
  faltas_justificadas integer NOT NULL DEFAULT 0,
  percentual_frequencia numeric(5,2),
  observacao text,
  registrado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  metodo varchar(20) DEFAULT 'manual',
  UNIQUE(aluno_id, periodo_id)
);

-- ============================================================================
-- TABELA 21: frequencia_diaria (referencia dispositivos_faciais, criada depois)
-- ============================================================================

-- Nota: dispositivos_faciais sera criada antes deste ponto via reordenacao
-- A FK para dispositivos_faciais sera adicionada apos a criacao dessa tabela

CREATE TABLE IF NOT EXISTS dispositivos_faciais (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  nome varchar(255) NOT NULL,
  localizacao varchar(255),
  api_key_hash varchar(255) NOT NULL,
  api_key_prefix varchar(8) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ativo',
  ultimo_ping timestamp,
  metadata jsonb DEFAULT '{}',
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(escola_id, nome)
);

CREATE TABLE IF NOT EXISTS frequencia_diaria (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL REFERENCES alunos(id),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  data date NOT NULL,
  hora_entrada time,
  hora_saida time,
  metodo varchar(20) NOT NULL DEFAULT 'manual',
  dispositivo_id uuid REFERENCES dispositivos_faciais(id),
  confianca numeric(5,4),
  registrado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  status varchar(20) NOT NULL DEFAULT 'presente',
  justificativa text,
  UNIQUE(aluno_id, data)
);

-- ============================================================================
-- TABELA 22: frequencia_hora_aula
-- ============================================================================

CREATE TABLE IF NOT EXISTS frequencia_hora_aula (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL REFERENCES alunos(id),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  data date NOT NULL,
  numero_aula integer NOT NULL,
  disciplina_id uuid NOT NULL REFERENCES disciplinas_escolares(id),
  presente boolean NOT NULL DEFAULT true,
  metodo varchar(20) NOT NULL DEFAULT 'manual',
  registrado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aluno_id, data, numero_aula)
);

-- ============================================================================
-- TABELA 23: horarios_aula
-- ============================================================================

CREATE TABLE IF NOT EXISTS horarios_aula (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  dia_semana integer NOT NULL,
  numero_aula integer NOT NULL,
  disciplina_id uuid NOT NULL REFERENCES disciplinas_escolares(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(turma_id, dia_semana, numero_aula)
);

-- ============================================================================
-- TABELA 24: professor_turmas
-- ============================================================================

CREATE TABLE IF NOT EXISTS professor_turmas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id uuid NOT NULL REFERENCES usuarios(id),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  disciplina_id uuid REFERENCES disciplinas_escolares(id),
  tipo_vinculo varchar(20) NOT NULL,
  ano_letivo varchar(10) NOT NULL,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Indice unico parcial: apenas um professor por disciplina por turma por ano (tipo disciplina)
CREATE UNIQUE INDEX IF NOT EXISTS idx_professor_turmas_disciplina_unique
  ON professor_turmas(turma_id, disciplina_id, ano_letivo)
  WHERE tipo_vinculo = 'disciplina' AND ativo = true AND disciplina_id IS NOT NULL;

-- Indice unico parcial: apenas um professor polivalente por turma por ano
CREATE UNIQUE INDEX IF NOT EXISTS idx_professor_turmas_polivalente_unique
  ON professor_turmas(turma_id, ano_letivo)
  WHERE tipo_vinculo = 'polivalente' AND ativo = true;

-- ============================================================================
-- TABELA 25: questoes
-- ============================================================================

CREATE TABLE IF NOT EXISTS questoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo varchar(50) UNIQUE,
  descricao text,
  disciplina varchar(100),
  area_conhecimento varchar(100),
  dificuldade varchar(20),
  gabarito varchar(10),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  serie_aplicavel varchar(50),
  tipo_questao varchar(20) DEFAULT 'objetiva',
  numero_questao integer
);

-- ============================================================================
-- TABELA 26: niveis_aprendizagem
-- ============================================================================

CREATE TABLE IF NOT EXISTS niveis_aprendizagem (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo varchar(50) NOT NULL UNIQUE,
  nome varchar(100) NOT NULL,
  descricao text,
  cor varchar(20),
  nota_minima numeric(5,2) NOT NULL,
  nota_maxima numeric(5,2) NOT NULL,
  ordem integer DEFAULT 1,
  serie_aplicavel varchar(50),
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 27: itens_producao
-- ============================================================================

CREATE TABLE IF NOT EXISTS itens_producao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo varchar(50) NOT NULL,
  nome varchar(255) NOT NULL,
  descricao text,
  ordem integer DEFAULT 1,
  nota_maxima numeric(5,2) DEFAULT 10.00,
  serie_aplicavel varchar(50),
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(codigo, serie_aplicavel)
);

-- ============================================================================
-- TABELA 28: resultados_provas
-- ============================================================================

CREATE TABLE IF NOT EXISTS resultados_provas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  aluno_id uuid REFERENCES alunos(id),
  aluno_codigo varchar(100),
  aluno_nome varchar(255),
  turma_id uuid REFERENCES turmas(id),
  questao_id uuid REFERENCES questoes(id),
  questao_codigo varchar(50),
  resposta_aluno varchar(10),
  acertou boolean,
  nota numeric(5,2),
  data_prova date,
  ano_letivo varchar(10) NOT NULL,
  serie varchar(50),
  turma varchar(50),
  disciplina varchar(100),
  area_conhecimento varchar(100),
  presenca varchar(10) DEFAULT 'P',
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  avaliacao_id uuid NOT NULL REFERENCES avaliacoes(id)
);

-- Indices unicos parciais para resultados_provas
CREATE UNIQUE INDEX IF NOT EXISTS idx_resultados_provas_aluno_questao_avaliacao
  ON resultados_provas(aluno_id, questao_codigo, avaliacao_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resultados_provas_aluno_questao_ano
  ON resultados_provas(aluno_id, questao_codigo, ano_letivo);

-- ============================================================================
-- TABELA 29: resultados_consolidados
-- ============================================================================

CREATE TABLE IF NOT EXISTS resultados_consolidados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL REFERENCES alunos(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  turma_id uuid REFERENCES turmas(id),
  ano_letivo varchar(10) NOT NULL,
  serie varchar(50),
  presenca varchar(10) DEFAULT 'P',
  total_acertos_lp integer DEFAULT 0,
  total_acertos_ch integer DEFAULT 0,
  total_acertos_mat integer DEFAULT 0,
  total_acertos_cn integer DEFAULT 0,
  nota_lp numeric(5,2),
  nota_ch numeric(5,2),
  nota_mat numeric(5,2),
  nota_cn numeric(5,2),
  media_aluno numeric(5,2),
  nota_producao numeric(5,2),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  nivel_aprendizagem varchar(100),
  nivel_aprendizagem_id uuid REFERENCES niveis_aprendizagem(id),
  total_questoes_respondidas integer DEFAULT 0,
  total_questoes_esperadas integer DEFAULT 0,
  tipo_avaliacao varchar(50) DEFAULT 'padrao',
  item_producao_1 numeric(5,2),
  item_producao_2 numeric(5,2),
  item_producao_3 numeric(5,2),
  item_producao_4 numeric(5,2),
  item_producao_5 numeric(5,2),
  item_producao_6 numeric(5,2),
  item_producao_7 numeric(5,2),
  item_producao_8 numeric(5,2),
  nivel_lp varchar(5),
  nivel_mat varchar(5),
  nivel_prod varchar(5),
  nivel_aluno varchar(5),
  avaliacao_id uuid NOT NULL REFERENCES avaliacoes(id),
  serie_numero varchar(10),
  UNIQUE(aluno_id, avaliacao_id)
);

-- ============================================================================
-- TABELA 30: conselho_classe
-- ============================================================================

CREATE TABLE IF NOT EXISTS conselho_classe (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  periodo_id uuid NOT NULL REFERENCES periodos_letivos(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  ano_letivo varchar(10) NOT NULL,
  data_reuniao date,
  ata_geral text,
  registrado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(turma_id, periodo_id)
);

-- ============================================================================
-- TABELA 31: conselho_classe_alunos
-- ============================================================================

CREATE TABLE IF NOT EXISTS conselho_classe_alunos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conselho_id uuid NOT NULL REFERENCES conselho_classe(id),
  aluno_id uuid NOT NULL REFERENCES alunos(id),
  parecer varchar(30) NOT NULL DEFAULT 'sem_parecer',
  observacao text,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conselho_id, aluno_id)
);

-- ============================================================================
-- TABELA 32: historico_situacao
-- ============================================================================

CREATE TABLE IF NOT EXISTS historico_situacao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL REFERENCES alunos(id),
  situacao varchar(20) NOT NULL,
  situacao_anterior varchar(20),
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  registrado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  tipo_transferencia varchar(20),
  escola_destino_id uuid REFERENCES escolas(id),
  escola_destino_nome varchar(255),
  escola_origem_id uuid REFERENCES escolas(id),
  escola_origem_nome varchar(255),
  tipo_movimentacao varchar(20)
);

-- ============================================================================
-- TABELA 33: fila_espera
-- ============================================================================

CREATE TABLE IF NOT EXISTS fila_espera (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid REFERENCES alunos(id),
  turma_id uuid REFERENCES turmas(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  posicao integer NOT NULL DEFAULT 1,
  status varchar(20) NOT NULL DEFAULT 'aguardando',
  observacao text,
  data_entrada timestamp,
  data_convocacao timestamp,
  data_resolucao timestamp,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  aluno_nome varchar(255),
  responsavel_nome varchar(255),
  telefone varchar(20),
  serie varchar(50),
  ano_letivo varchar(10),
  UNIQUE(aluno_id, turma_id)
);

-- ============================================================================
-- TABELA 34: pre_matriculas
-- ============================================================================

CREATE TABLE IF NOT EXISTS pre_matriculas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocolo varchar(20) NOT NULL UNIQUE,
  aluno_nome varchar(255) NOT NULL,
  aluno_data_nascimento date NOT NULL,
  aluno_cpf varchar(14),
  aluno_genero varchar(20),
  aluno_pcd boolean DEFAULT false,
  responsavel_nome varchar(255) NOT NULL,
  responsavel_cpf varchar(14),
  responsavel_telefone varchar(20) NOT NULL,
  responsavel_email varchar(255),
  parentesco varchar(30),
  endereco text,
  bairro varchar(100),
  escola_pretendida_id uuid REFERENCES escolas(id),
  serie_pretendida varchar(50) NOT NULL,
  ano_letivo varchar(10) NOT NULL,
  status varchar(20) DEFAULT 'pendente',
  motivo_rejeicao text,
  analisado_por uuid REFERENCES usuarios(id),
  analisado_em timestamp,
  observacoes text,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

-- ============================================================================
-- TABELA 35: diario_classe
-- ============================================================================

CREATE TABLE IF NOT EXISTS diario_classe (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id uuid NOT NULL REFERENCES usuarios(id),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  disciplina_id uuid REFERENCES disciplinas_escolares(id),
  data_aula date NOT NULL,
  conteudo text NOT NULL,
  metodologia text,
  observacoes text,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now(),
  UNIQUE(professor_id, turma_id, disciplina_id, data_aula)
);

-- ============================================================================
-- TABELA 36: planos_aula
-- ============================================================================

CREATE TABLE IF NOT EXISTS planos_aula (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id uuid NOT NULL REFERENCES usuarios(id),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  disciplina_id uuid REFERENCES disciplinas_escolares(id),
  periodo varchar(20) DEFAULT 'semanal',
  data_inicio date NOT NULL,
  data_fim date,
  objetivo text NOT NULL,
  conteudo text NOT NULL,
  metodologia text,
  recursos text,
  avaliacao text,
  observacoes text,
  status varchar(20) DEFAULT 'rascunho',
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

-- ============================================================================
-- TABELA 37: comunicados_turma
-- ============================================================================

CREATE TABLE IF NOT EXISTS comunicados_turma (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id uuid NOT NULL REFERENCES turmas(id),
  professor_id uuid NOT NULL REFERENCES usuarios(id),
  titulo varchar(255) NOT NULL,
  mensagem text NOT NULL,
  tipo varchar(30) DEFAULT 'aviso',
  data_publicacao timestamp DEFAULT now(),
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT now()
);

-- ============================================================================
-- TABELA 38: eventos
-- ============================================================================

CREATE TABLE IF NOT EXISTS eventos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo varchar(255) NOT NULL,
  descricao text,
  tipo varchar(30) DEFAULT 'geral',
  data_inicio timestamp NOT NULL,
  data_fim timestamp,
  local varchar(255),
  publico boolean DEFAULT true,
  criado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true
);

-- ============================================================================
-- TABELA 39: notificacoes
-- ============================================================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo varchar(50) NOT NULL,
  titulo varchar(200) NOT NULL,
  mensagem text NOT NULL,
  prioridade varchar(20) NOT NULL DEFAULT 'media',
  destinatario_tipo varchar(20) NOT NULL,
  destinatario_id uuid,
  escola_id uuid REFERENCES escolas(id),
  polo_id uuid REFERENCES polos(id),
  aluno_id uuid REFERENCES alunos(id),
  turma_id uuid REFERENCES turmas(id),
  lida boolean DEFAULT false,
  lida_em timestamp,
  lida_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  expira_em timestamp
);

-- ============================================================================
-- TABELA 40: importacoes
-- ============================================================================

CREATE TABLE IF NOT EXISTS importacoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  nome_arquivo varchar(255) NOT NULL,
  total_linhas integer,
  linhas_processadas integer DEFAULT 0,
  linhas_com_erro integer DEFAULT 0,
  status varchar(20) DEFAULT 'processando',
  erros text,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  concluido_em timestamp,
  ano_letivo varchar(10),
  polos_criados integer DEFAULT 0,
  escolas_criadas integer DEFAULT 0,
  turmas_criadas integer DEFAULT 0,
  alunos_criados integer DEFAULT 0,
  alunos_atualizados integer DEFAULT 0,
  resultados_criados integer DEFAULT 0,
  resultados_atualizados integer DEFAULT 0,
  resultados_duplicados integer DEFAULT 0,
  avaliacao_id uuid REFERENCES avaliacoes(id)
);

-- ============================================================================
-- TABELA 41: consentimentos_faciais
-- ============================================================================

CREATE TABLE IF NOT EXISTS consentimentos_faciais (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL UNIQUE REFERENCES alunos(id),
  responsavel_nome varchar(255) NOT NULL,
  responsavel_cpf varchar(14),
  consentido boolean NOT NULL DEFAULT false,
  data_consentimento timestamp,
  data_revogacao timestamp,
  ip_registro varchar(45),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 42: embeddings_faciais
-- ============================================================================

CREATE TABLE IF NOT EXISTS embeddings_faciais (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id uuid NOT NULL UNIQUE REFERENCES alunos(id),
  embedding_data bytea NOT NULL,
  qualidade numeric(5,2),
  versao_modelo varchar(50) DEFAULT 'v1',
  registrado_por uuid REFERENCES usuarios(id),
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 43: dispositivos_faciais (ja criada acima antes de frequencia_diaria)
-- ============================================================================

-- ============================================================================
-- TABELA 44: logs_dispositivos
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs_dispositivos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispositivo_id uuid NOT NULL REFERENCES dispositivos_faciais(id),
  evento varchar(50) NOT NULL,
  detalhes jsonb DEFAULT '{}',
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 45: logs_acesso
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id),
  usuario_nome varchar(255),
  email varchar(255) NOT NULL,
  tipo_usuario varchar(50),
  ip_address varchar(45),
  user_agent text,
  criado_em timestamptz DEFAULT now()
);

-- ============================================================================
-- TABELA 46: logs_auditoria
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id),
  usuario_email varchar(255),
  acao varchar(50) NOT NULL,
  entidade varchar(50) NOT NULL,
  entidade_id uuid,
  detalhes jsonb,
  ip varchar(45),
  criado_em timestamptz DEFAULT now()
);

-- ============================================================================
-- TABELA 47: divergencias_historico
-- ============================================================================

CREATE TABLE IF NOT EXISTS divergencias_historico (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo varchar(50) NOT NULL,
  nivel varchar(20) NOT NULL,
  titulo varchar(255) NOT NULL,
  descricao text NOT NULL,
  entidade varchar(50),
  entidade_id uuid,
  entidade_nome varchar(255),
  dados_antes jsonb,
  dados_depois jsonb,
  acao_realizada varchar(100) NOT NULL,
  correcao_automatica boolean DEFAULT false,
  usuario_id uuid REFERENCES usuarios(id),
  usuario_nome varchar(255),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 48: metas_escola
-- ============================================================================

CREATE TABLE IF NOT EXISTS metas_escola (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  ano_letivo varchar(10) NOT NULL,
  indicador varchar(50) NOT NULL,
  meta_valor numeric(5,2) NOT NULL,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now(),
  UNIQUE(escola_id, ano_letivo, indicador)
);

-- ============================================================================
-- TABELA 49: ouvidoria
-- ============================================================================

CREATE TABLE IF NOT EXISTS ouvidoria (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocolo varchar(20) NOT NULL UNIQUE,
  tipo varchar(30) NOT NULL,
  nome varchar(255),
  email varchar(255),
  telefone varchar(20),
  escola_id uuid REFERENCES escolas(id),
  assunto varchar(255) NOT NULL,
  mensagem text NOT NULL,
  status varchar(20) DEFAULT 'aberto',
  resposta text,
  respondido_por uuid REFERENCES usuarios(id),
  respondido_em timestamp,
  criado_em timestamp DEFAULT now(),
  atualizado_em timestamp DEFAULT now()
);

-- ============================================================================
-- TABELA 50: publicacoes
-- ============================================================================

CREATE TABLE IF NOT EXISTS publicacoes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo varchar(50) NOT NULL,
  numero varchar(50),
  titulo varchar(255) NOT NULL,
  descricao text,
  orgao varchar(100) NOT NULL,
  data_publicacao date NOT NULL,
  ano_referencia varchar(10),
  url_arquivo text,
  ativo boolean DEFAULT true,
  publicado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- ============================================================================
-- TABELA 51: site_config
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao varchar(50) NOT NULL UNIQUE,
  conteudo jsonb NOT NULL DEFAULT '{}',
  atualizado_por uuid REFERENCES usuarios(id),
  atualizado_em timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now()
);

-- ============================================================================
-- TABELA 52: personalizacao
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalizacao (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo varchar(50) NOT NULL UNIQUE,
  login_titulo varchar(255),
  login_subtitulo text,
  login_imagem_url text,
  login_cor_primaria varchar(7),
  login_cor_secundaria varchar(7),
  rodape_texto text,
  rodape_link text,
  rodape_link_texto varchar(255),
  rodape_ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 53: modulos_tecnico
-- ============================================================================

CREATE TABLE IF NOT EXISTS modulos_tecnico (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  modulo_key varchar(100) NOT NULL UNIQUE,
  modulo_label varchar(255) NOT NULL,
  habilitado boolean DEFAULT true,
  ordem integer DEFAULT 0,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA 54: sisam_series_participantes
-- ============================================================================

CREATE TABLE IF NOT EXISTS sisam_series_participantes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano_letivo varchar(10) NOT NULL,
  serie varchar(50) NOT NULL,
  ativo boolean DEFAULT true,
  criado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  atualizado_em timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ano_letivo, serie)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- --- polos ---
CREATE TRIGGER update_polos_updated_at
  BEFORE UPDATE ON polos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- escolas ---
CREATE TRIGGER update_escolas_updated_at
  BEFORE UPDATE ON escolas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- usuarios ---
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- tipos_avaliacao (sem trigger especifico listado) ---

-- --- regras_avaliacao (sem trigger especifico listado) ---

-- --- series_escolares ---
CREATE TRIGGER set_series_escolares_updated_at
  BEFORE UPDATE ON series_escolares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- disciplinas_escolares ---
CREATE TRIGGER update_disciplinas_escolares_updated_at
  BEFORE UPDATE ON disciplinas_escolares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- turmas ---
CREATE TRIGGER set_turmas_updated_at
  BEFORE UPDATE ON turmas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_turmas_updated_at
  BEFORE UPDATE ON turmas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_turmas_serie_numero
  BEFORE INSERT OR UPDATE OF serie ON turmas
  FOR EACH ROW EXECUTE FUNCTION fn_sync_serie_numero();

-- --- alunos ---
CREATE TRIGGER set_alunos_updated_at
  BEFORE UPDATE ON alunos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alunos_updated_at
  BEFORE UPDATE ON alunos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_alunos_serie_numero
  BEFORE INSERT OR UPDATE OF serie ON alunos
  FOR EACH ROW EXECUTE FUNCTION fn_sync_serie_numero();

-- --- anos_letivos ---
CREATE TRIGGER trigger_atualizar_anos_letivos
  BEFORE UPDATE ON anos_letivos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_anos_letivos();

-- --- periodos_letivos ---
CREATE TRIGGER update_periodos_letivos_updated_at
  BEFORE UPDATE ON periodos_letivos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- configuracao_series ---
CREATE TRIGGER update_configuracao_series_updated_at
  BEFORE UPDATE ON configuracao_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- configuracao_notas_escola ---
CREATE TRIGGER update_configuracao_notas_escola_updated_at
  BEFORE UPDATE ON configuracao_notas_escola
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- escola_regras_avaliacao ---
CREATE TRIGGER set_escola_regras_avaliacao_timestamp
  BEFORE UPDATE ON escola_regras_avaliacao
  FOR EACH ROW EXECUTE FUNCTION trigger_update_escola_regras_avaliacao_timestamp();

-- --- notas_escolares ---
CREATE TRIGGER set_notas_escolares_updated_at
  BEFORE UPDATE ON notas_escolares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notas_escolares_updated_at
  BEFORE UPDATE ON notas_escolares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- frequencia_bimestral ---
CREATE TRIGGER update_frequencia_bimestral_updated_at
  BEFORE UPDATE ON frequencia_bimestral
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- frequencia_diaria ---
CREATE TRIGGER update_frequencia_diaria_updated_at
  BEFORE UPDATE ON frequencia_diaria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- frequencia_hora_aula ---
CREATE TRIGGER update_frequencia_hora_aula_updated_at
  BEFORE UPDATE ON frequencia_hora_aula
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- horarios_aula ---
CREATE TRIGGER update_horarios_aula_updated_at
  BEFORE UPDATE ON horarios_aula
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- professor_turmas ---
CREATE TRIGGER trigger_professor_turmas_updated
  BEFORE UPDATE ON professor_turmas
  FOR EACH ROW EXECUTE FUNCTION update_professor_turmas_timestamp();

-- --- conselho_classe ---
CREATE TRIGGER update_conselho_classe_updated_at
  BEFORE UPDATE ON conselho_classe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- conselho_classe_alunos ---
CREATE TRIGGER update_conselho_alunos_updated_at
  BEFORE UPDATE ON conselho_classe_alunos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- fila_espera ---
CREATE TRIGGER trigger_atualizar_fila_espera
  BEFORE UPDATE ON fila_espera
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_fila_espera();

-- --- notificacoes ---
CREATE TRIGGER trigger_atualizar_notificacoes
  BEFORE UPDATE ON notificacoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_notificacoes();

-- --- consentimentos_faciais ---
CREATE TRIGGER update_consentimentos_faciais_updated_at
  BEFORE UPDATE ON consentimentos_faciais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- embeddings_faciais ---
CREATE TRIGGER update_embeddings_faciais_updated_at
  BEFORE UPDATE ON embeddings_faciais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- dispositivos_faciais ---
CREATE TRIGGER update_dispositivos_faciais_updated_at
  BEFORE UPDATE ON dispositivos_faciais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- resultados_provas ---
CREATE TRIGGER update_resultados_updated_at
  BEFORE UPDATE ON resultados_provas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --- resultados_consolidados ---
CREATE TRIGGER update_resultados_consolidados_updated_at
  BEFORE UPDATE ON resultados_consolidados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rc_serie_numero
  BEFORE INSERT OR UPDATE OF serie ON resultados_consolidados
  FOR EACH ROW EXECUTE FUNCTION fn_sync_serie_numero();

CREATE TRIGGER trigger_calcular_media
  BEFORE INSERT OR UPDATE OF nota_lp, nota_mat, nota_ch, nota_cn, nota_producao, serie
  ON resultados_consolidados
  FOR EACH ROW EXECUTE FUNCTION calcular_media_aluno();

-- ============================================================================
-- INDICES DE PERFORMANCE
-- ============================================================================

-- --- Indices para polos ---
-- (apenas PK e UNIQUE, sem indices adicionais)

-- --- Indices para escolas ---
CREATE INDEX IF NOT EXISTS idx_escolas_polo_ativo ON escolas(polo_id, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_escolas_nome_lower ON escolas(LOWER(nome));
CREATE INDEX IF NOT EXISTS idx_escolas_nome_trgm ON escolas USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_escolas_codigo ON escolas(codigo_inep) WHERE codigo_inep IS NOT NULL;

-- --- Indices para usuarios ---
CREATE INDEX IF NOT EXISTS idx_usuarios_escola_id ON usuarios(escola_id) WHERE escola_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_polo_id ON usuarios(polo_id) WHERE polo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo_tipo ON usuarios(ativo, tipo_usuario) WHERE ativo = true;

-- --- Indices para turmas ---
CREATE INDEX IF NOT EXISTS idx_turmas_escola_ano_serie ON turmas(escola_id, ano_letivo, serie);
CREATE INDEX IF NOT EXISTS idx_turmas_escola_ativo ON turmas(escola_id, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_turmas_serie_numero ON turmas(REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')) WHERE ativo = true AND serie IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_turmas_serie_numero_col ON turmas(serie_numero) WHERE serie_numero IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_turmas_codigo_ano ON turmas(codigo, ano_letivo);

-- --- Indices para alunos ---
CREATE INDEX IF NOT EXISTS idx_alunos_nome_trgm ON alunos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_alunos_nome_lower ON alunos(lower(nome));
CREATE INDEX IF NOT EXISTS idx_alunos_escola_ativo_nome ON alunos(escola_id, ativo, nome);
CREATE INDEX IF NOT EXISTS idx_alunos_situacao ON alunos(situacao) WHERE situacao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_turma_ativo ON alunos(turma_id, ativo) WHERE turma_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_escola_serie_ano ON alunos(escola_id, serie, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_alunos_escola_ativo ON alunos(escola_id, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_alunos_serie ON alunos(serie) WHERE serie IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_serie_numero ON alunos(REGEXP_REPLACE(serie, '[^0-9]', '', 'g')) WHERE ativo = true AND serie IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_serie_numero_col ON alunos(serie_numero) WHERE serie_numero IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_nome_id ON alunos(nome, id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_alunos_codigo_ano ON alunos(codigo, ano_letivo) WHERE ativo = true AND codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_cpf_nascimento ON alunos(cpf, data_nascimento) WHERE ativo = true AND cpf IS NOT NULL;

-- --- Indices para anos_letivos ---
CREATE INDEX IF NOT EXISTS idx_anos_letivos_status ON anos_letivos(status);

-- --- Indices para avaliacoes ---
CREATE INDEX IF NOT EXISTS idx_avaliacoes_ano_ativo ON avaliacoes(ano_letivo, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_avaliacoes_tipo ON avaliacoes(tipo);

-- --- Indices para notas_escolares ---
CREATE INDEX IF NOT EXISTS idx_notas_escolares_aluno_periodo ON notas_escolares(aluno_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_notas_escolares_aluno_ano ON notas_escolares(aluno_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_notas_escolares_escola_ano ON notas_escolares(escola_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_notas_esc_aluno_disc_periodo ON notas_escolares(aluno_id, disciplina_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_notas_esc_aluno_turma ON notas_escolares(aluno_id, turma_id);
CREATE INDEX IF NOT EXISTS idx_notas_esc_escola_ano_nota ON notas_escolares(escola_id, ano_letivo) WHERE nota_final IS NOT NULL;

-- --- Indices para frequencia_bimestral ---
CREATE INDEX IF NOT EXISTS idx_frequencia_aluno_periodo ON frequencia_bimestral(aluno_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_escola_ano ON frequencia_bimestral(escola_id, ano_letivo);

-- --- Indices para frequencia_diaria ---
CREATE INDEX IF NOT EXISTS idx_freq_diaria_aluno_data ON frequencia_diaria(aluno_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_freq_diaria_dispositivo ON frequencia_diaria(dispositivo_id);
CREATE INDEX IF NOT EXISTS idx_freq_diaria_turma_data ON frequencia_diaria(turma_id, data);
CREATE INDEX IF NOT EXISTS idx_fd_status_presente ON frequencia_diaria(escola_id, data) WHERE status = 'presente';
CREATE INDEX IF NOT EXISTS idx_fd_turma_data_status ON frequencia_diaria(turma_id, data, status);

-- --- Indices para frequencia_hora_aula ---
CREATE INDEX IF NOT EXISTS idx_fha_data ON frequencia_hora_aula(data);

-- --- Indices para professor_turmas ---
CREATE INDEX IF NOT EXISTS idx_prof_turmas_professor_turma_disc ON professor_turmas(professor_id, turma_id, disciplina_id) WHERE ativo = true;

-- --- Indices para resultados_provas ---
CREATE INDEX IF NOT EXISTS idx_resultados_provas_escola_ano_serie ON resultados_provas(escola_id, ano_letivo, serie);
CREATE INDEX IF NOT EXISTS idx_resultados_provas_escola_ano_disciplina ON resultados_provas(escola_id, ano_letivo, disciplina);
CREATE INDEX IF NOT EXISTS idx_resultados_provas_aluno_ano_presenca ON resultados_provas(aluno_id, ano_letivo, presenca);
CREATE INDEX IF NOT EXISTS idx_resultados_provas_questao_acertou ON resultados_provas(questao_id, acertou);
CREATE INDEX IF NOT EXISTS idx_resultados_provas_turma_ano_disciplina ON resultados_provas(turma_id, ano_letivo, disciplina);
CREATE INDEX IF NOT EXISTS idx_resultados_provas_aluno_disciplina_acertou ON resultados_provas(aluno_id, disciplina, acertou);

-- --- Indices para resultados_consolidados ---
CREATE INDEX IF NOT EXISTS idx_consolidados_escola_ano_serie ON resultados_consolidados(escola_id, ano_letivo, serie);
CREATE INDEX IF NOT EXISTS idx_consolidados_ano_media ON resultados_consolidados(ano_letivo, media_aluno DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_consolidados_escola_ano_presenca ON resultados_consolidados(escola_id, ano_letivo, presenca);
CREATE INDEX IF NOT EXISTS idx_consolidados_turma_ano ON resultados_consolidados(turma_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_rc_serie_numero ON resultados_consolidados(REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')) WHERE serie IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rc_presenca ON resultados_consolidados(presenca) WHERE presenca IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rc_serie_numero_col ON resultados_consolidados(serie_numero) WHERE serie_numero IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rc_serie_numero_ano ON resultados_consolidados(serie_numero, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_rc_serie_ano ON resultados_consolidados(serie, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_rc_ano_escola_presenca ON resultados_consolidados(ano_letivo, escola_id, presenca) WHERE presenca IS NOT NULL;

-- --- Indices para conselho_classe ---
CREATE INDEX IF NOT EXISTS idx_conselho_classe_turma_periodo ON conselho_classe(turma_id, periodo_id);

-- --- Indices para conselho_classe_alunos ---
CREATE INDEX IF NOT EXISTS idx_conselho_alunos_aluno ON conselho_classe_alunos(aluno_id);

-- --- Indices para historico_situacao ---
CREATE INDEX IF NOT EXISTS idx_hist_situacao_aluno_data ON historico_situacao(aluno_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_historico_situacao_aluno ON historico_situacao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_situacao_tipo ON historico_situacao(tipo_movimentacao) WHERE tipo_movimentacao IS NOT NULL;

-- --- Indices para fila_espera ---
CREATE INDEX IF NOT EXISTS idx_fila_espera_turma_status ON fila_espera(turma_id, status);

-- --- Indices para notificacoes ---
CREATE INDEX IF NOT EXISTS idx_notificacoes_dest_lida ON notificacoes(destinatario_tipo, lida, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_dest_id ON notificacoes(destinatario_id) WHERE destinatario_id IS NOT NULL;

-- --- Indices para questoes ---
CREATE INDEX IF NOT EXISTS idx_questoes_disciplina ON questoes(disciplina);
CREATE INDEX IF NOT EXISTS idx_questoes_area ON questoes(area_conhecimento);

-- --- Indices para importacoes ---
CREATE INDEX IF NOT EXISTS idx_importacoes_usuario_status ON importacoes(usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_importacoes_criado_em ON importacoes(criado_em DESC);

-- --- Indices para eventos ---
CREATE INDEX IF NOT EXISTS idx_eventos_ativo ON eventos(ativo) WHERE ativo = true;

-- --- Indices para configuracao_notas_escola ---
CREATE INDEX IF NOT EXISTS idx_config_notas_ativo ON configuracao_notas_escola(ativo) WHERE ativo = true;

-- ============================================================================
-- MATERIALIZED VIEW: mv_sisam_media
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sisam_media AS
SELECT
  id AS resultado_id,
  aluno_id,
  escola_id,
  turma_id,
  ano_letivo,
  serie,
  presenca,
  avaliacao_id,
  CASE
    WHEN regexp_replace(serie::text, '[^0-9]', '', 'g') IN ('1','2','3','4','5') THEN 'anos_iniciais'
    WHEN regexp_replace(serie::text, '[^0-9]', '', 'g') IN ('6','7','8','9') THEN 'anos_finais'
    ELSE 'outro'
  END AS tipo_ensino,
  CASE
    WHEN regexp_replace(serie::text, '[^0-9]', '', 'g') IN ('1','2','3','4','5')
    THEN round((COALESCE(nota_lp::numeric, 0) + COALESCE(nota_mat::numeric, 0) + COALESCE(nota_producao::numeric, 0)) / 3.0, 2)
    ELSE round((COALESCE(nota_lp::numeric, 0) + COALESCE(nota_ch::numeric, 0) + COALESCE(nota_mat::numeric, 0) + COALESCE(nota_cn::numeric, 0)) / 4.0, 2)
  END AS media_calculada,
  COALESCE(nota_lp::numeric, 0) AS nota_lp,
  COALESCE(nota_mat::numeric, 0) AS nota_mat,
  COALESCE(nota_ch::numeric, 0) AS nota_ch,
  COALESCE(nota_cn::numeric, 0) AS nota_cn,
  COALESCE(nota_producao::numeric, 0) AS nota_producao
FROM resultados_consolidados rc;

-- Indices da materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sisam_media_id ON mv_sisam_media(resultado_id);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_ano ON mv_sisam_media(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_escola ON mv_sisam_media(escola_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_presenca ON mv_sisam_media(presenca, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_mv_sisam_media_tipo ON mv_sisam_media(tipo_ensino, ano_letivo);

-- ============================================================================
-- FIM DA MIGRACAO INICIAL
-- ============================================================================

COMMIT;
