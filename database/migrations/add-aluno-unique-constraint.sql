-- Migração: Adicionar constraint UNIQUE para evitar duplicatas de alunos
-- Data: 2026-01-07
-- Descrição: Garante que não haja alunos duplicados por nome, escola e ano letivo

-- Primeiro, identificar e remover possíveis duplicatas mantendo o registro mais recente
-- (Criar tabela temporária com IDs a manter)
WITH duplicatas AS (
  SELECT id, nome, escola_id, ano_letivo,
         ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(nome)), escola_id, ano_letivo ORDER BY criado_em DESC) as rn
  FROM alunos
)
DELETE FROM alunos
WHERE id IN (
  SELECT id FROM duplicatas WHERE rn > 1
);

-- Criar constraint UNIQUE para evitar duplicatas futuras
-- Usando índice único em vez de constraint para permitir expressão (UPPER, TRIM)
DROP INDEX IF EXISTS idx_alunos_nome_escola_ano_unique;

CREATE UNIQUE INDEX idx_alunos_nome_escola_ano_unique
ON alunos (UPPER(TRIM(nome)), escola_id, ano_letivo);

-- Adicionar comentário
COMMENT ON INDEX idx_alunos_nome_escola_ano_unique IS 'Garante unicidade de alunos por nome normalizado, escola e ano letivo';
