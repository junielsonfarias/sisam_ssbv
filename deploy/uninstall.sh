#!/bin/bash

# SISAM - Desinstalador
# Uso: sudo bash /opt/sisam/deploy/uninstall.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="/opt/sisam"
APP_USER="sisam"

echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   SISAM - Desinstalação Completa             ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}ATENÇÃO: Isto vai remover:${NC}"
echo "  - Aplicação (/opt/sisam)"
echo "  - Banco de dados (sisam_db)"
echo "  - Usuário do sistema (sisam)"
echo "  - Configuração Nginx"
echo "  - Logs (/var/log/sisam)"
echo ""
echo -e "${YELLOW}Backups serão MANTIDOS em /var/backups/sisam/${NC}"
echo ""

read -p "Digite DESINSTALAR para confirmar: " CONFIRM
if [ "$CONFIRM" != "DESINSTALAR" ]; then
  echo "Cancelado."
  exit 0
fi

# Verificar root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Execute como root${NC}"
  exit 1
fi

# Fazer backup final
echo -e "${CYAN}Fazendo backup final antes de desinstalar...${NC}"
if [ -f "$APP_DIR/deploy/backup.sh" ]; then
  bash "$APP_DIR/deploy/backup.sh" 2>/dev/null || true
fi

# Parar PM2
echo -e "${CYAN}Parando aplicação...${NC}"
sudo -u "$APP_USER" pm2 stop sisam 2>/dev/null || true
sudo -u "$APP_USER" pm2 delete sisam 2>/dev/null || true

# Remover Nginx config
echo -e "${CYAN}Removendo configuração Nginx...${NC}"
rm -f /etc/nginx/sites-enabled/sisam
rm -f /etc/nginx/sites-available/sisam
systemctl reload nginx 2>/dev/null || true

# Remover banco de dados
echo -e "${CYAN}Removendo banco de dados...${NC}"
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='sisam_db' AND pid <> pg_backend_pid();" 2>/dev/null || true
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sisam_db;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS sisam_user;" 2>/dev/null || true

# Remover cron
rm -f /etc/cron.d/sisam-backup

# Remover comando global
rm -f /usr/local/bin/sisam

# Remover logs
rm -rf /var/log/sisam

# Remover aplicação
echo -e "${CYAN}Removendo aplicação...${NC}"
rm -rf "$APP_DIR"

# Remover usuário do sistema
userdel -r "$APP_USER" 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ SISAM desinstalado.${NC}"
echo "  Backups preservados em: /var/backups/sisam/"
echo "  Para remover backups: rm -rf /var/backups/sisam/"
echo ""
