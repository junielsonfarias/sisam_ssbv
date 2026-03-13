-- ============================================
-- MIGRACAO: Gestor Escolar - Fase 2
-- Disciplinas, Períodos Letivos e Configuração de Notas
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- Cria as tabelas base do módulo Gestor Escolar para permitir
-- o lançamento de notas escolares (bimestrais) por disciplina.
--
-- TABELAS:
-- - disciplinas_escolares: catálogo de disciplinas
-- - periodos_letivos: bimestres/trimestres por ano
-- - configuracao_notas_escola: regras de nota por escola/ano
-- ============================================

-- ============================================
-- ETAPA 1: Tabela de Disciplinas Escolares
-- ============================================

CREATE TABLE IF NOT EXISTS disciplinas_escolares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50),
    abreviacao VARCHAR(20),
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(codigo)
);

CREATE INDEX IF NOT EXISTS idx_disciplinas_esc_ativo ON disciplinas_escolares(ativo);

-- Seed disciplinas padrão do ensino fundamental
INSERT INTO disciplinas_escolares (nome, codigo, abreviacao, ordem) VALUES
    ('Língua Portuguesa', 'LP', 'Port', 1),
    ('Matemática', 'MAT', 'Mat', 2),
    ('Ciências', 'CIE', 'Ciên', 3),
    ('História', 'HIS', 'Hist', 4),
    ('Geografia', 'GEO', 'Geo', 5),
    ('Artes', 'ART', 'Art', 6),
    ('Educação Física', 'EDF', 'Ed.Fís', 7),
    ('Ensino Religioso', 'REL', 'Rel', 8),
    ('Língua Inglesa', 'ING', 'Ing', 9)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- ETAPA 2: Tabela de Períodos Letivos
-- ============================================

CREATE TABLE IF NOT EXISTS periodos_letivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bimestre', 'trimestre', 'semestre', 'anual')),
    numero INTEGER NOT NULL CHECK (numero >= 1 AND numero <= 4),
    ano_letivo VARCHAR(10) NOT NULL CHECK (ano_letivo ~ '^\d{4}$'),
    data_inicio DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo, numero, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_periodos_ano ON periodos_letivos(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_periodos_tipo ON periodos_letivos(tipo);

-- Seed períodos para 2026 (bimestral - padrão municipal)
INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, data_inicio, data_fim) VALUES
    ('1º Bimestre', 'bimestre', 1, '2026', '2026-02-02', '2026-04-17'),
    ('2º Bimestre', 'bimestre', 2, '2026', '2026-04-20', '2026-07-03'),
    ('3º Bimestre', 'bimestre', 3, '2026', '2026-07-20', '2026-10-02'),
    ('4º Bimestre', 'bimestre', 4, '2026', '2026-10-05', '2026-12-18')
ON CONFLICT (tipo, numero, ano_letivo) DO NOTHING;

-- ============================================
-- ETAPA 3: Configuração de Notas por Escola
-- ============================================

CREATE TABLE IF NOT EXISTS configuracao_notas_escola (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    ano_letivo VARCHAR(10) NOT NULL CHECK (ano_letivo ~ '^\d{4}$'),
    tipo_periodo VARCHAR(20) NOT NULL DEFAULT 'bimestre' CHECK (tipo_periodo IN ('bimestre', 'trimestre', 'semestre')),
    nota_maxima DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    media_aprovacao DECIMAL(5,2) NOT NULL DEFAULT 6.00,
    media_recuperacao DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    peso_avaliacao DECIMAL(3,2) NOT NULL DEFAULT 0.60,
    peso_recuperacao DECIMAL(3,2) NOT NULL DEFAULT 0.40,
    permite_recuperacao BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(escola_id, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_config_notas_escola ON configuracao_notas_escola(escola_id);
CREATE INDEX IF NOT EXISTS idx_config_notas_ano ON configuracao_notas_escola(ano_letivo);

-- ============================================
-- ETAPA 4: Tabela de Notas Escolares
-- (preparação para Fase 3 - lançamento de notas)
-- ============================================

CREATE TABLE IF NOT EXISTS notas_escolares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES disciplinas_escolares(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES periodos_letivos(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    ano_letivo VARCHAR(10) NOT NULL,
    nota DECIMAL(5,2) CHECK (nota >= 0),
    nota_recuperacao DECIMAL(5,2) CHECK (nota_recuperacao >= 0),
    nota_final DECIMAL(5,2) CHECK (nota_final >= 0),
    faltas INTEGER DEFAULT 0 CHECK (faltas >= 0),
    observacao TEXT,
    registrado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id, disciplina_id, periodo_id)
);

CREATE INDEX IF NOT EXISTS idx_notas_esc_aluno ON notas_escolares(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_esc_disciplina ON notas_escolares(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_notas_esc_periodo ON notas_escolares(periodo_id);
CREATE INDEX IF NOT EXISTS idx_notas_esc_escola ON notas_escolares(escola_id);
CREATE INDEX IF NOT EXISTS idx_notas_esc_ano ON notas_escolares(ano_letivo);

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_disciplinas_escolares_updated_at ON disciplinas_escolares;
CREATE TRIGGER update_disciplinas_escolares_updated_at BEFORE UPDATE ON disciplinas_escolares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_periodos_letivos_updated_at ON periodos_letivos;
CREATE TRIGGER update_periodos_letivos_updated_at BEFORE UPDATE ON periodos_letivos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracao_notas_escola_updated_at ON configuracao_notas_escola;
CREATE TRIGGER update_configuracao_notas_escola_updated_at BEFORE UPDATE ON configuracao_notas_escola
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notas_escolares_updated_at ON notas_escolares;
CREATE TRIGGER update_notas_escolares_updated_at BEFORE UPDATE ON notas_escolares
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

DO $$
DECLARE
    total_disciplinas INTEGER;
    total_periodos INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_disciplinas FROM disciplinas_escolares;
    SELECT COUNT(*) INTO total_periodos FROM periodos_letivos;

    RAISE NOTICE '=== MIGRACAO GESTOR ESCOLAR FASE 2 CONCLUIDA ===';
    RAISE NOTICE 'Disciplinas cadastradas: %', total_disciplinas;
    RAISE NOTICE 'Periodos letivos cadastrados: %', total_periodos;
END $$;
