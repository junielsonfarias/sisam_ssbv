-- Migration: Adicionar colunas de níveis por disciplina para Anos Iniciais
-- Data: 2026-01-19
-- Descrição: Adiciona campos para níveis LP, MAT, Produção e nível geral do aluno

-- Adicionar colunas de níveis por disciplina
ALTER TABLE resultados_consolidados
ADD COLUMN IF NOT EXISTS nivel_lp VARCHAR(5),
ADD COLUMN IF NOT EXISTS nivel_mat VARCHAR(5),
ADD COLUMN IF NOT EXISTS nivel_prod VARCHAR(5),
ADD COLUMN IF NOT EXISTS nivel_aluno VARCHAR(5);

-- Índice para consultas por nível do aluno
CREATE INDEX IF NOT EXISTS idx_resultados_nivel_aluno
ON resultados_consolidados(nivel_aluno);

-- Índice para consultas por nível LP
CREATE INDEX IF NOT EXISTS idx_resultados_nivel_lp
ON resultados_consolidados(nivel_lp);

-- Índice para consultas por nível MAT
CREATE INDEX IF NOT EXISTS idx_resultados_nivel_mat
ON resultados_consolidados(nivel_mat);

-- Comentários nas colunas
COMMENT ON COLUMN resultados_consolidados.nivel_lp IS 'Nível de LP baseado em acertos (N1, N2, N3, N4)';
COMMENT ON COLUMN resultados_consolidados.nivel_mat IS 'Nível de MAT baseado em acertos (N1, N2, N3, N4)';
COMMENT ON COLUMN resultados_consolidados.nivel_prod IS 'Nível de Produção convertido (N1, N2, N3, N4)';
COMMENT ON COLUMN resultados_consolidados.nivel_aluno IS 'Nível geral do aluno (média dos 3 níveis)';
