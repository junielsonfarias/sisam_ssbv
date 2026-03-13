-- ============================================
-- MIGRACAO: Suporte a Multiplas Avaliacoes por Ano
-- Data: 2026-03-13
-- ============================================
--
-- CONTEXTO:
-- O SISAM foi criado para 2025 com 1 avaliacao unica por ano.
-- A partir de 2026, havera 2 avaliacoes: Diagnostica (inicio) e Final (fim).
-- Esta migracao cria a entidade "avaliacoes" e propaga avaliacao_id
-- para as tabelas de resultado, permitindo multiplos resultados por ano.
--
-- IMPACTO:
-- - Nova tabela: avaliacoes
-- - Novas colunas: avaliacao_id em resultados_consolidados, resultados_producao,
--   resultados_provas e importacoes
-- - Troca de constraints UNIQUE de (aluno_id, ano_letivo) para (aluno_id, avaliacao_id)
-- - Views atualizadas para incluir avaliacao_id
--
-- RETROCOMPATIBILIDADE:
-- Dados historicos (2025) recebem tipo 'unica'. Endpoints sem avaliacao_id
-- continuam funcionando via helper resolverAvaliacaoId().
-- ============================================

-- ============================================
-- ETAPA 1: Criar tabela avaliacoes
-- ============================================

CREATE TABLE IF NOT EXISTS avaliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ano_letivo VARCHAR(10) NOT NULL CHECK (ano_letivo ~ '^\d{4}$'),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('diagnostica', 'final', 'unica')),
    ordem INTEGER NOT NULL DEFAULT 1,
    data_inicio DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ano_letivo, tipo)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_ano_letivo ON avaliacoes(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_ativo ON avaliacoes(ativo);

-- ============================================
-- ETAPA 2: Seed dados historicos
-- ============================================

-- Para cada ano_letivo existente nos resultados, criar uma avaliacao 'unica'
INSERT INTO avaliacoes (nome, descricao, ano_letivo, tipo, ordem)
SELECT DISTINCT
    'Avaliação Única ' || rc.ano_letivo,
    'Avaliação única (histórico) - migração automática',
    rc.ano_letivo,
    'unica',
    1
FROM resultados_consolidados rc
WHERE rc.ano_letivo IS NOT NULL
ON CONFLICT (ano_letivo, tipo) DO NOTHING;

-- Tambem verificar anos em resultados_provas que podem nao estar em consolidados
INSERT INTO avaliacoes (nome, descricao, ano_letivo, tipo, ordem)
SELECT DISTINCT
    'Avaliação Única ' || rp.ano_letivo,
    'Avaliação única (histórico) - migração automática',
    rp.ano_letivo,
    'unica',
    1
FROM resultados_provas rp
WHERE rp.ano_letivo IS NOT NULL
ON CONFLICT (ano_letivo, tipo) DO NOTHING;

-- Criar as 2 avaliacoes para 2026
INSERT INTO avaliacoes (nome, descricao, ano_letivo, tipo, ordem) VALUES
  ('Avaliação Diagnóstica 2026', 'Avaliação aplicada no início do ano letivo 2026', '2026', 'diagnostica', 1),
  ('Avaliação Final 2026', 'Avaliação aplicada no final do ano letivo 2026', '2026', 'final', 2)
ON CONFLICT (ano_letivo, tipo) DO NOTHING;

-- ============================================
-- ETAPA 3: Adicionar avaliacao_id nas tabelas de resultados
-- ============================================

ALTER TABLE resultados_consolidados ADD COLUMN IF NOT EXISTS avaliacao_id UUID REFERENCES avaliacoes(id);
ALTER TABLE resultados_provas ADD COLUMN IF NOT EXISTS avaliacao_id UUID REFERENCES avaliacoes(id);
ALTER TABLE importacoes ADD COLUMN IF NOT EXISTS avaliacao_id UUID REFERENCES avaliacoes(id);

-- resultados_producao: só adicionar se a tabela existir (criada por 001_estrutura_series.sql)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    ALTER TABLE resultados_producao ADD COLUMN IF NOT EXISTS avaliacao_id UUID REFERENCES avaliacoes(id);
  ELSE
    RAISE NOTICE 'Tabela resultados_producao nao existe - pulando (executar 001_estrutura_series.sql primeiro se necessario)';
  END IF;
END $$;

-- ============================================
-- ETAPA 4: Backfill avaliacao_id para dados existentes
-- ============================================

-- Vincular resultados existentes a avaliacao 'unica' do respectivo ano
UPDATE resultados_consolidados rc
SET avaliacao_id = a.id
FROM avaliacoes a
WHERE a.ano_letivo = rc.ano_letivo AND a.tipo = 'unica'
AND rc.avaliacao_id IS NULL;

-- resultados_producao: backfill condicional
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    UPDATE resultados_producao rp
    SET avaliacao_id = a.id
    FROM avaliacoes a
    WHERE a.ano_letivo = rp.ano_letivo AND a.tipo = 'unica'
    AND rp.avaliacao_id IS NULL;
  END IF;
END $$;

UPDATE resultados_provas rp
SET avaliacao_id = a.id
FROM avaliacoes a
WHERE a.ano_letivo = rp.ano_letivo AND a.tipo = 'unica'
AND rp.avaliacao_id IS NULL;

-- ============================================
-- ETAPA 5: Verificar backfill (deve retornar 0 em todos)
-- ============================================

DO $$
DECLARE
    orphans_rc INTEGER;
    orphans_rp INTEGER;
    orphans_provas INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphans_rc FROM resultados_consolidados WHERE avaliacao_id IS NULL;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
      SELECT COUNT(*) INTO orphans_rp FROM resultados_producao WHERE avaliacao_id IS NULL;
    ELSE
      orphans_rp := 0;
    END IF;
    SELECT COUNT(*) INTO orphans_provas FROM resultados_provas WHERE avaliacao_id IS NULL;

    IF orphans_rc > 0 OR orphans_rp > 0 OR orphans_provas > 0 THEN
        RAISE NOTICE 'AVISO: Registros sem avaliacao_id - consolidados: %, producao: %, provas: %',
            orphans_rc, orphans_rp, orphans_provas;
    ELSE
        RAISE NOTICE 'OK: Todos os registros vinculados a uma avaliacao.';
    END IF;
END $$;

-- ============================================
-- ETAPA 6: Trocar constraints UNIQUE
-- ============================================

-- resultados_consolidados: (aluno_id, ano_letivo) -> (aluno_id, avaliacao_id)
ALTER TABLE resultados_consolidados
    DROP CONSTRAINT IF EXISTS resultados_consolidados_aluno_id_ano_letivo_key;
ALTER TABLE resultados_consolidados
    ADD CONSTRAINT resultados_consolidados_aluno_avaliacao_key UNIQUE(aluno_id, avaliacao_id);

-- resultados_producao: condicional (tabela pode nao existir)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    ALTER TABLE resultados_producao
      DROP CONSTRAINT IF EXISTS resultados_producao_aluno_id_item_producao_id_ano_letivo_key;
    ALTER TABLE resultados_producao
      ADD CONSTRAINT resultados_producao_aluno_item_avaliacao_key UNIQUE(aluno_id, item_producao_id, avaliacao_id);
  END IF;
END $$;

-- resultados_provas: trocar indice unico de (aluno_id, questao_codigo, ano_letivo) para (aluno_id, questao_codigo, avaliacao_id)
DROP INDEX IF EXISTS idx_resultados_provas_unique;
CREATE UNIQUE INDEX idx_resultados_provas_unique
    ON resultados_provas(aluno_id, questao_codigo, avaliacao_id);

-- ============================================
-- ETAPA 7: Tornar avaliacao_id NOT NULL
-- ============================================

ALTER TABLE resultados_consolidados ALTER COLUMN avaliacao_id SET NOT NULL;
ALTER TABLE resultados_provas ALTER COLUMN avaliacao_id SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    ALTER TABLE resultados_producao ALTER COLUMN avaliacao_id SET NOT NULL;
  END IF;
END $$;
-- importacoes: avaliacao_id permanece nullable (importacoes antigas nao tinham)

-- ============================================
-- ETAPA 8: Indices para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rc_avaliacao ON resultados_consolidados(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_rprovas_avaliacao ON resultados_provas(avaliacao_id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
    CREATE INDEX IF NOT EXISTS idx_rp_avaliacao ON resultados_producao(avaliacao_id);
  END IF;
END $$;

-- ============================================
-- ETAPA 9: Atualizar VIEW unificada com avaliacao_id
-- ============================================

DROP VIEW IF EXISTS resultados_consolidados_unificada;
CREATE VIEW resultados_consolidados_unificada AS
SELECT
  rc.aluno_id,
  rc.escola_id,
  rc.turma_id,
  rc.ano_letivo,
  rc.serie,
  rc.avaliacao_id,
  av.nome AS avaliacao_nome,
  av.tipo AS avaliacao_tipo,
  av.ordem AS avaliacao_ordem,
  rc.presenca::text AS presenca,
  rc.total_acertos_lp,
  rc.total_acertos_ch,
  rc.total_acertos_mat,
  rc.total_acertos_cn,
  rc.nota_lp,
  rc.nota_ch,
  rc.nota_mat,
  rc.nota_cn,
  rc.nota_producao,

  -- MEDIA ALUNO: Recalcular dinamicamente com 2 casas decimais
  CASE
    WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
      ROUND(
        (
          COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
          COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
          COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
        ) / 3.0,
        2
      )
    ELSE
      ROUND(
        (
          COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
          COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
          COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
          COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
        ) / 4.0,
        2
      )
  END as media_aluno,

  rc.criado_em,
  rc.atualizado_em
FROM resultados_consolidados rc
INNER JOIN avaliacoes av ON rc.avaliacao_id = av.id;

COMMENT ON VIEW resultados_consolidados_unificada IS
  'VIEW que calcula media_aluno dinamicamente e inclui dados da avaliacao.
   Inclui: avaliacao_id, avaliacao_nome, avaliacao_tipo, avaliacao_ordem.
   Media: Anos Iniciais (2,3,5) = (LP+MAT+PROD)/3 | Anos Finais (6-9) = (LP+CH+MAT+CN)/4.';

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

DO $$
DECLARE
    total_avaliacoes INTEGER;
    total_rc INTEGER;
    total_rp INTEGER;
    total_provas INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_avaliacoes FROM avaliacoes;
    SELECT COUNT(*) INTO total_rc FROM resultados_consolidados WHERE avaliacao_id IS NOT NULL;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resultados_producao') THEN
      SELECT COUNT(*) INTO total_rp FROM resultados_producao WHERE avaliacao_id IS NOT NULL;
    ELSE
      total_rp := 0;
    END IF;
    SELECT COUNT(*) INTO total_provas FROM resultados_provas WHERE avaliacao_id IS NOT NULL;

    RAISE NOTICE '=== MIGRACAO CONCLUIDA ===';
    RAISE NOTICE 'Avaliacoes criadas: %', total_avaliacoes;
    RAISE NOTICE 'Resultados consolidados vinculados: %', total_rc;
    RAISE NOTICE 'Resultados producao vinculados: %', total_rp;
    RAISE NOTICE 'Resultados provas vinculados: %', total_provas;
END $$;
