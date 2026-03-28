-- ============================================
-- MIGRACAO: Criar tabela de logs de auditoria
-- ============================================
-- Tabela para auditoria expandida de ações no sistema.
-- Registra criações, edições, exclusões e outras ações
-- com detalhes do que foi alterado.
-- ============================================

CREATE TABLE IF NOT EXISTS logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_email VARCHAR(255),
  acao VARCHAR(50) NOT NULL,
  entidade VARCHAR(50) NOT NULL,
  entidade_id UUID,
  detalhes JSONB,
  ip VARCHAR(45),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_logs_aud_usuario ON logs_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_aud_acao ON logs_auditoria(acao);
CREATE INDEX IF NOT EXISTS idx_logs_aud_entidade ON logs_auditoria(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_logs_aud_data ON logs_auditoria(criado_em DESC);

-- Comentarios
COMMENT ON TABLE logs_auditoria IS 'Registra ações de auditoria no sistema (criar, editar, excluir, transferir, etc.)';
COMMENT ON COLUMN logs_auditoria.acao IS 'Tipo da ação: criar, editar, excluir, transferir, alterar_situacao, alterar_nota, login, logout';
COMMENT ON COLUMN logs_auditoria.entidade IS 'Entidade afetada: aluno, turma, nota, frequencia, publicacao, usuario';
COMMENT ON COLUMN logs_auditoria.detalhes IS 'Detalhes da alteração em formato JSON, ex: { campo: "situacao", de: "cursando", para: "transferido" }';
