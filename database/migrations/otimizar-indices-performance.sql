-- ============================================
-- OTIMIZAÇÃO DE ÍNDICES PARA PERFORMANCE
-- ============================================
-- Este script cria índices otimizados para suportar
-- 50+ usuários simultâneos no dashboard
--
-- Execute este script no Supabase SQL Editor:
-- 1. Abra o Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Cole e execute este script
-- ============================================

-- Início da transação
BEGIN;

-- ========================================
-- ÍNDICES PARA resultados_consolidados_unificada
-- ========================================
-- Tabela principal usada pelo dashboard

-- Índice composto para filtros mais comuns
CREATE INDEX IF NOT EXISTS idx_rcu_escola_ano_serie
ON resultados_consolidados_unificada(escola_id, ano_letivo, serie);

-- Índice para filtro de presença (muito usado)
CREATE INDEX IF NOT EXISTS idx_rcu_presenca
ON resultados_consolidados_unificada(presenca)
WHERE presenca IN ('P', 'p', 'F', 'f');

-- Índice para ordenação por média (usado em rankings)
CREATE INDEX IF NOT EXISTS idx_rcu_media_aluno
ON resultados_consolidados_unificada(media_aluno DESC NULLS LAST)
WHERE presenca IN ('P', 'p');

-- Índice para busca por aluno
CREATE INDEX IF NOT EXISTS idx_rcu_aluno_ano
ON resultados_consolidados_unificada(aluno_id, ano_letivo);

-- Índice para turma
CREATE INDEX IF NOT EXISTS idx_rcu_turma
ON resultados_consolidados_unificada(turma_id)
WHERE turma_id IS NOT NULL;

-- ========================================
-- ÍNDICES PARA resultados_consolidados
-- ========================================

-- Índice para JOIN com unificada
CREATE INDEX IF NOT EXISTS idx_rc_aluno_ano
ON resultados_consolidados(aluno_id, ano_letivo);

-- Índice para nível de aprendizagem
CREATE INDEX IF NOT EXISTS idx_rc_nivel_aprendizagem
ON resultados_consolidados(nivel_aprendizagem)
WHERE nivel_aprendizagem IS NOT NULL AND nivel_aprendizagem != '';

-- ========================================
-- ÍNDICES PARA resultados_provas
-- ========================================
-- Usada para análises de acertos/erros

-- Índice composto para análises
CREATE INDEX IF NOT EXISTS idx_rp_escola_ano_serie
ON resultados_provas(escola_id, ano_letivo, serie);

-- Índice para acertos
CREATE INDEX IF NOT EXISTS idx_rp_acertou
ON resultados_provas(acertou)
WHERE acertou IS NOT NULL;

-- Índice para disciplina
CREATE INDEX IF NOT EXISTS idx_rp_disciplina
ON resultados_provas(disciplina)
WHERE disciplina IS NOT NULL;

-- Índice para turma em provas
CREATE INDEX IF NOT EXISTS idx_rp_turma
ON resultados_provas(turma_id)
WHERE turma_id IS NOT NULL;

-- ========================================
-- ÍNDICES PARA escolas
-- ========================================

-- Índice para polo (muito usado em JOINs)
CREATE INDEX IF NOT EXISTS idx_escolas_polo
ON escolas(polo_id)
WHERE ativo = true;

-- Índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_escolas_nome
ON escolas(nome)
WHERE ativo = true;

-- ========================================
-- ÍNDICES PARA alunos
-- ========================================

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_alunos_codigo
ON alunos(codigo)
WHERE codigo IS NOT NULL;

-- ========================================
-- ÍNDICES PARA turmas
-- ========================================

-- Índice para escola
CREATE INDEX IF NOT EXISTS idx_turmas_escola
ON turmas(escola_id);

-- ========================================
-- ANALYZE TABLES
-- ========================================
-- Atualiza estatísticas para o query planner

ANALYZE resultados_consolidados_unificada;
ANALYZE resultados_consolidados;
ANALYZE resultados_provas;
ANALYZE escolas;
ANALYZE alunos;
ANALYZE turmas;
ANALYZE polos;

-- Commit da transação
COMMIT;

-- ========================================
-- VERIFICAÇÃO
-- ========================================
-- Execute esta query para verificar os índices criados:

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'resultados_consolidados_unificada',
    'resultados_consolidados',
    'resultados_provas',
    'escolas',
    'alunos',
    'turmas'
)
ORDER BY tablename, indexname;

-- ========================================
-- OPCIONAL: MATERIALIZED VIEW PARA MÉTRICAS
-- ========================================
-- Descomente e execute se quiser cache de métricas no banco
-- Precisa ser atualizado periodicamente com REFRESH MATERIALIZED VIEW

/*
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_metricas_dashboard AS
SELECT
    e.polo_id,
    rc.escola_id,
    rc.ano_letivo,
    rc.serie,
    COUNT(DISTINCT rc.aluno_id) as total_alunos,
    COUNT(CASE WHEN rc.presenca IN ('P', 'p') THEN 1 END) as total_presentes,
    COUNT(CASE WHEN rc.presenca IN ('F', 'f') THEN 1 END) as total_faltantes,
    ROUND(AVG(CASE WHEN rc.presenca IN ('P', 'p') AND rc.media_aluno > 0 THEN rc.media_aluno END), 2) as media_geral,
    ROUND(AVG(CASE WHEN rc.presenca IN ('P', 'p') AND rc.nota_lp > 0 THEN rc.nota_lp END), 2) as media_lp,
    ROUND(AVG(CASE WHEN rc.presenca IN ('P', 'p') AND rc.nota_mat > 0 THEN rc.nota_mat END), 2) as media_mat,
    ROUND(AVG(CASE WHEN rc.presenca IN ('P', 'p') AND rc.nota_ch > 0 THEN rc.nota_ch END), 2) as media_ch,
    ROUND(AVG(CASE WHEN rc.presenca IN ('P', 'p') AND rc.nota_cn > 0 THEN rc.nota_cn END), 2) as media_cn
FROM resultados_consolidados_unificada rc
INNER JOIN escolas e ON rc.escola_id = e.id
WHERE rc.presenca IN ('P', 'p', 'F', 'f')
GROUP BY e.polo_id, rc.escola_id, rc.ano_letivo, rc.serie;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_metricas_pk
ON mv_metricas_dashboard(polo_id, escola_id, ano_letivo, serie);

-- Para atualizar a view (execute periodicamente ou após importações):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_metricas_dashboard;
*/

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- 1. Execute este script UMA VEZ após o deploy inicial
-- 2. Monitore a performance no Supabase Dashboard > Database > Query Performance
-- 3. Se as queries ainda estiverem lentas, considere criar a Materialized View
-- 4. Os índices ocupam espaço em disco, mas melhoram muito a performance
