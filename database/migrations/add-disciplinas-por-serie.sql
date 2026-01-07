-- =====================================================
-- Migração: Adicionar tabela de disciplinas por série
-- Data: 2026-01-06
-- Descrição: Criar estrutura flexível para configurar
--            disciplinas e mapeamento de questões por série
-- =====================================================

-- 1. Adicionar coluna tipo_ensino em configuracao_series
ALTER TABLE configuracao_series
ADD COLUMN IF NOT EXISTS tipo_ensino VARCHAR(20) DEFAULT 'anos_iniciais';

-- Atualizar tipo_ensino baseado na série existente
UPDATE configuracao_series
SET tipo_ensino = CASE
  WHEN serie IN ('1', '2', '3', '4', '5') THEN 'anos_iniciais'
  WHEN serie IN ('6', '7', '8', '9') THEN 'anos_finais'
  ELSE 'anos_iniciais'
END;

-- 2. Criar tabela de disciplinas por série
CREATE TABLE IF NOT EXISTS configuracao_series_disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serie_id UUID NOT NULL REFERENCES configuracao_series(id) ON DELETE CASCADE,

  -- Informações da disciplina
  disciplina VARCHAR(100) NOT NULL,          -- Nome completo: "Língua Portuguesa"
  sigla VARCHAR(10) NOT NULL,                -- Sigla: "LP"

  -- Ordem e mapeamento de questões
  ordem INTEGER NOT NULL DEFAULT 1,          -- Ordem da disciplina (1, 2, 3...)
  questao_inicio INTEGER NOT NULL,           -- Primeira questão: 1
  questao_fim INTEGER NOT NULL,              -- Última questão: 20
  qtd_questoes INTEGER NOT NULL,             -- Total de questões: 20

  -- Valor e cálculo de nota
  valor_questao DECIMAL(5,2) DEFAULT 0.50,   -- Valor por questão acertada
  nota_maxima DECIMAL(5,2) DEFAULT 10.00,    -- Nota máxima da disciplina

  -- Metadados
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Restrições
  CONSTRAINT chk_questoes_validas CHECK (questao_fim >= questao_inicio),
  CONSTRAINT chk_qtd_questoes CHECK (qtd_questoes = questao_fim - questao_inicio + 1),
  CONSTRAINT unique_serie_disciplina UNIQUE (serie_id, sigla),
  CONSTRAINT unique_serie_ordem UNIQUE (serie_id, ordem)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_disciplinas_serie_id ON configuracao_series_disciplinas(serie_id);
CREATE INDEX IF NOT EXISTS idx_disciplinas_ordem ON configuracao_series_disciplinas(serie_id, ordem);

-- 3. Migrar dados existentes para a nova estrutura
-- Inserir disciplinas para séries que já existem

-- Para cada série existente, criar as disciplinas baseado na configuração atual
DO $$
DECLARE
  serie_record RECORD;
  questao_atual INTEGER;
BEGIN
  FOR serie_record IN SELECT * FROM configuracao_series LOOP
    questao_atual := 1;

    -- Língua Portuguesa (se avalia_lp = true)
    IF serie_record.avalia_lp AND serie_record.qtd_questoes_lp > 0 THEN
      INSERT INTO configuracao_series_disciplinas (
        serie_id, disciplina, sigla, ordem, questao_inicio, questao_fim, qtd_questoes, valor_questao
      ) VALUES (
        serie_record.id,
        'Língua Portuguesa',
        'LP',
        1,
        questao_atual,
        questao_atual + serie_record.qtd_questoes_lp - 1,
        serie_record.qtd_questoes_lp,
        ROUND(10.0 / serie_record.qtd_questoes_lp, 2)
      )
      ON CONFLICT (serie_id, sigla) DO UPDATE SET
        questao_inicio = EXCLUDED.questao_inicio,
        questao_fim = EXCLUDED.questao_fim,
        qtd_questoes = EXCLUDED.qtd_questoes,
        valor_questao = EXCLUDED.valor_questao;

      questao_atual := questao_atual + serie_record.qtd_questoes_lp;
    END IF;

    -- Ciências Humanas (se avalia_ch = true) - apenas para anos finais
    IF serie_record.avalia_ch AND serie_record.qtd_questoes_ch > 0 THEN
      INSERT INTO configuracao_series_disciplinas (
        serie_id, disciplina, sigla, ordem, questao_inicio, questao_fim, qtd_questoes, valor_questao
      ) VALUES (
        serie_record.id,
        'Ciências Humanas',
        'CH',
        2,
        questao_atual,
        questao_atual + serie_record.qtd_questoes_ch - 1,
        serie_record.qtd_questoes_ch,
        ROUND(10.0 / serie_record.qtd_questoes_ch, 2)
      )
      ON CONFLICT (serie_id, sigla) DO UPDATE SET
        questao_inicio = EXCLUDED.questao_inicio,
        questao_fim = EXCLUDED.questao_fim,
        qtd_questoes = EXCLUDED.qtd_questoes,
        valor_questao = EXCLUDED.valor_questao;

      questao_atual := questao_atual + serie_record.qtd_questoes_ch;
    END IF;

    -- Matemática (se avalia_mat = true)
    IF serie_record.avalia_mat AND serie_record.qtd_questoes_mat > 0 THEN
      INSERT INTO configuracao_series_disciplinas (
        serie_id, disciplina, sigla, ordem, questao_inicio, questao_fim, qtd_questoes, valor_questao
      ) VALUES (
        serie_record.id,
        'Matemática',
        'MAT',
        CASE WHEN serie_record.avalia_ch THEN 3 ELSE 2 END,
        questao_atual,
        questao_atual + serie_record.qtd_questoes_mat - 1,
        serie_record.qtd_questoes_mat,
        ROUND(10.0 / serie_record.qtd_questoes_mat, 2)
      )
      ON CONFLICT (serie_id, sigla) DO UPDATE SET
        questao_inicio = EXCLUDED.questao_inicio,
        questao_fim = EXCLUDED.questao_fim,
        qtd_questoes = EXCLUDED.qtd_questoes,
        valor_questao = EXCLUDED.valor_questao;

      questao_atual := questao_atual + serie_record.qtd_questoes_mat;
    END IF;

    -- Ciências da Natureza (se avalia_cn = true) - apenas para anos finais
    IF serie_record.avalia_cn AND serie_record.qtd_questoes_cn > 0 THEN
      INSERT INTO configuracao_series_disciplinas (
        serie_id, disciplina, sigla, ordem, questao_inicio, questao_fim, qtd_questoes, valor_questao
      ) VALUES (
        serie_record.id,
        'Ciências da Natureza',
        'CN',
        4,
        questao_atual,
        questao_atual + serie_record.qtd_questoes_cn - 1,
        serie_record.qtd_questoes_cn,
        ROUND(10.0 / serie_record.qtd_questoes_cn, 2)
      )
      ON CONFLICT (serie_id, sigla) DO UPDATE SET
        questao_inicio = EXCLUDED.questao_inicio,
        questao_fim = EXCLUDED.questao_fim,
        qtd_questoes = EXCLUDED.qtd_questoes,
        valor_questao = EXCLUDED.valor_questao;
    END IF;

  END LOOP;
END $$;

-- 4. Comentários para documentação
COMMENT ON TABLE configuracao_series_disciplinas IS 'Configuração de disciplinas e mapeamento de questões por série';
COMMENT ON COLUMN configuracao_series_disciplinas.ordem IS 'Ordem da disciplina no arquivo de importação (1=primeira, 2=segunda...)';
COMMENT ON COLUMN configuracao_series_disciplinas.questao_inicio IS 'Número da primeira questão desta disciplina no arquivo (ex: Q1)';
COMMENT ON COLUMN configuracao_series_disciplinas.questao_fim IS 'Número da última questão desta disciplina no arquivo (ex: Q20)';
COMMENT ON COLUMN configuracao_series_disciplinas.valor_questao IS 'Valor de cada questão para cálculo da nota';
COMMENT ON COLUMN configuracao_series.tipo_ensino IS 'Tipo de ensino: anos_iniciais ou anos_finais';

-- 5. Verificar resultado
SELECT
  cs.serie,
  cs.tipo_ensino,
  csd.disciplina,
  csd.sigla,
  csd.ordem,
  CONCAT('Q', csd.questao_inicio, ' a Q', csd.questao_fim) as questoes,
  csd.qtd_questoes,
  csd.valor_questao
FROM configuracao_series cs
LEFT JOIN configuracao_series_disciplinas csd ON cs.id = csd.serie_id
ORDER BY cs.serie, csd.ordem;
