-- ============================================================================
-- MIGRATION: Ordens de Servico (Fase 3 SEMED)
-- Escola abre solicitacao, SEMED recebe e atende.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ordens_servico (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Numero sequencial visivel (ex: OS-2026-000123)
  numero          VARCHAR(20) UNIQUE NOT NULL,
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) NOT NULL CHECK (tipo IN (
    'predial', 'eletrica', 'hidraulica', 'mobiliario',
    'ti', 'rede_internet', 'limpeza', 'jardinagem',
    'pintura', 'estrutural', 'merenda_equip', 'outros'
  )),
  prioridade      VARCHAR(20) NOT NULL DEFAULT 'media'
    CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  titulo          VARCHAR(255) NOT NULL,
  descricao       TEXT NOT NULL,
  -- Localizacao no predio
  local_escola    VARCHAR(255),
  -- Status do workflow
  status          VARCHAR(30) NOT NULL DEFAULT 'aberta'
    CHECK (status IN (
      'aberta',
      'em_analise',
      'aprovada',
      'em_atendimento',
      'aguardando_material',
      'aguardando_terceiros',
      'concluida',
      'cancelada',
      'reaberta'
    )),
  -- Anexos (fotos do problema)
  fotos_urls      TEXT[] DEFAULT '{}',
  -- Quem abriu (escola/diretor)
  aberta_por      UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  aberta_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Quem esta atendendo (SEMED)
  responsavel_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Data prevista de conclusao (SLA informal)
  prevista_para   DATE,
  concluida_em    TIMESTAMPTZ,
  cancelada_em    TIMESTAMPTZ,
  -- Avaliacao do servico apos conclusao (estrelas 1-5)
  avaliacao_estrelas SMALLINT CHECK (avaliacao_estrelas BETWEEN 1 AND 5),
  avaliacao_comentario TEXT,
  -- Custo estimado / real (controle financeiro basico)
  custo_estimado  NUMERIC(10,2),
  custo_real      NUMERIC(10,2),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_escola ON ordens_servico(escola_id, status);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status) WHERE status NOT IN ('concluida', 'cancelada');
CREATE INDEX IF NOT EXISTS idx_os_responsavel ON ordens_servico(responsavel_id) WHERE responsavel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_os_aberta_em ON ordens_servico(aberta_em DESC);
CREATE INDEX IF NOT EXISTS idx_os_prioridade ON ordens_servico(prioridade, status)
  WHERE prioridade IN ('alta', 'urgente') AND status NOT IN ('concluida', 'cancelada');

-- Comentarios/timeline da OS
CREATE TABLE IF NOT EXISTS ordens_servico_comentarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id        UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  autor_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  texto           TEXT NOT NULL,
  -- Mudou status nesta acao?
  status_anterior VARCHAR(30),
  status_novo     VARCHAR(30),
  anexos_urls     TEXT[] DEFAULT '{}',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_com_ordem ON ordens_servico_comentarios(ordem_id, criado_em DESC);

-- Sequence para numero da OS (ano + sequencial)
CREATE OR REPLACE FUNCTION gerar_numero_os() RETURNS TRIGGER AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  v_ano := to_char(NOW(), 'YYYY');
  SELECT COALESCE(MAX(SUBSTRING(numero FROM '\d+$')::INTEGER), 0) + 1
    INTO v_seq
    FROM ordens_servico
   WHERE numero LIKE 'OS-' || v_ano || '-%';
  NEW.numero := 'OS-' || v_ano || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_numero_os ON ordens_servico;
CREATE TRIGGER trg_gerar_numero_os
  BEFORE INSERT ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION gerar_numero_os();

COMMENT ON TABLE ordens_servico IS 'Demandas da escola para a SEMED (manutencao predial, TI, mobiliario).';
COMMENT ON TABLE ordens_servico_comentarios IS 'Timeline de interacoes da OS.';

COMMIT;
