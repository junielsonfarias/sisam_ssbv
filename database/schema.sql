-- SISAM - Sistema de Análise de Provas
-- Schema do Banco de Dados PostgreSQL

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Polos (criada primeiro pois outras tabelas dependem dela)
CREATE TABLE IF NOT EXISTS polos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Escolas (depende de polos)
CREATE TABLE IF NOT EXISTS escolas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    polo_id UUID NOT NULL REFERENCES polos(id) ON DELETE CASCADE,
    endereco TEXT,
    telefone VARCHAR(50),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários (depende de polos e escolas)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('administrador', 'tecnico', 'polo', 'escola')),
    polo_id UUID REFERENCES polos(id) ON DELETE SET NULL,
    escola_id UUID REFERENCES escolas(id) ON DELETE SET NULL,
    auth_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Turmas (depende de escolas)
CREATE TABLE IF NOT EXISTS turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    serie VARCHAR(50),
    ano_letivo VARCHAR(10) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(escola_id, codigo, ano_letivo)
);

-- Tabela de Alunos (depende de escolas e turmas)
CREATE TABLE IF NOT EXISTS alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(100) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    serie VARCHAR(50),
    ano_letivo VARCHAR(10),
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Provas/Questões
CREATE TABLE IF NOT EXISTS questoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE,
    descricao TEXT,
    disciplina VARCHAR(100),
    area_conhecimento VARCHAR(100),
    dificuldade VARCHAR(20),
    gabarito VARCHAR(10),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Resultados Consolidados por Aluno (notas e médias)
CREATE TABLE IF NOT EXISTS resultados_consolidados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    ano_letivo VARCHAR(10) NOT NULL,
    serie VARCHAR(50),
    presenca VARCHAR(10) DEFAULT 'P',
    total_acertos_lp INTEGER DEFAULT 0,
    total_acertos_ch INTEGER DEFAULT 0,
    total_acertos_mat INTEGER DEFAULT 0,
    total_acertos_cn INTEGER DEFAULT 0,
    nota_lp DECIMAL(5,2),
    nota_ch DECIMAL(5,2),
    nota_mat DECIMAL(5,2),
    nota_cn DECIMAL(5,2),
    media_aluno DECIMAL(5,2),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id, ano_letivo)
);

-- Tabela de Resultados das Provas (depende de escolas, alunos, turmas e questoes)
CREATE TABLE IF NOT EXISTS resultados_provas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    aluno_codigo VARCHAR(100),
    aluno_nome VARCHAR(255),
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    questao_id UUID REFERENCES questoes(id) ON DELETE SET NULL,
    questao_codigo VARCHAR(50),
    resposta_aluno VARCHAR(10),
    acertou BOOLEAN,
    nota DECIMAL(5,2),
    data_prova DATE,
    ano_letivo VARCHAR(10) NOT NULL,
    serie VARCHAR(50),
    turma VARCHAR(50),
    disciplina VARCHAR(100),
    area_conhecimento VARCHAR(100),
    presenca VARCHAR(10) DEFAULT 'P',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Importações (depende de usuarios)
CREATE TABLE IF NOT EXISTS importacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    total_linhas INTEGER,
    linhas_processadas INTEGER DEFAULT 0,
    linhas_com_erro INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
    erros TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    concluido_em TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo_usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_uid ON usuarios(auth_uid);
CREATE INDEX IF NOT EXISTS idx_escolas_polo ON escolas(polo_id);
CREATE INDEX IF NOT EXISTS idx_resultados_escola ON resultados_provas(escola_id);
CREATE INDEX IF NOT EXISTS idx_resultados_data ON resultados_provas(data_prova);
CREATE INDEX IF NOT EXISTS idx_resultados_aluno ON resultados_provas(aluno_codigo);
CREATE INDEX IF NOT EXISTS idx_resultados_disciplina ON resultados_provas(disciplina);
CREATE INDEX IF NOT EXISTS idx_resultados_ano ON resultados_provas(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_turmas_escola ON turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_ano ON turmas(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_alunos_escola ON alunos(escola_id);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_resultados_aluno_id ON resultados_provas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_resultados_turma_id ON resultados_provas(turma_id);
CREATE INDEX IF NOT EXISTS idx_resultados_presenca ON resultados_provas(presenca);
CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_aluno ON resultados_consolidados(aluno_id);
CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_escola ON resultados_consolidados(escola_id);
CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_ano ON resultados_consolidados(ano_letivo);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_polos_updated_at ON polos;
CREATE TRIGGER update_polos_updated_at BEFORE UPDATE ON polos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_escolas_updated_at ON escolas;
CREATE TRIGGER update_escolas_updated_at BEFORE UPDATE ON escolas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resultados_updated_at ON resultados_provas;
CREATE TRIGGER update_resultados_updated_at BEFORE UPDATE ON resultados_provas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_turmas_updated_at ON turmas;
CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON turmas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alunos_updated_at ON alunos;
CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON alunos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resultados_consolidados_updated_at ON resultados_consolidados;
CREATE TRIGGER update_resultados_consolidados_updated_at BEFORE UPDATE ON resultados_consolidados
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Usuário administrador padrão será criado via script de inicialização
-- Execute: npm run seed ou node scripts/seed.js
