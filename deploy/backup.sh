#!/bin/bash

# SISAM - Backup Automatizado
# Uso: sisam backup  ou  bash /opt/sisam/deploy/backup.sh
# Executado automaticamente via cron às 02:00

APP_DIR="/opt/sisam"
BACKUP_DIR="/var/backups/sisam"
RETENTION_DAYS=30
DATE=$(date +%Y-%m-%d_%H%M)

# Carregar configuração
if [ -f "${APP_DIR}/.env.local" ]; then
  source "${APP_DIR}/.env.local"
else
  echo "[ERRO] Arquivo .env.local não encontrado"
  exit 1
fi

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Verificar espaço em disco (mínimo 1GB livre)
DISK_FREE=$(df -BG "$BACKUP_DIR" | awk 'NR==2{print $4}' | tr -d 'G')
if [ "$DISK_FREE" -lt 1 ]; then
  echo "[ERRO] Espaço em disco insuficiente: ${DISK_FREE}GB"
  exit 1
fi

# Backup do banco de dados
BACKUP_FILE="${BACKUP_DIR}/sisam_${DATE}.sql.gz"
echo "[$(date)] Iniciando backup do banco de dados..."

PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup concluído: ${BACKUP_FILE} (${SIZE})"
else
  echo "[$(date)] ERRO ao criar backup!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Backup dos uploads
if [ -d "${APP_DIR}/public/uploads" ] && [ "$(ls -A ${APP_DIR}/public/uploads 2>/dev/null)" ]; then
  UPLOADS_BACKUP="${BACKUP_DIR}/uploads_${DATE}.tar.gz"
  tar -czf "$UPLOADS_BACKUP" -C "${APP_DIR}/public" uploads/ 2>/dev/null
  echo "[$(date)] Uploads salvos: ${UPLOADS_BACKUP}"
fi

# Limpar backups antigos
DELETED=$(find "$BACKUP_DIR" -name "sisam_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Removidos ${DELETED} backup(s) com mais de ${RETENTION_DAYS} dias"
fi

# Listar backups existentes
echo ""
echo "Backups disponíveis:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'
TOTAL=$(ls "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
echo "  Total: ${TOTAL} backup(s)"
