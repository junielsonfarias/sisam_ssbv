-- Adiciona campo para controlar quais escolas têm acesso ao módulo Gestor Escolar
-- Por padrão, todas as escolas NÃO têm acesso (false)
-- O admin pode habilitar individualmente

ALTER TABLE escolas
ADD COLUMN IF NOT EXISTS gestor_escolar_habilitado BOOLEAN DEFAULT false;

-- Comentário na coluna
COMMENT ON COLUMN escolas.gestor_escolar_habilitado IS 'Define se a escola tem acesso ao módulo Gestor Escolar';
