-- ============================================================================
-- MIGRATION: evento_tipo 'infrequencia' em notificacoes_disparos (Fase 4.1)
-- Permite registrar alertas de infrequencia (frequencia abaixo do minimo) ao
-- responsavel. Distinto de 'falta_consecutiva' (dias seguidos) — aqui eh o
-- percentual acumulado de frequencia abaixo do limiar configurado.
-- Idempotente: recria o CHECK incluindo o novo valor.
-- ============================================================================

BEGIN;

ALTER TABLE notificacoes_disparos
  DROP CONSTRAINT IF EXISTS notificacoes_disparos_evento_tipo_check;

ALTER TABLE notificacoes_disparos
  ADD CONSTRAINT notificacoes_disparos_evento_tipo_check CHECK (evento_tipo IN (
    'nota_lancada',
    'falta_consecutiva',
    'comunicado_novo',
    'ficai_aberto',
    'ordem_servico_criada',
    'ordem_servico_concluida',
    'cardapio_publicado',
    'reuniao_marcada',
    'declaracao_emitida',
    'matricula_aprovada',
    'infrequencia',
    'sistema'
  ));

-- Indice para a busca de deduplicacao (ultimo alerta de infrequencia por aluno).
CREATE INDEX IF NOT EXISTS idx_notif_infreq_aluno
  ON notificacoes_disparos ((dados->>'aluno_id'), criada_em DESC)
  WHERE evento_tipo = 'infrequencia';

COMMIT;
