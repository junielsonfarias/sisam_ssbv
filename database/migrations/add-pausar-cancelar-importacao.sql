-- Migration: Adicionar suporte para pausar e cancelar importações
-- Data: 2025-01-01

-- Atualizar constraint de status para incluir 'pausado' e 'cancelado'
ALTER TABLE importacoes 
DROP CONSTRAINT IF EXISTS importacoes_status_check;

ALTER TABLE importacoes 
ADD CONSTRAINT importacoes_status_check 
CHECK (status IN ('processando', 'pausado', 'concluido', 'erro', 'cancelado'));

