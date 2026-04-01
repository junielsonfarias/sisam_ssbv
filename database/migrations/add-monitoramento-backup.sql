-- ============================================================================
-- Migration: Configurações de Monitoramento e Backup
-- Data: 2026-04-01
-- Descrição: Insere seções 'monitoramento' e 'backup' na tabela site_config
-- ============================================================================

-- Configuração de monitoramento (alertas por email/webhook)
INSERT INTO site_config (secao, conteudo)
VALUES (
  'monitoramento',
  '{
    "emails_alerta": [],
    "webhook_url": "",
    "intervalo_min": 5,
    "alertar_banco": true,
    "alertar_redis": true,
    "alertar_erro": true
  }'::jsonb
)
ON CONFLICT (secao) DO NOTHING;

-- Configuração de backup automático
INSERT INTO site_config (secao, conteudo)
VALUES (
  'backup',
  '{
    "google_drive_folder_id": "",
    "manter_ultimos": 30,
    "backup_automatico": false,
    "horario_backup": "03:00"
  }'::jsonb
)
ON CONFLICT (secao) DO NOTHING;

-- Tabela de logs de backup
CREATE TABLE IF NOT EXISTS logs_backup (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL DEFAULT 'manual',
  status VARCHAR(20) NOT NULL DEFAULT 'executando',
  tamanho_bytes BIGINT,
  tabelas_exportadas INTEGER,
  registros_exportados BIGINT,
  google_drive_file_id VARCHAR(255),
  erro TEXT,
  iniciado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  finalizado_em TIMESTAMP WITH TIME ZONE,
  executado_por UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_logs_backup_iniciado_em ON logs_backup (iniciado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_backup_status ON logs_backup (status);
