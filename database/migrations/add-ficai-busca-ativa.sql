-- ============================================================================
-- MIGRATION: FICAI - Busca Ativa Escolar (Fase 2 SEMED)
-- Sistema de monitoramento de infrequencia e encaminhamento para Conselho
-- Tutelar / Ministerio Publico conforme ECA Art. 56.
--
-- Gatilhos para alerta automatico:
--  - >= 50% de faltas em qualquer mes
--  - >= 5 dias consecutivos de ausencia
--  - >= 7 dias consecutivos para nao alfabetizado
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ficai_casos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  ano_letivo      VARCHAR(4) NOT NULL,
  -- Como o caso foi aberto
  origem          VARCHAR(30) NOT NULL DEFAULT 'sistema'
    CHECK (origem IN ('sistema', 'manual_escola', 'manual_polo', 'manual_admin')),
  -- Motivo do alerta
  motivo          VARCHAR(50) NOT NULL CHECK (motivo IN (
    'infrequencia_50',          -- 50%+ faltas em um mes
    'ausencia_consecutiva',     -- 5+ dias seguidos
    'abandono_suspeito',
    'evasao_confirmada',
    'outro'
  )),
  detalhes_motivo TEXT,
  -- Status do caso
  status          VARCHAR(30) NOT NULL DEFAULT 'aberto'
    CHECK (status IN (
      'aberto',
      'contato_responsavel',
      'aluno_retornou',
      'encaminhado_conselho_tutelar',
      'encaminhado_ministerio_publico',
      'concluido_aluno_transferido',
      'concluido_resolvido',
      'concluido_evasao_confirmada',
      'cancelado'
    )),
  -- Dados da infrequencia que disparou (snapshot)
  faltas_consecutivas INTEGER,
  pct_faltas_mes      NUMERIC(5,2),
  ultima_presenca     DATE,
  -- Datas do fluxo
  aberto_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contato_responsavel_em TIMESTAMPTZ,
  encaminhado_em  TIMESTAMPTZ,
  concluido_em    TIMESTAMPTZ,
  -- Responsavel pelo caso (servidor)
  responsavel_caso_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Notas/observacoes do caso (atualizadas durante o fluxo)
  observacoes     TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Um aluno so pode ter um caso aberto por ano letivo
  UNIQUE (aluno_id, ano_letivo, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_ficai_aluno ON ficai_casos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_ficai_escola ON ficai_casos(escola_id);
CREATE INDEX IF NOT EXISTS idx_ficai_status ON ficai_casos(status) WHERE status NOT IN ('concluido_aluno_transferido', 'concluido_resolvido', 'concluido_evasao_confirmada', 'cancelado');
CREATE INDEX IF NOT EXISTS idx_ficai_aberto ON ficai_casos(aberto_em DESC);

COMMENT ON TABLE ficai_casos IS
  'FICAI (Ficha de Comunicacao do Aluno Infrequente). Rastreia casos de infrequencia/evasao desde a deteccao ate a resolucao.';

-- Acoes tomadas no caso (timeline)
CREATE TABLE IF NOT EXISTS ficai_acoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id         UUID NOT NULL REFERENCES ficai_casos(id) ON DELETE CASCADE,
  tipo            VARCHAR(40) NOT NULL CHECK (tipo IN (
    'contato_telefone',
    'contato_visita',
    'contato_email',
    'contato_whatsapp',
    'reuniao_responsavel',
    'aluno_retornou',
    'encaminhamento_conselho_tutelar',
    'encaminhamento_ministerio_publico',
    'oficio_emitido',
    'mudanca_status',
    'observacao'
  )),
  descricao       TEXT NOT NULL,
  -- Anexo (URL para documento, foto de comprovante etc.)
  anexo_url       VARCHAR(500),
  realizado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  realizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ficai_acoes_caso ON ficai_acoes(caso_id, realizado_em DESC);

COMMIT;
