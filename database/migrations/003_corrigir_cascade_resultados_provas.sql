-- Migration: Corrigir exclusão em cascata de resultados_provas
-- Data: 2026-01-10
-- Descrição: Altera a constraint de ON DELETE SET NULL para ON DELETE CASCADE
--            para garantir que quando um aluno é excluído, todos os seus resultados
--            de provas também sejam excluídos automaticamente.

-- =====================================================
-- PARTE 1: LIMPAR DADOS ÓRFÃOS EXISTENTES
-- =====================================================

-- Verificar quantos registros órfãos existem (para log)
DO $$
DECLARE
  total_orfaos INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_orfaos FROM resultados_provas WHERE aluno_id IS NULL;
  RAISE NOTICE 'Total de registros órfãos a serem deletados: %', total_orfaos;
END $$;

-- Deletar registros órfãos (alunos que foram excluídos mas deixaram dados)
DELETE FROM resultados_provas WHERE aluno_id IS NULL;

-- =====================================================
-- PARTE 2: ALTERAR CONSTRAINT PARA CASCADE
-- =====================================================

-- Remover a constraint atual (ON DELETE SET NULL)
ALTER TABLE resultados_provas
DROP CONSTRAINT IF EXISTS resultados_provas_aluno_id_fkey;

-- Adicionar nova constraint com ON DELETE CASCADE
-- Agora quando um aluno for excluído, todos os seus resultados serão deletados automaticamente
ALTER TABLE resultados_provas
ADD CONSTRAINT resultados_provas_aluno_id_fkey
FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  orfaos_restantes INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfaos_restantes FROM resultados_provas WHERE aluno_id IS NULL;
  IF orfaos_restantes = 0 THEN
    RAISE NOTICE 'Migration concluída com sucesso! Nenhum registro órfão restante.';
  ELSE
    RAISE WARNING 'Ainda existem % registros órfãos!', orfaos_restantes;
  END IF;
END $$;
