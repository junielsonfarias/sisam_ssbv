-- Migration: Otimizar importação e adicionar histórico
-- Data: 2025-01-01

-- 1. Adicionar ano_letivo na tabela importacoes
ALTER TABLE importacoes 
ADD COLUMN IF NOT EXISTS ano_letivo VARCHAR(10);

-- 2. Remover duplicatas antes de criar índice único
-- Primeiro, remover registros duplicados mantendo apenas o mais recente
DELETE FROM resultados_provas r1
USING resultados_provas r2
WHERE r1.id < r2.id
  AND r1.aluno_id = r2.aluno_id
  AND r1.questao_codigo = r2.questao_codigo
  AND r1.ano_letivo = r2.ano_letivo;

-- Agora criar índice único em resultados_provas para evitar duplicatas e melhorar performance
-- Este índice permite usar ON CONFLICT DO NOTHING de forma eficiente
CREATE UNIQUE INDEX IF NOT EXISTS idx_resultados_provas_unique 
ON resultados_provas(aluno_id, questao_codigo, ano_letivo);

-- 3. Adicionar índices adicionais para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_resultados_provas_aluno_questao_ano 
ON resultados_provas(aluno_id, questao_codigo, ano_letivo);

-- 4. Adicionar campos de estatísticas na tabela importacoes para histórico
ALTER TABLE importacoes 
ADD COLUMN IF NOT EXISTS polos_criados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS polos_existentes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS escolas_criadas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS escolas_existentes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS turmas_criadas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS turmas_existentes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS alunos_criados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS alunos_existentes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS questoes_criadas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS questoes_existentes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resultados_novos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resultados_duplicados INTEGER DEFAULT 0;

-- 5. Adicionar índice para melhorar consultas de histórico
CREATE INDEX IF NOT EXISTS idx_importacoes_usuario ON importacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_ano_letivo ON importacoes(ano_letivo);
CREATE INDEX IF NOT EXISTS idx_importacoes_status ON importacoes(status);
CREATE INDEX IF NOT EXISTS idx_importacoes_criado_em ON importacoes(criado_em);

