-- ============================================
-- MIGRACAO: Criar tabela de logs de acesso
-- ============================================
-- Esta tabela registra todos os logins bem-sucedidos
-- para permitir auditoria e analise de uso do sistema.
-- ============================================

-- Criar tabela de logs de acesso
CREATE TABLE IF NOT EXISTS logs_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nome VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  tipo_usuario VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_logs_acesso_usuario ON logs_acesso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_email ON logs_acesso(email);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_criado_em ON logs_acesso(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_tipo ON logs_acesso(tipo_usuario);

-- Indice composto para consultas por periodo
CREATE INDEX IF NOT EXISTS idx_logs_acesso_data_tipo ON logs_acesso(criado_em DESC, tipo_usuario);

-- Comentario na tabela
COMMENT ON TABLE logs_acesso IS 'Registra todos os logins bem-sucedidos no sistema para auditoria e analise de uso.';
COMMENT ON COLUMN logs_acesso.usuario_id IS 'ID do usuario que fez login (pode ser NULL se usuario foi removido)';
COMMENT ON COLUMN logs_acesso.usuario_nome IS 'Nome do usuario no momento do login';
COMMENT ON COLUMN logs_acesso.email IS 'Email usado para login';
COMMENT ON COLUMN logs_acesso.tipo_usuario IS 'Tipo do usuario: administrador, tecnico, polo, escola';
COMMENT ON COLUMN logs_acesso.ip_address IS 'Endereco IP do cliente (parcialmente mascarado para privacidade)';
COMMENT ON COLUMN logs_acesso.user_agent IS 'User-Agent do navegador/cliente';
COMMENT ON COLUMN logs_acesso.criado_em IS 'Data e hora do login';
