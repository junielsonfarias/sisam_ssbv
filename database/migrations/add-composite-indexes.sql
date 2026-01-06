-- =====================================================
-- MIGRACAO: Adicionar Indices Compostos para Performance
-- Data: 2026-01-06
-- Descricao: Adiciona indices compostos para otimizar queries frequentes
-- =====================================================

-- IMPORTANTE: Execute este script para melhorar performance das queries
-- Os indices sao criados com IF NOT EXISTS para ser idempotente

BEGIN;

-- =====================================================
-- 1. INDICES PARA TABELA resultados_provas
-- =====================================================

-- Filtro comum: escola + ano_letivo + serie (usado em dashboards)
CREATE INDEX IF NOT EXISTS idx_resultados_provas_escola_ano_serie
ON resultados_provas(escola_id, ano_letivo, serie);

-- Filtro para estatisticas por disciplina
CREATE INDEX IF NOT EXISTS idx_resultados_provas_escola_ano_disciplina
ON resultados_provas(escola_id, ano_letivo, disciplina);

-- Filtro para listagem de alunos com presenca
CREATE INDEX IF NOT EXISTS idx_resultados_provas_aluno_ano_presenca
ON resultados_provas(aluno_id, ano_letivo, presenca);

-- Filtro para analise de questoes
CREATE INDEX IF NOT EXISTS idx_resultados_provas_questao_acertou
ON resultados_provas(questao_id, acertou);

-- Filtro para turmas especificas
CREATE INDEX IF NOT EXISTS idx_resultados_provas_turma_ano_disciplina
ON resultados_provas(turma_id, ano_letivo, disciplina);

-- Covering index para queries de contagem de acertos
CREATE INDEX IF NOT EXISTS idx_resultados_provas_aluno_disciplina_acertou
ON resultados_provas(aluno_id, disciplina, acertou);

-- =====================================================
-- 2. INDICES PARA TABELA resultados_consolidados
-- =====================================================

-- Filtro comum: escola + ano_letivo + serie
CREATE INDEX IF NOT EXISTS idx_consolidados_escola_ano_serie
ON resultados_consolidados(escola_id, ano_letivo, serie);

-- Filtro para rankings e medias
CREATE INDEX IF NOT EXISTS idx_consolidados_ano_media
ON resultados_consolidados(ano_letivo, media_aluno DESC NULLS LAST);

-- Filtro para presenca
CREATE INDEX IF NOT EXISTS idx_consolidados_escola_ano_presenca
ON resultados_consolidados(escola_id, ano_letivo, presenca);

-- Filtro por turma
CREATE INDEX IF NOT EXISTS idx_consolidados_turma_ano
ON resultados_consolidados(turma_id, ano_letivo);

-- =====================================================
-- 3. INDICES PARA TABELA alunos
-- =====================================================

-- Filtro comum: escola + serie + ano_letivo
CREATE INDEX IF NOT EXISTS idx_alunos_escola_serie_ano
ON alunos(escola_id, serie, ano_letivo);

-- Busca por nome (com trigramas se disponivel)
CREATE INDEX IF NOT EXISTS idx_alunos_nome_lower
ON alunos(LOWER(nome));

-- Filtro ativo + escola (listagens)
CREATE INDEX IF NOT EXISTS idx_alunos_escola_ativo
ON alunos(escola_id, ativo) WHERE ativo = true;

-- =====================================================
-- 4. INDICES PARA TABELA turmas
-- =====================================================

-- Filtro comum: escola + ano_letivo + serie
CREATE INDEX IF NOT EXISTS idx_turmas_escola_ano_serie
ON turmas(escola_id, ano_letivo, serie);

-- Filtro ativo
CREATE INDEX IF NOT EXISTS idx_turmas_escola_ativo
ON turmas(escola_id, ativo) WHERE ativo = true;

-- =====================================================
-- 5. INDICES PARA TABELA escolas
-- =====================================================

-- Filtro por polo + ativo
CREATE INDEX IF NOT EXISTS idx_escolas_polo_ativo
ON escolas(polo_id, ativo) WHERE ativo = true;

-- Busca por nome
CREATE INDEX IF NOT EXISTS idx_escolas_nome_lower
ON escolas(LOWER(nome));

-- =====================================================
-- 6. INDICES PARA TABELA questoes
-- =====================================================

-- Filtro por disciplina
CREATE INDEX IF NOT EXISTS idx_questoes_disciplina
ON questoes(disciplina);

-- Filtro por area de conhecimento
CREATE INDEX IF NOT EXISTS idx_questoes_area
ON questoes(area_conhecimento);

-- =====================================================
-- 7. INDICES PARA TABELA importacoes
-- =====================================================

-- Filtro por usuario e status
CREATE INDEX IF NOT EXISTS idx_importacoes_usuario_status
ON importacoes(usuario_id, status);

-- Ordenacao por data
CREATE INDEX IF NOT EXISTS idx_importacoes_criado_em
ON importacoes(criado_em DESC);

COMMIT;

-- =====================================================
-- VERIFICACAO
-- =====================================================

-- Listar todos os indices criados
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
