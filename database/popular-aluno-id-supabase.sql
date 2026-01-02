-- Script para popular aluno_id na tabela resultados_provas
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- ETAPA 1: VERIFICAR ESTATÍSTICAS ANTES
-- ============================================
SELECT 
  'ANTES DA ATUALIZAÇÃO' as etapa,
  COUNT(*) as total_registros,
  COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as com_aluno_id,
  COUNT(*) - COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as sem_aluno_id,
  COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as com_codigo,
  COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as com_nome
FROM resultados_provas;

-- ============================================
-- ETAPA 2: ATUALIZAR POR CÓDIGO DO ALUNO
-- ============================================
-- Atualiza registros onde temos aluno_codigo e podemos encontrar o aluno correspondente
UPDATE resultados_provas rp
SET aluno_id = a.id
FROM alunos a
WHERE rp.aluno_id IS NULL
  AND rp.aluno_codigo IS NOT NULL
  AND rp.aluno_codigo = a.codigo;

-- Mostrar quantos foram atualizados
SELECT 
  'Atualizados por código' as tipo,
  COUNT(*) as quantidade
FROM resultados_provas
WHERE aluno_id IS NOT NULL
  AND aluno_codigo IS NOT NULL;

-- ============================================
-- ETAPA 3: ATUALIZAR POR NOME DO ALUNO
-- ============================================
-- Atualiza registros onde temos aluno_nome e podemos encontrar o aluno correspondente
-- Usa comparação case-insensitive e trim para melhor matching
UPDATE resultados_provas rp
SET aluno_id = a.id
FROM alunos a
WHERE rp.aluno_id IS NULL
  AND rp.aluno_nome IS NOT NULL
  AND UPPER(TRIM(rp.aluno_nome)) = UPPER(TRIM(a.nome))
  -- Adicionar correspondência por ano letivo se disponível para evitar matches errados
  AND (
    rp.ano_letivo IS NULL 
    OR a.ano_letivo IS NULL 
    OR rp.ano_letivo = a.ano_letivo
  );

-- Mostrar quantos foram atualizados
SELECT 
  'Atualizados por nome' as tipo,
  COUNT(*) as quantidade
FROM resultados_provas
WHERE aluno_id IS NOT NULL
  AND aluno_nome IS NOT NULL
  AND (aluno_codigo IS NULL OR aluno_codigo = '');

-- ============================================
-- ETAPA 4: VERIFICAR ESTATÍSTICAS DEPOIS
-- ============================================
SELECT 
  'DEPOIS DA ATUALIZAÇÃO' as etapa,
  COUNT(*) as total_registros,
  COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as com_aluno_id,
  COUNT(*) - COUNT(DISTINCT aluno_id) FILTER (WHERE aluno_id IS NOT NULL) as sem_aluno_id,
  COUNT(DISTINCT aluno_codigo) FILTER (WHERE aluno_codigo IS NOT NULL) as com_codigo,
  COUNT(DISTINCT aluno_nome) FILTER (WHERE aluno_nome IS NOT NULL) as com_nome
FROM resultados_provas;

-- ============================================
-- ETAPA 5: DIAGNÓSTICO DE REGISTROS NÃO VINCULADOS
-- ============================================
-- Mostrar exemplos de registros que não puderam ser vinculados
SELECT 
  aluno_codigo,
  aluno_nome,
  ano_letivo,
  COUNT(*) as total_questoes,
  COUNT(DISTINCT questao_codigo) as questoes_distintas
FROM resultados_provas
WHERE aluno_id IS NULL
GROUP BY aluno_codigo, aluno_nome, ano_letivo
ORDER BY total_questoes DESC
LIMIT 20;

-- ============================================
-- ETAPA 6: VERIFICAR INTEGRIDADE
-- ============================================
-- Verificar se há alunos com resultados mas sem vinculação
SELECT 
  a.id as aluno_id,
  a.nome as aluno_nome,
  a.codigo as aluno_codigo,
  COUNT(rp.id) as registros_em_resultados_provas
FROM alunos a
LEFT JOIN resultados_provas rp ON (
  rp.aluno_id = a.id 
  OR (rp.aluno_codigo = a.codigo AND rp.aluno_codigo IS NOT NULL)
  OR (UPPER(TRIM(rp.aluno_nome)) = UPPER(TRIM(a.nome)) AND rp.aluno_nome IS NOT NULL)
)
GROUP BY a.id, a.nome, a.codigo
HAVING COUNT(rp.id) > 0
ORDER BY registros_em_resultados_provas DESC
LIMIT 10;

