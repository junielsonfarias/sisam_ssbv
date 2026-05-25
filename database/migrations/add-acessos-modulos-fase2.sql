-- ============================================================================
-- MIGRATION: Expansão de acessos a módulos (Fase 2)
-- Adiciona 3 novos módulos (SEMED, Transparência, Administração) e
-- preenche defaults sensatos por tipo de usuário.
--
-- Antes: acesso_sisam, acesso_gestor
-- Depois: + acesso_semed, acesso_transparencia, acesso_admin
-- ============================================================================

-- 1) Novas colunas (default FALSE — preenchido por tipo abaixo)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS acesso_semed         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS acesso_transparencia BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS acesso_admin         BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Defaults por tipo de usuário existente
-- Administrador: acesso total
UPDATE usuarios
   SET acesso_sisam         = TRUE,
       acesso_gestor        = TRUE,
       acesso_semed         = TRUE,
       acesso_transparencia = TRUE,
       acesso_admin         = TRUE
 WHERE tipo_usuario IN ('administrador', 'admin');

-- Técnico: tudo exceto Administração técnica (Backup, Logs, etc.)
UPDATE usuarios
   SET acesso_sisam         = TRUE,
       acesso_gestor        = TRUE,
       acesso_semed         = TRUE,
       acesso_transparencia = TRUE,
       acesso_admin         = FALSE
 WHERE tipo_usuario = 'tecnico';

-- Polo: SISAM + visão SEMED consolidada (FICAI/AEE)
UPDATE usuarios
   SET acesso_sisam         = TRUE,
       acesso_gestor        = FALSE,
       acesso_semed         = TRUE,
       acesso_transparencia = FALSE,
       acesso_admin         = FALSE
 WHERE tipo_usuario = 'polo';

-- Escola: Gestor escolar (se a ESCOLA tem habilitação) + SEMED operacional
-- A flag `gestor_escolar_habilitado` está na tabela `escolas`, não em `usuarios`
UPDATE usuarios u
   SET acesso_sisam         = FALSE,
       acesso_gestor        = COALESCE((SELECT e.gestor_escolar_habilitado FROM escolas e WHERE e.id = u.escola_id), FALSE),
       acesso_semed         = COALESCE((SELECT e.gestor_escolar_habilitado FROM escolas e WHERE e.id = u.escola_id), FALSE),
       acesso_transparencia = FALSE,
       acesso_admin         = FALSE
 WHERE u.tipo_usuario = 'escola';

-- Editor / Publicador: apenas Transparência
UPDATE usuarios
   SET acesso_sisam         = FALSE,
       acesso_gestor        = FALSE,
       acesso_semed         = FALSE,
       acesso_transparencia = TRUE,
       acesso_admin         = FALSE
 WHERE tipo_usuario IN ('editor', 'publicador');

-- Professor / Responsável: portal próprio (não usam o seletor de módulos)
UPDATE usuarios
   SET acesso_sisam         = FALSE,
       acesso_gestor        = FALSE,
       acesso_semed         = FALSE,
       acesso_transparencia = FALSE,
       acesso_admin         = FALSE
 WHERE tipo_usuario IN ('professor', 'responsavel');

-- 3) Índice para consultas frequentes (busca por usuários com acesso X)
CREATE INDEX IF NOT EXISTS idx_usuarios_acesso_semed
  ON usuarios(acesso_semed) WHERE acesso_semed = TRUE;

CREATE INDEX IF NOT EXISTS idx_usuarios_acesso_admin
  ON usuarios(acesso_admin) WHERE acesso_admin = TRUE;

-- 4) Comentários
COMMENT ON COLUMN usuarios.acesso_semed IS
  'Permissão de acesso ao módulo SEMED (programas federais + recursos)';
COMMENT ON COLUMN usuarios.acesso_transparencia IS
  'Permissão de acesso ao módulo Transparência (site, notícias, ouvidoria)';
COMMENT ON COLUMN usuarios.acesso_admin IS
  'Permissão de acesso ao módulo Administração técnica (backup, logs, segurança)';
