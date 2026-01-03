-- =====================================================
-- SISAM - Migration: Estrutura de Avaliação por Série
-- =====================================================
--
-- Este migration adiciona suporte para diferentes estruturas de avaliação:
--
-- 8º e 9º ANO: 60 questões objetivas (LP, CH, MAT, CN)
-- 2º e 3º ANO: 28 questões objetivas (14 LP + 14 MAT) + 8 itens produção textual
-- 5º ANO: 34 questões objetivas (14 LP + 20 MAT) + 8 itens produção textual
-- =====================================================

-- =====================================================
-- 1. TABELA: CONFIGURACAO_SERIES
-- Define a estrutura de avaliação para cada série
-- =====================================================
CREATE TABLE IF NOT EXISTS configuracao_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serie VARCHAR(50) NOT NULL UNIQUE,
    nome_serie VARCHAR(100) NOT NULL,

    -- Quantidade de questões por disciplina
    qtd_questoes_lp INTEGER DEFAULT 0,
    qtd_questoes_mat INTEGER DEFAULT 0,
    qtd_questoes_ch INTEGER DEFAULT 0,
    qtd_questoes_cn INTEGER DEFAULT 0,
    total_questoes_objetivas INTEGER GENERATED ALWAYS AS (qtd_questoes_lp + qtd_questoes_mat + qtd_questoes_ch + qtd_questoes_cn) STORED,

    -- Produção textual
    tem_producao_textual BOOLEAN DEFAULT false,
    qtd_itens_producao INTEGER DEFAULT 0,

    -- Disciplinas avaliadas
    avalia_lp BOOLEAN DEFAULT true,
    avalia_mat BOOLEAN DEFAULT true,
    avalia_ch BOOLEAN DEFAULT false,
    avalia_cn BOOLEAN DEFAULT false,

    -- Cálculo de médias
    peso_lp DECIMAL(3,2) DEFAULT 1.00,
    peso_mat DECIMAL(3,2) DEFAULT 1.00,
    peso_ch DECIMAL(3,2) DEFAULT 1.00,
    peso_cn DECIMAL(3,2) DEFAULT 1.00,
    peso_producao DECIMAL(3,2) DEFAULT 1.00,

    -- Configuração de níveis de aprendizagem
    usa_nivel_aprendizagem BOOLEAN DEFAULT false,

    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. TABELA: ITENS_PRODUCAO
-- Define os itens de avaliação da produção textual
-- =====================================================
CREATE TABLE IF NOT EXISTS itens_producao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 1,
    nota_maxima DECIMAL(5,2) DEFAULT 10.00,
    serie_aplicavel VARCHAR(50), -- NULL significa que se aplica a todas as séries com produção
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(codigo, serie_aplicavel)
);

-- =====================================================
-- 3. TABELA: RESULTADOS_PRODUCAO
-- Armazena as notas dos itens de produção por aluno
-- =====================================================
CREATE TABLE IF NOT EXISTS resultados_producao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    item_producao_id UUID NOT NULL REFERENCES itens_producao(id) ON DELETE CASCADE,

    -- Identificação
    ano_letivo VARCHAR(10) NOT NULL,
    serie VARCHAR(50),
    data_avaliacao DATE,

    -- Nota do item
    nota DECIMAL(5,2),
    observacao TEXT,

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(aluno_id, item_producao_id, ano_letivo)
);

-- =====================================================
-- 4. TABELA: NIVEIS_APRENDIZAGEM
-- Define os níveis de aprendizagem e suas faixas
-- =====================================================
CREATE TABLE IF NOT EXISTS niveis_aprendizagem (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    cor VARCHAR(20), -- Para exibição em gráficos (hex color)
    nota_minima DECIMAL(5,2) NOT NULL,
    nota_maxima DECIMAL(5,2) NOT NULL,
    ordem INTEGER DEFAULT 1,
    serie_aplicavel VARCHAR(50), -- NULL significa todas as séries
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. ALTERAÇÕES NA TABELA RESULTADOS_CONSOLIDADOS
-- Adiciona campos para produção textual e nível de aprendizagem
-- (FK para niveis_aprendizagem será adicionada depois, na seção 5.1)
-- =====================================================

-- Adicionar novos campos (sem FK por enquanto)
ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS nota_producao DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS nivel_aprendizagem VARCHAR(100);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS nivel_aprendizagem_id UUID;

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS total_questoes_respondidas INTEGER DEFAULT 0;

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS total_questoes_esperadas INTEGER DEFAULT 0;

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS tipo_avaliacao VARCHAR(50) DEFAULT 'padrao';

-- Adicionar campos para notas individuais dos itens de produção
ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_1 DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_2 DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_3 DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_4 DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_5 DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_6 DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_7 DECIMAL(5,2);

ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS item_producao_8 DECIMAL(5,2);

-- =====================================================
-- 6. ALTERAÇÕES NA TABELA QUESTOES
-- Adiciona campos para série aplicável e tipo de questão
-- =====================================================

ALTER TABLE questoes
ADD COLUMN IF NOT EXISTS serie_aplicavel VARCHAR(50);

ALTER TABLE questoes
ADD COLUMN IF NOT EXISTS tipo_questao VARCHAR(20) DEFAULT 'objetiva';

ALTER TABLE questoes
ADD COLUMN IF NOT EXISTS numero_questao INTEGER;

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_config_series_serie ON configuracao_series(serie);
CREATE INDEX IF NOT EXISTS idx_itens_producao_serie ON itens_producao(serie_aplicavel);
CREATE INDEX IF NOT EXISTS idx_resultados_producao_aluno ON resultados_producao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_resultados_producao_escola ON resultados_producao(escola_id);
CREATE INDEX IF NOT EXISTS idx_resultados_producao_ano ON resultados_producao(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_nivel ON resultados_consolidados(nivel_aprendizagem);
CREATE INDEX IF NOT EXISTS idx_questoes_serie ON questoes(serie_aplicavel);
CREATE INDEX IF NOT EXISTS idx_questoes_tipo ON questoes(tipo_questao);

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_configuracao_series_updated_at ON configuracao_series;
CREATE TRIGGER update_configuracao_series_updated_at BEFORE UPDATE ON configuracao_series
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resultados_producao_updated_at ON resultados_producao;
CREATE TRIGGER update_resultados_producao_updated_at BEFORE UPDATE ON resultados_producao
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. DADOS INICIAIS: CONFIGURAÇÃO DAS SÉRIES
-- =====================================================

INSERT INTO configuracao_series (
    serie, nome_serie,
    qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
    tem_producao_textual, qtd_itens_producao,
    avalia_lp, avalia_mat, avalia_ch, avalia_cn,
    usa_nivel_aprendizagem
) VALUES
-- 2º ANO: 28 questões (14 LP + 14 MAT) + 8 itens produção
('2', '2º Ano', 14, 14, 0, 0, true, 8, true, true, false, false, true),

-- 3º ANO: 28 questões (14 LP + 14 MAT) + 8 itens produção
('3', '3º Ano', 14, 14, 0, 0, true, 8, true, true, false, false, true),

-- 5º ANO: 34 questões (14 LP + 20 MAT) + 8 itens produção
('5', '5º Ano', 14, 20, 0, 0, true, 8, true, true, false, false, true),

-- 8º ANO: 60 questões objetivas (LP, CH, MAT, CN)
('8', '8º Ano', 15, 15, 15, 15, false, 0, true, true, true, true, false),

-- 9º ANO: 60 questões objetivas (LP, CH, MAT, CN)
('9', '9º Ano', 15, 15, 15, 15, false, 0, true, true, true, true, false)

ON CONFLICT (serie) DO UPDATE SET
    nome_serie = EXCLUDED.nome_serie,
    qtd_questoes_lp = EXCLUDED.qtd_questoes_lp,
    qtd_questoes_mat = EXCLUDED.qtd_questoes_mat,
    qtd_questoes_ch = EXCLUDED.qtd_questoes_ch,
    qtd_questoes_cn = EXCLUDED.qtd_questoes_cn,
    tem_producao_textual = EXCLUDED.tem_producao_textual,
    qtd_itens_producao = EXCLUDED.qtd_itens_producao,
    avalia_lp = EXCLUDED.avalia_lp,
    avalia_mat = EXCLUDED.avalia_mat,
    avalia_ch = EXCLUDED.avalia_ch,
    avalia_cn = EXCLUDED.avalia_cn,
    usa_nivel_aprendizagem = EXCLUDED.usa_nivel_aprendizagem,
    atualizado_em = CURRENT_TIMESTAMP;

-- =====================================================
-- 10. DADOS INICIAIS: ITENS DE PRODUÇÃO TEXTUAL
-- =====================================================

INSERT INTO itens_producao (codigo, nome, descricao, ordem, nota_maxima) VALUES
('ITEM_1', 'Adequação ao tema', 'Avalia se o texto está adequado ao tema proposto', 1, 10.00),
('ITEM_2', 'Adequação ao gênero', 'Avalia se o texto atende às características do gênero solicitado', 2, 10.00),
('ITEM_3', 'Coesão e coerência', 'Avalia a articulação das ideias e a progressão textual', 3, 10.00),
('ITEM_4', 'Registro linguístico', 'Avalia o uso adequado da linguagem formal/informal', 4, 10.00),
('ITEM_5', 'Convenções da escrita', 'Avalia ortografia, pontuação e acentuação', 5, 10.00),
('ITEM_6', 'Segmentação', 'Avalia a divisão adequada em parágrafos e períodos', 6, 10.00),
('ITEM_7', 'Vocabulário', 'Avalia a variedade e adequação do vocabulário utilizado', 7, 10.00),
('ITEM_8', 'Legibilidade', 'Avalia a clareza da letra e organização visual do texto', 8, 10.00)
ON CONFLICT (codigo, serie_aplicavel) DO NOTHING;

-- =====================================================
-- 11. DADOS INICIAIS: NÍVEIS DE APRENDIZAGEM
-- =====================================================

INSERT INTO niveis_aprendizagem (codigo, nome, descricao, cor, nota_minima, nota_maxima, ordem) VALUES
('INSUFICIENTE', 'Insuficiente', 'Desempenho abaixo do esperado para a série', '#EF4444', 0.00, 2.99, 1),
('BASICO', 'Básico', 'Domínio parcial das habilidades esperadas', '#F59E0B', 3.00, 4.99, 2),
('ADEQUADO', 'Adequado', 'Domínio satisfatório das habilidades esperadas', '#3B82F6', 5.00, 7.49, 3),
('AVANCADO', 'Avançado', 'Domínio pleno das habilidades esperadas', '#10B981', 7.50, 10.00, 4)
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    cor = EXCLUDED.cor,
    nota_minima = EXCLUDED.nota_minima,
    nota_maxima = EXCLUDED.nota_maxima,
    ordem = EXCLUDED.ordem;

-- =====================================================
-- 11.1 ADICIONAR FK PARA NIVEIS_APRENDIZAGEM
-- (Agora que a tabela existe, podemos adicionar a FK)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_resultados_consolidados_nivel'
        AND table_name = 'resultados_consolidados'
    ) THEN
        ALTER TABLE resultados_consolidados
        ADD CONSTRAINT fk_resultados_consolidados_nivel
        FOREIGN KEY (nivel_aprendizagem_id) REFERENCES niveis_aprendizagem(id);
    END IF;
END $$;

-- =====================================================
-- 12. FUNÇÃO: CALCULAR NÍVEL DE APRENDIZAGEM
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_nivel_aprendizagem(p_media DECIMAL(5,2), p_serie VARCHAR(50) DEFAULT NULL)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. FUNÇÃO: OBTER CONFIGURAÇÃO DA SÉRIE
-- =====================================================

CREATE OR REPLACE FUNCTION obter_config_serie(p_serie VARCHAR(50))
RETURNS TABLE (
    serie VARCHAR(50),
    nome_serie VARCHAR(100),
    qtd_questoes_lp INTEGER,
    qtd_questoes_mat INTEGER,
    qtd_questoes_ch INTEGER,
    qtd_questoes_cn INTEGER,
    total_questoes_objetivas INTEGER,
    tem_producao_textual BOOLEAN,
    qtd_itens_producao INTEGER,
    avalia_lp BOOLEAN,
    avalia_mat BOOLEAN,
    avalia_ch BOOLEAN,
    avalia_cn BOOLEAN,
    usa_nivel_aprendizagem BOOLEAN
) AS $$
BEGIN
    -- Normaliza a série (extrai apenas o número)
    RETURN QUERY
    SELECT
        cs.serie,
        cs.nome_serie,
        cs.qtd_questoes_lp,
        cs.qtd_questoes_mat,
        cs.qtd_questoes_ch,
        cs.qtd_questoes_cn,
        cs.total_questoes_objetivas,
        cs.tem_producao_textual,
        cs.qtd_itens_producao,
        cs.avalia_lp,
        cs.avalia_mat,
        cs.avalia_ch,
        cs.avalia_cn,
        cs.usa_nivel_aprendizagem
    FROM configuracao_series cs
    WHERE cs.serie = REGEXP_REPLACE(p_serie, '[^0-9]', '', 'g')
       OR cs.serie = p_serie
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. VIEW: RESULTADOS POR SÉRIE COM ESTRUTURA COMPLETA
-- =====================================================

CREATE OR REPLACE VIEW vw_resultados_por_serie AS
SELECT
    rc.id,
    rc.aluno_id,
    a.codigo AS aluno_codigo,
    a.nome AS aluno_nome,
    rc.escola_id,
    e.nome AS escola_nome,
    rc.turma_id,
    t.nome AS turma_nome,
    rc.ano_letivo,
    rc.serie,
    cs.nome_serie,

    -- Questões objetivas
    rc.total_acertos_lp,
    rc.total_acertos_mat,
    rc.total_acertos_ch,
    rc.total_acertos_cn,
    rc.nota_lp,
    rc.nota_mat,
    rc.nota_ch,
    rc.nota_cn,

    -- Produção textual
    rc.nota_producao,
    rc.item_producao_1,
    rc.item_producao_2,
    rc.item_producao_3,
    rc.item_producao_4,
    rc.item_producao_5,
    rc.item_producao_6,
    rc.item_producao_7,
    rc.item_producao_8,

    -- Médias e nível
    rc.media_aluno,
    rc.nivel_aprendizagem,
    na.nome AS nivel_nome,
    na.cor AS nivel_cor,

    -- Configuração da série
    cs.tem_producao_textual,
    cs.total_questoes_objetivas AS qtd_questoes_esperadas,
    cs.avalia_ch,
    cs.avalia_cn,

    rc.presenca,
    rc.criado_em,
    rc.atualizado_em

FROM resultados_consolidados rc
LEFT JOIN alunos a ON a.id = rc.aluno_id
LEFT JOIN escolas e ON e.id = rc.escola_id
LEFT JOIN turmas t ON t.id = rc.turma_id
LEFT JOIN configuracao_series cs ON cs.serie = REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')
LEFT JOIN niveis_aprendizagem na ON na.id = rc.nivel_aprendizagem_id;

-- =====================================================
-- 15. VIEW: ESTATÍSTICAS POR SÉRIE
-- =====================================================

CREATE OR REPLACE VIEW vw_estatisticas_serie AS
SELECT
    cs.serie,
    cs.nome_serie,
    cs.total_questoes_objetivas,
    cs.tem_producao_textual,
    COUNT(DISTINCT rc.aluno_id) AS total_alunos,
    COUNT(DISTINCT rc.escola_id) AS total_escolas,

    -- Médias por disciplina
    ROUND(AVG(rc.nota_lp), 2) AS media_lp,
    ROUND(AVG(rc.nota_mat), 2) AS media_mat,
    ROUND(AVG(rc.nota_ch), 2) AS media_ch,
    ROUND(AVG(rc.nota_cn), 2) AS media_cn,
    ROUND(AVG(rc.nota_producao), 2) AS media_producao,
    ROUND(AVG(rc.media_aluno), 2) AS media_geral,

    -- Distribuição por nível (para séries com nível de aprendizagem)
    COUNT(CASE WHEN rc.nivel_aprendizagem = 'Insuficiente' THEN 1 END) AS qtd_insuficiente,
    COUNT(CASE WHEN rc.nivel_aprendizagem = 'Básico' THEN 1 END) AS qtd_basico,
    COUNT(CASE WHEN rc.nivel_aprendizagem = 'Adequado' THEN 1 END) AS qtd_adequado,
    COUNT(CASE WHEN rc.nivel_aprendizagem = 'Avançado' THEN 1 END) AS qtd_avancado

FROM configuracao_series cs
LEFT JOIN resultados_consolidados rc ON REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') = cs.serie
WHERE cs.ativo = true
GROUP BY cs.serie, cs.nome_serie, cs.total_questoes_objetivas, cs.tem_producao_textual
ORDER BY cs.serie;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
