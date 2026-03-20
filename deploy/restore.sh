#!/bin/bash

# SISAM - Restauração de Backup
# Uso: sudo bash /opt/sisam/deploy/restore.sh [arquivo.sql.gz]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="/opt/sisam"
BACKUP_DIR="/var/backups/sisam"
APP_USER="sisam"

# Carregar configuração
if [ -f "${APP_DIR}/.env.local" ]; then
  source "${APP_DIR}/.env.local"
else
  echo -e "${RED}[ERRO]${NC} Arquivo .env.local não encontrado"
  exit 1
fi

# Verificar root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERRO]${NC} Execute como root: sudo bash restore.sh"
  exit 1
fi

# Selecionar backup
if [ -n "$1" ]; then
  BACKUP_FILE="$1"
else
  echo -e "${CYAN}Backups disponíveis:${NC}"
  echo ""
  select BACKUP_FILE in $(ls -t ${BACKUP_DIR}/sisam_*.sql.gz 2>/dev/null); do
    if [ -n "$BACKUP_FILE" ]; then
      break
    fi
    echo "Opção inválida"
  done
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}[ERRO]${NC} Arquivo não encontrado: $BACKUP_FILE"
  exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo -e "${YELLOW}ATENÇÃO: Isto vai SUBSTITUIR todos os dados atuais!${NC}"
echo "  Arquivo: $BACKUP_FILE ($SIZE)"
echo ""
read -p "Tem certeza? (digite SIM para confirmar): " CONFIRM
if [ "$CONFIRM" != "SIM" ]; then
  echo "Restauração cancelada."
  exit 0
fi

# Parar aplicação
echo -e "${CYAN}Parando aplicação...${NC}"
sudo -u "$APP_USER" pm2 stop sisam 2>/dev/null || true

# Fazer backup do estado atual antes de restaurar
echo -e "${CYAN}Salvando estado atual...${NC}"
PGPASSWORD="${DB_PASSWORD}" pg_dump -h localhost -U "${DB_USER}" -d "${DB_NAME}" \
  --no-owner --format=plain | gzip > "${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M).sql.gz"

# Restaurar
echo -e "${CYAN}Restaurando banco de dados...${NC}"

# Dropar e recriar banco
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" -d "${DB_NAME}"

# Importar backup
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" 2>&1 | tail -3

# Restaurar uploads se existir
UPLOADS_FILE=$(echo "$BACKUP_FILE" | sed 's/sisam_/uploads_/' | sed 's/.sql.gz/.tar.gz/')
if [ -f "$UPLOADS_FILE" ]; then
  echo -e "${CYAN}Restaurando uploads...${NC}"
  tar -xzf "$UPLOADS_FILE" -C "${APP_DIR}/public/"
  chown -R "$APP_USER":"$APP_USER" "${APP_DIR}/public/uploads"
fi

# Reiniciar aplicação
echo -e "${CYAN}Reiniciando aplicação...${NC}"
sudo -u "$APP_USER" pm2 restart sisam

echo ""
echo -e "${GREEN}✅ Restauração concluída!${NC}"
echo "  Backup pré-restauração salvo em: ${BACKUP_DIR}/pre_restore_*.sql.gz"
echo ""
