-- ============================================================================
-- MIGRATION: Documentos Emitidos (Fase 2 SEMED)
-- Rastreamento de todos os documentos formais gerados (histórico, transferência,
-- declarações, atestados) com código de validação por QR.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS documentos_emitidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Codigo curto e unico para validacao publica (URL: /validar/<codigo>)
  codigo_validacao VARCHAR(16) NOT NULL UNIQUE,
  -- Hash SHA-256 do conteudo + timestamp (anti-adulteracao)
  hash_conteudo   VARCHAR(64) NOT NULL,
  tipo            VARCHAR(50) NOT NULL CHECK (tipo IN (
    'historico_escolar',
    'guia_transferencia',
    'declaracao_matricula',
    'declaracao_frequencia',
    'declaracao_conclusao',
    'declaracao_transferencia',
    'boletim_escolar',
    'certificado_eja'
  )),
  -- Aluno titular do documento
  aluno_id        UUID REFERENCES alunos(id) ON DELETE SET NULL,
  -- Snapshot dos dados no momento da emissao (JSON)
  dados_snapshot  JSONB NOT NULL,
  -- Quem emitiu
  emitido_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  emitido_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Escola que emitiu (snapshot - escola pode mudar nome depois)
  escola_id       UUID REFERENCES escolas(id) ON DELETE SET NULL,
  escola_nome_snapshot VARCHAR(255),
  -- Status
  status          VARCHAR(20) NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'cancelado', 'substituido')),
  cancelado_em    TIMESTAMPTZ,
  cancelado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo_cancelamento TEXT,
  -- Documento substituidor (se foi reemitido)
  substituido_por_id UUID REFERENCES documentos_emitidos(id) ON DELETE SET NULL,
  -- URL do PDF gerado (se armazenado em storage)
  pdf_url         VARCHAR(500),
  -- Estatisticas
  vezes_validado  INTEGER NOT NULL DEFAULT 0,
  ultima_validacao TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_docemit_codigo ON documentos_emitidos(codigo_validacao);
CREATE INDEX IF NOT EXISTS idx_docemit_aluno ON documentos_emitidos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_docemit_tipo ON documentos_emitidos(tipo);
CREATE INDEX IF NOT EXISTS idx_docemit_emitido_em ON documentos_emitidos(emitido_em DESC);
CREATE INDEX IF NOT EXISTS idx_docemit_status ON documentos_emitidos(status) WHERE status != 'ativo';

COMMENT ON TABLE documentos_emitidos IS
  'Documentos formais emitidos pelo sistema com codigo de validacao publica. Snapshot do conteudo preservado para auditoria.';

COMMENT ON COLUMN documentos_emitidos.codigo_validacao IS
  'Codigo curto unico (8-16 chars) usado na URL publica de validacao: /validar/<codigo>';

COMMENT ON COLUMN documentos_emitidos.hash_conteudo IS
  'SHA-256(JSON canonico do snapshot + emitido_em). Garante integridade do documento.';

-- Log de validacoes publicas (rastreabilidade)
CREATE TABLE IF NOT EXISTS documentos_validacoes_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id    UUID NOT NULL REFERENCES documentos_emitidos(id) ON DELETE CASCADE,
  validado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_origem       VARCHAR(45),
  user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS idx_docval_doc ON documentos_validacoes_log(documento_id, validado_em DESC);

COMMIT;
