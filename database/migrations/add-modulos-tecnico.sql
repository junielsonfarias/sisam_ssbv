-- Migration: Tabela de Configuração de Módulos para Técnico
-- Permite que administradores controlem quais módulos estão disponíveis para técnicos

CREATE TABLE IF NOT EXISTS modulos_tecnico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modulo_key VARCHAR(100) UNIQUE NOT NULL,
  modulo_label VARCHAR(255) NOT NULL,
  habilitado BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir módulos padrão (todos habilitados por padrão)
INSERT INTO modulos_tecnico (modulo_key, modulo_label, habilitado, ordem) VALUES
  ('resultados', 'Resultados', true, 1),
  ('comparativos', 'Comparativos', true, 2),
  ('escolas', 'Escolas', true, 3),
  ('polos', 'Polos', true, 4),
  ('alunos', 'Alunos', true, 5)
ON CONFLICT (modulo_key) DO NOTHING;

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_modulos_tecnico_habilitado ON modulos_tecnico(habilitado);
CREATE INDEX IF NOT EXISTS idx_modulos_tecnico_ordem ON modulos_tecnico(ordem);

