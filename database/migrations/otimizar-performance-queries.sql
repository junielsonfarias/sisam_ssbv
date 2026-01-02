-- Migration: Otimizar Performance de Queries
-- Data: 2025-01-02
-- Objetivo: Adicionar índices compostos e de texto para melhorar performance das consultas

-- ============================================
-- 1. ÍNDICES COMPOSTOS PARA ALUNOS
-- ============================================

-- Índice composto para busca comum: escola_id + serie + ano_letivo
CREATE INDEX IF NOT EXISTS idx_alunos_escola_serie_ano 
ON alunos(escola_id, serie, ano_letivo) 
WHERE ativo = true;

-- Índice composto para busca: turma_id + serie
CREATE INDEX IF NOT EXISTS idx_alunos_turma_serie 
ON alunos(turma_id, serie) 
WHERE ativo = true AND turma_id IS NOT NULL;

-- Índice composto para busca: escola_id + ano_letivo
CREATE INDEX IF NOT EXISTS idx_alunos_escola_ano 
ON alunos(escola_id, ano_letivo) 
WHERE ativo = true;

-- Índice para busca por código (já existe UNIQUE, mas garante otimização)
-- CREATE INDEX IF NOT EXISTS idx_alunos_codigo ON alunos(codigo) WHERE codigo IS NOT NULL;

-- ============================================
-- 2. ÍNDICES COMPOSTOS PARA RESULTADOS
-- ============================================

-- Índice composto para resultados_consolidados: aluno_id + ano_letivo (já existe, mas garantir)
CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_aluno_ano 
ON resultados_consolidados(aluno_id, ano_letivo);

-- Índice composto para resultados_consolidados: escola_id + ano_letivo
CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_escola_ano 
ON resultados_consolidados(escola_id, ano_letivo);

-- Índice composto para resultados_consolidados: turma_id + ano_letivo
CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_turma_ano 
ON resultados_consolidados(turma_id, ano_letivo) 
WHERE turma_id IS NOT NULL;

-- Índice composto para resultados_provas: escola_id + ano_letivo + serie
CREATE INDEX IF NOT EXISTS idx_resultados_provas_escola_ano_serie 
ON resultados_provas(escola_id, ano_letivo, serie);

-- Índice composto para resultados_provas: aluno_id + ano_letivo + questao_codigo
CREATE INDEX IF NOT EXISTS idx_resultados_provas_aluno_ano_questao 
ON resultados_provas(aluno_id, ano_letivo, questao_codigo) 
WHERE aluno_id IS NOT NULL;

-- ============================================
-- 3. ÍNDICES PARA TURMAS
-- ============================================

-- Índice composto para turmas: escola_id + serie + ano_letivo
CREATE INDEX IF NOT EXISTS idx_turmas_escola_serie_ano 
ON turmas(escola_id, serie, ano_letivo) 
WHERE ativo = true;

-- Índice composto para turmas: escola_id + ano_letivo
CREATE INDEX IF NOT EXISTS idx_turmas_escola_ano 
ON turmas(escola_id, ano_letivo) 
WHERE ativo = true;

-- ============================================
-- 4. ÍNDICES PARA ESCOLAS
-- ============================================

-- Índice composto para escolas: polo_id + ativo
CREATE INDEX IF NOT EXISTS idx_escolas_polo_ativo 
ON escolas(polo_id, ativo) 
WHERE ativo = true;

-- ============================================
-- 5. ÍNDICES DE TEXTO PARA BUSCA (GIN)
-- ============================================
-- Nota: GIN indexes requerem extensão pg_trgm para busca ILIKE otimizada

-- Habilitar extensão para busca de texto trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca de nome em alunos (suporta ILIKE otimizado)
CREATE INDEX IF NOT EXISTS idx_alunos_nome_trgm 
ON alunos USING gin(nome gin_trgm_ops);

-- Índice GIN para busca de código em alunos
CREATE INDEX IF NOT EXISTS idx_alunos_codigo_trgm 
ON alunos USING gin(codigo gin_trgm_ops) 
WHERE codigo IS NOT NULL;

-- Índice GIN para busca de nome em escolas
CREATE INDEX IF NOT EXISTS idx_escolas_nome_trgm 
ON escolas USING gin(nome gin_trgm_ops);

-- Índice GIN para busca de nome em turmas
CREATE INDEX IF NOT EXISTS idx_turmas_nome_trgm 
ON turmas USING gin(nome gin_trgm_ops) 
WHERE nome IS NOT NULL;

-- Índice GIN para busca de código em turmas
CREATE INDEX IF NOT EXISTS idx_turmas_codigo_trgm 
ON turmas USING gin(codigo gin_trgm_ops);

-- ============================================
-- 6. ÍNDICES ADICIONAIS PARA ALUNOS
-- ============================================

-- Índice para filtro ativo
CREATE INDEX IF NOT EXISTS idx_alunos_ativo 
ON alunos(ativo) 
WHERE ativo = true;

-- Índice para ano_letivo
CREATE INDEX IF NOT EXISTS idx_alunos_ano_letivo 
ON alunos(ano_letivo) 
WHERE ano_letivo IS NOT NULL;

-- Índice para serie
CREATE INDEX IF NOT EXISTS idx_alunos_serie 
ON alunos(serie) 
WHERE serie IS NOT NULL;

-- ============================================
-- 7. ANÁLISE DE ÍNDICES (VACUUM ANALYZE)
-- ============================================
-- Atualizar estatísticas do PostgreSQL para otimizador usar índices corretamente

VACUUM ANALYZE alunos;
VACUUM ANALYZE escolas;
VACUUM ANALYZE turmas;
VACUUM ANALYZE resultados_consolidados;
VACUUM ANALYZE resultados_provas;
VACUUM ANALYZE polos;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON INDEX idx_alunos_escola_serie_ano IS 
'Índice composto para otimizar buscas de alunos por escola, série e ano letivo';

COMMENT ON INDEX idx_alunos_nome_trgm IS 
'Índice GIN para busca otimizada de nomes usando trigramas (suporta ILIKE rápido)';

COMMENT ON INDEX idx_resultados_consolidados_escola_ano IS 
'Índice composto para otimizar buscas de resultados consolidados por escola e ano';

