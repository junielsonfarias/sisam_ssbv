-- Migration: Adicionar turma_id na tabela notas_escolares
-- Objetivo: Permitir JOIN direto entre notas_escolares e turmas sem passar por alunos

-- 1. Adicionar coluna turma_id
ALTER TABLE notas_escolares
  ADD COLUMN IF NOT EXISTS turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_notas_esc_turma ON notas_escolares(turma_id);

-- 3. Backfill turma_id a partir da tabela alunos
UPDATE notas_escolares ne
SET turma_id = a.turma_id
FROM alunos a
WHERE ne.aluno_id = a.id
  AND ne.turma_id IS NULL;
