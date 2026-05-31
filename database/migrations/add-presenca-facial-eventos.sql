-- ============================================================================
-- add-presenca-facial-eventos.sql
-- Data: 2026-05-31
--
-- Historico bruto de eventos do terminal facial. Cada scan vira 1 linha
-- com tipo classificado:
--   entrada  = primeiro scan do dia OU primeiro apos uma saida valida
--   saida    = scan apos uma entrada com >= 30 min de diferenca
--   duplicado= scan dentro de janela curta (erro provavel: aluno passou
--              de novo logo apos entrar/sair)
--
-- Motivacao: o INSERT em frequencia_diaria com ON CONFLICT sobrescrevia
-- hora_saida a cada scan — se aluno passasse acidentalmente as 7:15 logo
-- apos chegar as 7:00, "hora_saida" virava 7:15 (errado).
--
-- Agora frequencia_diaria.hora_entrada = primeira entrada do dia;
-- hora_saida = ultima saida do dia. Historico completo fica aqui.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS presenca_facial_eventos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE RESTRICT,
  dispositivo_id  UUID REFERENCES dispositivos_faciais(id) ON DELETE SET NULL,
  registrado_em   TIMESTAMPTZ NOT NULL,
  data            DATE NOT NULL,
  tipo            VARCHAR(15) NOT NULL CHECK (tipo IN ('entrada','saida','duplicado')),
  confianca       NUMERIC(5,4),
  origem          VARCHAR(20) NOT NULL DEFAULT 'dispositivo' CHECK (origem IN ('dispositivo','terminal_web')),
  registrado_por  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presenca_facial_eventos_aluno
  ON presenca_facial_eventos(aluno_id, data DESC, registrado_em DESC);

CREATE INDEX IF NOT EXISTS idx_presenca_facial_eventos_escola
  ON presenca_facial_eventos(escola_id, data DESC);

ALTER TABLE presenca_facial_eventos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE presenca_facial_eventos IS
  'Historico bruto de eventos do terminal facial. Cada scan vira 1 linha. Classificacao em entrada/saida/duplicado feita por presenca-facial-eventos.service.ts (janelas anti-erro: 30min entre entrada e saida; <30min vira duplicado).';
COMMENT ON COLUMN presenca_facial_eventos.tipo IS
  'entrada=primeiro do dia ou apos saida valida; saida=apos entrada com >=30min; duplicado=scan dentro de janela (erro provavel).';

COMMIT;
