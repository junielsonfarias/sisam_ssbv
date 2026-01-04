-- Migration: Prevenir duplicatas de alunos
-- Data: 2025-01-XX
-- Descrição: Adiciona índice único para evitar alunos duplicados (mesmo nome, escola, turma e ano letivo)

-- Remover duplicatas existentes antes de criar a constraint
-- Mantém apenas o registro mais recente para cada combinação (nome, escola_id, turma_id, ano_letivo)
DELETE FROM alunos a1
USING alunos a2
WHERE a1.id < a2.id
  AND UPPER(TRIM(a1.nome)) = UPPER(TRIM(a2.nome))
  AND a1.escola_id = a2.escola_id
  AND (a1.turma_id = a2.turma_id OR (a1.turma_id IS NULL AND a2.turma_id IS NULL))
  AND (a1.ano_letivo = a2.ano_letivo OR (a1.ano_letivo IS NULL AND a2.ano_letivo IS NULL))
  AND a1.ativo = true
  AND a2.ativo = true;

-- Criar índice único para prevenir duplicatas
-- Usa expressão para tratar NULLs: converte NULL para string vazia para turma_id e ano_letivo
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_unique_nome_escola_turma_ano
ON alunos (
  UPPER(TRIM(nome)),
  escola_id,
  COALESCE(turma_id::text, ''),
  COALESCE(ano_letivo, '')
)
WHERE ativo = true;

-- Comentário explicativo
COMMENT ON INDEX idx_alunos_unique_nome_escola_turma_ano IS 
'Índice único para prevenir alunos duplicados com mesmo nome, escola, turma e ano letivo';

