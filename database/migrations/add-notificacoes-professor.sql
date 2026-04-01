-- Migration: Adicionar novos tipos de notificação para professores
-- Data: 2026-04-01
-- Descrição: Expande os tipos de notificação para incluir tipos voltados ao professor

-- Remover constraint antiga e adicionar com novos tipos
ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE notificacoes ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN (
    'infrequencia', 'nota_baixa', 'prazo_conselho', 'transferencia',
    'fila_espera', 'recuperacao', 'geral',
    'periodo_aberto', 'resultados_publicados', 'aviso_admin', 'prazo_notas'
  ));

-- Índice para buscar notificações de professores
CREATE INDEX IF NOT EXISTS idx_notificacoes_professor
  ON notificacoes (destinatario_tipo, destinatario_id, lida, criado_em DESC)
  WHERE destinatario_tipo = 'professor';
