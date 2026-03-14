-- ============================================
-- MIGRACAO: Controle de Vagas + Notificações
-- Data: 2026-03-14
-- ============================================

-- ============================================
-- ETAPA 1: CONTROLE DE VAGAS
-- ============================================

-- Adicionar capacidade máxima nas turmas
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER DEFAULT 35;

-- Tabela de fila de espera
CREATE TABLE IF NOT EXISTS fila_espera (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  posicao INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'convocado', 'matriculado', 'desistente')),
  observacao TEXT,
  data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_convocacao TIMESTAMP,
  data_resolucao TIMESTAMP,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aluno_id, turma_id)
);

CREATE INDEX IF NOT EXISTS idx_fila_espera_turma ON fila_espera(turma_id, status);
CREATE INDEX IF NOT EXISTS idx_fila_espera_escola ON fila_espera(escola_id);

-- Trigger de atualização
CREATE OR REPLACE FUNCTION atualizar_timestamp_fila_espera()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_fila_espera ON fila_espera;
CREATE TRIGGER trigger_atualizar_fila_espera
  BEFORE UPDATE ON fila_espera
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_fila_espera();

-- ============================================
-- ETAPA 2: NOTIFICAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'infrequencia', 'nota_baixa', 'prazo_conselho', 'transferencia',
    'fila_espera', 'recuperacao', 'geral'
  )),
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  prioridade VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),

  -- Destino
  destinatario_tipo VARCHAR(20) NOT NULL CHECK (destinatario_tipo IN ('administrador', 'tecnico', 'polo', 'escola')),
  destinatario_id UUID, -- usuario específico (null = todos do tipo)
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  polo_id UUID REFERENCES polos(id) ON DELETE CASCADE,

  -- Referências opcionais
  aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
  turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,

  -- Status
  lida BOOLEAN DEFAULT FALSE,
  lida_em TIMESTAMP,
  lida_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Datas
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expira_em TIMESTAMP -- notificações podem expirar
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_dest ON notificacoes(destinatario_tipo, lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_escola ON notificacoes(escola_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_criado ON notificacoes(criado_em DESC);

-- Trigger de atualização
CREATE OR REPLACE FUNCTION atualizar_timestamp_notificacoes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_notificacoes ON notificacoes;
CREATE TRIGGER trigger_atualizar_notificacoes
  BEFORE UPDATE ON notificacoes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp_notificacoes();

-- ============================================
-- VERIFICACAO FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Migração Controle de Vagas + Notificações concluída ===';
  RAISE NOTICE 'Tabelas: fila_espera, notificacoes';
  RAISE NOTICE 'Coluna adicionada: turmas.capacidade_maxima';
END $$;
