-- ============================================================================
-- Migration: Controle de acesso a modulos por usuario
-- Data: 2026-04-10
-- Descricao: Adiciona colunas acesso_sisam e acesso_gestor na tabela usuarios
--            para controlar quais modulos cada usuario pode acessar
-- ============================================================================

-- Adicionar colunas de acesso
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acesso_sisam BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acesso_gestor BOOLEAN DEFAULT false;

-- Administradores e tecnicos: acesso a ambos os modulos por padrao
UPDATE usuarios SET acesso_sisam = true, acesso_gestor = true
WHERE tipo_usuario IN ('administrador', 'tecnico');

-- Escolas com gestor escolar habilitado: manter acesso ao gestor
UPDATE usuarios SET acesso_gestor = true
WHERE tipo_usuario = 'escola'
  AND escola_id IN (SELECT id FROM escolas WHERE gestor_escolar_habilitado = true);

-- Indice para consultas de acesso
CREATE INDEX IF NOT EXISTS idx_usuarios_acesso_modulos
ON usuarios (acesso_sisam, acesso_gestor) WHERE ativo = true;
