-- ============================================
-- OTIMIZACAO DE INDICES PARA PERFORMANCE
-- ============================================
-- Este script cria indices otimizados para suportar
-- 50+ usuarios simultaneos no dashboard
--
-- IMPORTANTE: resultados_consolidados_unificada e uma VIEW
-- Os indices sao criados nas tabelas BASE que a VIEW usa:
-- - resultados_provas (tabela principal)
-- - resultados_consolidados
-- - escolas, alunos, turmas
--
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Inicio da transacao
BEGIN;

-- ========================================
-- INDICES PARA resultados_provas
-- ========================================
-- Tabela BASE usada pela VIEW resultados_consolidados_unificada

-- Indice composto para filtros mais comuns (escola, ano, serie)
CREATE INDEX IF NOT EXISTS idx_rp_escola_ano_serie
ON resultados_provas(escola_id, ano_letivo, serie);

-- Indice para filtro de presenca (muito usado)
CREATE INDEX IF NOT EXISTS idx_rp_presenca
ON resultados_provas(presenca)
WHERE presenca IN ('P', 'p', 'F', 'f');

-- Indice para busca por aluno
CREATE INDEX IF NOT EXISTS idx_rp_aluno_ano
ON resultados_provas(aluno_id, ano_letivo);

-- Indice para turma
CREATE INDEX IF NOT EXISTS idx_rp_turma_id
ON resultados_provas(turma_id)
WHERE turma_id IS NOT NULL;

-- Indice para acertos (usado em analises)
CREATE INDEX IF NOT EXISTS idx_rp_acertou
ON resultados_provas(acertou)
WHERE acertou IS NOT NULL;

-- Indice para disciplina/area_conhecimento
CREATE INDEX IF NOT EXISTS idx_rp_disciplina
ON resultados_provas(disciplina)
WHERE disciplina IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rp_area_conhecimento
ON resultados_provas(area_conhecimento)
WHERE area_conhecimento IS NOT NULL;

-- Indice composto para agregacoes do dashboard
CREATE INDEX IF NOT EXISTS idx_rp_agregacao
ON resultados_provas(aluno_id, escola_id, turma_id, ano_letivo, serie);

-- ========================================
-- INDICES PARA resultados_consolidados
-- ========================================

-- Indice para JOIN com a VIEW
CREATE INDEX IF NOT EXISTS idx_rc_aluno_ano
ON resultados_consolidados(aluno_id, ano_letivo);

-- Indice para nivel de aprendizagem
CREATE INDEX IF NOT EXISTS idx_rc_nivel_aprendizagem
ON resultados_consolidados(nivel_aprendizagem)
WHERE nivel_aprendizagem IS NOT NULL AND nivel_aprendizagem != '';

-- Indice para escola
CREATE INDEX IF NOT EXISTS idx_rc_escola_id
ON resultados_consolidados(escola_id);

-- ========================================
-- INDICES PARA escolas
-- ========================================

-- Indice para polo (muito usado em JOINs)
CREATE INDEX IF NOT EXISTS idx_escolas_polo
ON escolas(polo_id)
WHERE ativo = true;

-- Indice para busca por nome
CREATE INDEX IF NOT EXISTS idx_escolas_nome
ON escolas(nome)
WHERE ativo = true;

-- Indice para ID com ativo
CREATE INDEX IF NOT EXISTS idx_escolas_id_ativo
ON escolas(id)
WHERE ativo = true;

-- ========================================
-- INDICES PARA alunos
-- ========================================

-- Indice para busca por codigo
CREATE INDEX IF NOT EXISTS idx_alunos_codigo
ON alunos(codigo)
WHERE codigo IS NOT NULL;

-- Indice para busca por nome
CREATE INDEX IF NOT EXISTS idx_alunos_nome
ON alunos(nome);

-- ========================================
-- INDICES PARA turmas
-- ========================================

-- Indice para escola
CREATE INDEX IF NOT EXISTS idx_turmas_escola
ON turmas(escola_id);

-- Indice para codigo
CREATE INDEX IF NOT EXISTS idx_turmas_codigo
ON turmas(codigo);

-- ========================================
-- ANALYZE TABLES
-- ========================================
-- Atualiza estatisticas para o query planner

ANALYZE resultados_provas;
ANALYZE resultados_consolidados;
ANALYZE escolas;
ANALYZE alunos;
ANALYZE turmas;
ANALYZE polos;

-- Commit da transacao
COMMIT;

-- ========================================
-- VERIFICACAO
-- ========================================
-- Execute esta query para verificar os indices criados:

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'resultados_provas',
    'resultados_consolidados',
    'escolas',
    'alunos',
    'turmas'
)
ORDER BY tablename, indexname;
