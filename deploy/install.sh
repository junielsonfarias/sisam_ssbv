#!/bin/bash
set -e

# ============================================================================
# SISAM - Instalador Automatizado para VPS
# Sistema de Avaliação Municipal
#
# Uso: curl -sL https://raw.githubusercontent.com/seu-repo/sisam/main/deploy/install.sh | sudo bash
#   ou: sudo bash install.sh
#
# Requisitos: Ubuntu 22.04+ / Debian 12+, 2 vCPU, 4GB RAM, 40GB SSD
# ============================================================================

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configurações padrão
APP_DIR="/opt/sisam"
APP_USER="sisam"
APP_PORT=3000
DB_NAME="sisam_db"
DB_USER="sisam_user"
NODE_VERSION="20"
PG_VERSION="15"
REPO_URL="https://github.com/junielsonfarias/sisam_ssbv.git"
BRANCH="main"

# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

banner() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   ${CYAN}SISAM - Sistema de Avaliação Municipal${BLUE}    ║${NC}"
  echo -e "${BLUE}║   ${NC}Instalador Automatizado v1.0${BLUE}              ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
  echo ""
}

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
log_error() { echo -e "${RED}[ERRO]${NC} $1"; }
log_step() { echo -e "\n${CYAN}[$1/$TOTAL_STEPS]${NC} ${BLUE}$2${NC}"; }

check_root() {
  if [ "$EUID" -ne 0 ]; then
    log_error "Este script precisa ser executado como root (sudo)"
    exit 1
  fi
}

check_os() {
  if [ ! -f /etc/os-release ]; then
    log_error "Sistema operacional não suportado"
    exit 1
  fi
  . /etc/os-release
  if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
    log_error "Apenas Ubuntu e Debian são suportados. Detectado: $ID"
    exit 1
  fi
  log_info "Sistema operacional: $PRETTY_NAME"
}

check_resources() {
  local ram_mb=$(free -m | awk '/^Mem:/{print $2}')
  local disk_gb=$(df -BG / | awk 'NR==2{print $4}' | tr -d 'G')

  if [ "$ram_mb" -lt 1500 ]; then
    log_error "RAM insuficiente: ${ram_mb}MB. Mínimo recomendado: 2GB"
    exit 1
  fi

  if [ "$disk_gb" -lt 5 ]; then
    log_error "Espaço em disco insuficiente: ${disk_gb}GB. Mínimo: 5GB livres"
    exit 1
  fi

  log_info "RAM: ${ram_mb}MB | Disco livre: ${disk_gb}GB"

  # Criar swap se RAM < 4GB e swap não existe
  if [ "$ram_mb" -lt 3500 ] && [ ! -f /swapfile ]; then
    log_warn "RAM < 4GB. Criando swap de 2GB para compilação..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap de 2GB criado"
  fi
}

generate_password() {
  openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

generate_jwt_secret() {
  openssl rand -base64 48 | tr -d '/+=' | head -c 64
}

# ============================================================================
# ETAPA 0: COLETAR INFORMAÇÕES
# ============================================================================

collect_info() {
  banner

  echo -e "${CYAN}Configuração do sistema:${NC}"
  echo ""

  # Domínio
  read -p "  Domínio do sistema (ex: sisam.cidade.gov.br, ou deixe vazio para IP): " DOMAIN
  if [ -z "$DOMAIN" ]; then
    DOMAIN=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    log_warn "Sem domínio. Usando IP: $DOMAIN"
    USE_SSL=false
  else
    USE_SSL=true
  fi

  # Email admin
  while true; do
    read -p "  Email do administrador: " ADMIN_EMAIL
    if [[ "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
      break
    fi
    log_error "Email inválido. Tente novamente."
  done

  # Senha admin
  while true; do
    read -sp "  Senha do administrador (min 12 chars, letra + número): " ADMIN_PASSWORD
    echo ""
    if [ ${#ADMIN_PASSWORD} -ge 12 ] && [[ "$ADMIN_PASSWORD" =~ [a-zA-Z] ]] && [[ "$ADMIN_PASSWORD" =~ [0-9] ]]; then
      break
    fi
    log_error "Senha deve ter 12+ caracteres com letras e números."
  done

  # Nome do município
  read -p "  Nome do município: " MUNICIPIO_NOME
  MUNICIPIO_NOME=${MUNICIPIO_NOME:-"Município"}

  # Porta
  read -p "  Porta da aplicação [3000]: " INPUT_PORT
  APP_PORT=${INPUT_PORT:-3000}

  # Gerar senhas automáticas
  DB_PASSWORD=$(generate_password)
  JWT_SECRET=$(generate_jwt_secret)

  echo ""
  echo -e "${GREEN}Configuração:${NC}"
  echo "  Domínio:    $DOMAIN"
  echo "  Email:      $ADMIN_EMAIL"
  echo "  Município:  $MUNICIPIO_NOME"
  echo "  Porta:      $APP_PORT"
  echo "  SSL:        $([ "$USE_SSL" = true ] && echo 'Sim' || echo 'Não')"
  echo ""

  read -p "Confirma? (s/n): " CONFIRM
  if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" && "$CONFIRM" != "sim" ]]; then
    log_error "Instalação cancelada."
    exit 0
  fi
}

# ============================================================================
# ETAPAS DE INSTALAÇÃO
# ============================================================================

TOTAL_STEPS=12

step_update_system() {
  log_step 1 "Atualizando sistema operacional..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq
  apt-get install -y -qq curl wget gnupg2 lsb-release ca-certificates \
    build-essential python3 git ufw software-properties-common \
    libvips-dev libpq-dev
  log_info "Sistema atualizado"
}

step_install_nodejs() {
  log_step 2 "Instalando Node.js ${NODE_VERSION}..."
  if command -v node &>/dev/null; then
    local current=$(node -v | tr -d 'v' | cut -d. -f1)
    if [ "$current" -ge "$NODE_VERSION" ]; then
      log_info "Node.js $(node -v) já instalado"
      return
    fi
  fi
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y -qq nodejs
  npm install -g pm2
  log_info "Node.js $(node -v) + PM2 instalados"
}

step_install_postgresql() {
  log_step 3 "Instalando PostgreSQL ${PG_VERSION}..."
  if command -v psql &>/dev/null; then
    log_info "PostgreSQL já instalado: $(psql --version)"
  else
    sh -c "echo 'deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main' > /etc/apt/sources.list.d/pgdg.list"
    wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update -qq
    apt-get install -y -qq postgresql-${PG_VERSION}
    systemctl enable postgresql
    systemctl start postgresql
    log_info "PostgreSQL ${PG_VERSION} instalado"
  fi

  # Criar usuário e banco
  log_info "Configurando banco de dados..."
  sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"

  sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

  sudo -u postgres psql -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
  sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

  log_info "Banco '${DB_NAME}' criado com usuário '${DB_USER}'"
}

step_install_nginx() {
  log_step 4 "Instalando Nginx..."
  if command -v nginx &>/dev/null; then
    log_info "Nginx já instalado"
  else
    apt-get install -y -qq nginx
    systemctl enable nginx
  fi

  # Configurar reverse proxy
  cat > /etc/nginx/sites-available/sisam <<NGINX_EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Security headers (complementam os do middleware Next.js)
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # Limite de upload (importações Excel)
    client_max_body_size 20M;

    # Proxy para Next.js
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
    }

    # Cache para assets estáticos
    location /_next/static/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Cache para modelos face-api
    location /models/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        expires 90d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

  ln -sf /etc/nginx/sites-available/sisam /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  log_info "Nginx configurado como reverse proxy"
}

step_setup_ssl() {
  log_step 5 "Configurando SSL..."
  if [ "$USE_SSL" = true ]; then
    apt-get install -y -qq certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect || {
      log_warn "SSL falhou. O sistema funcionará via HTTP."
      log_warn "Execute depois: certbot --nginx -d $DOMAIN"
      USE_SSL=false
    }
    if [ "$USE_SSL" = true ]; then
      # Renovação automática
      systemctl enable certbot.timer
      log_info "SSL configurado para ${DOMAIN}"
    fi
  else
    log_warn "SSL ignorado (sem domínio). Acesso via HTTP."
  fi
}

step_clone_repository() {
  log_step 6 "Clonando repositório..."

  # Criar usuário do sistema
  if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d "$APP_DIR" -s /bin/bash "$APP_USER"
    log_info "Usuário '${APP_USER}' criado"
  fi

  if [ -d "$APP_DIR/.git" ]; then
    log_info "Repositório já existe. Atualizando..."
    cd "$APP_DIR"
    sudo -u "$APP_USER" git pull origin "$BRANCH"
  else
    rm -rf "$APP_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
  fi

  cd "$APP_DIR"
  log_info "Repositório clonado em ${APP_DIR}"
}

step_configure_env() {
  log_step 7 "Gerando configuração (.env.local)..."

  local APP_URL
  if [ "$USE_SSL" = true ]; then
    APP_URL="https://${DOMAIN}"
  else
    APP_URL="http://${DOMAIN}"
  fi

  cat > "${APP_DIR}/.env.local" <<ENV_EOF
# === SISAM - Configuração de Produção ===
# Gerado automaticamente em $(date -Iseconds)
# NÃO edite manualmente sem necessidade

# Banco de Dados (PostgreSQL local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=false

# Autenticação
JWT_SECRET=${JWT_SECRET}

# Ambiente
NODE_ENV=production
NEXT_PUBLIC_APP_URL=${APP_URL}
ENV_EOF

  chown "$APP_USER":"$APP_USER" "${APP_DIR}/.env.local"
  chmod 600 "${APP_DIR}/.env.local"
  log_info "Arquivo .env.local gerado (permissão 600)"
}

step_install_dependencies() {
  log_step 8 "Instalando dependências npm..."
  cd "$APP_DIR"
  sudo -u "$APP_USER" npm ci --production=false 2>&1 | tail -5
  log_info "Dependências instaladas"
}

step_setup_database() {
  log_step 9 "Criando tabelas e executando migrações..."
  cd "$APP_DIR"

  # Executar schema principal
  PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -f database/schema.sql 2>&1 | tail -3
  log_info "Schema principal executado"

  # Executar migrações em ordem
  local count=0
  local errors=0
  for migration in database/migrations/*.sql; do
    if [ -f "$migration" ]; then
      PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -f "$migration" 2>/dev/null || {
        ((errors++)) || true
      }
      ((count++)) || true
    fi
  done
  log_info "Migrações executadas: ${count} arquivos (${errors} já aplicadas/ignoradas)"

  # Criar usuário admin
  log_info "Criando usuário administrador..."
  local ADMIN_HASH=$(cd "$APP_DIR" && node -e "
    const bcrypt = require('bcryptjs');
    bcrypt.hash('${ADMIN_PASSWORD}', 10).then(h => process.stdout.write(h));
  ")

  PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" <<SQL_EOF
    INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo)
    VALUES ('Administrador', '${ADMIN_EMAIL}', '${ADMIN_HASH}', 'administrador', true)
    ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha, ativo = true;
SQL_EOF
  log_info "Admin criado: ${ADMIN_EMAIL}"
}

step_build_app() {
  log_step 10 "Compilando aplicação (pode levar 3-5 minutos)..."
  cd "$APP_DIR"

  # Garantir diretórios
  mkdir -p public/uploads
  chown -R "$APP_USER":"$APP_USER" public/uploads

  sudo -u "$APP_USER" bash -c "cd ${APP_DIR} && npm run build" 2>&1 | tail -5
  log_info "Build concluído"
}

step_configure_pm2() {
  log_step 11 "Configurando PM2 (process manager)..."

  cat > "${APP_DIR}/ecosystem.config.js" <<PM2_EOF
module.exports = {
  apps: [{
    name: 'sisam',
    cwd: '${APP_DIR}',
    script: 'node_modules/.bin/next',
    args: 'start -p ${APP_PORT}',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: ${APP_PORT}
    },
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 10,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/sisam/error.log',
    out_file: '/var/log/sisam/output.log',
    merge_logs: true
  }]
}
PM2_EOF

  chown "$APP_USER":"$APP_USER" "${APP_DIR}/ecosystem.config.js"

  # Diretório de logs
  mkdir -p /var/log/sisam
  chown "$APP_USER":"$APP_USER" /var/log/sisam

  # Iniciar aplicação
  sudo -u "$APP_USER" bash -c "cd ${APP_DIR} && pm2 start ecosystem.config.js"
  sudo -u "$APP_USER" pm2 save

  # Configurar auto-start no boot
  env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR" 2>/dev/null || true

  log_info "PM2 configurado. App rodando na porta ${APP_PORT}"
}

step_finalize() {
  log_step 12 "Finalizando..."

  # Firewall
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  log_info "Firewall configurado (22, 80, 443)"

  # Backup diário via cron
  cat > /etc/cron.d/sisam-backup <<CRON_EOF
# Backup diário do SISAM às 2h da manhã
0 2 * * * ${APP_USER} ${APP_DIR}/deploy/backup.sh >> /var/log/sisam/backup.log 2>&1
CRON_EOF
  log_info "Backup diário configurado (02:00)"

  # Criar comando 'sisam' para gerenciamento
  cat > /usr/local/bin/sisam <<'CMD_EOF'
#!/bin/bash
APP_DIR="/opt/sisam"
APP_USER="sisam"

case "$1" in
  status)   sudo -u $APP_USER pm2 status ;;
  logs)     sudo -u $APP_USER pm2 logs sisam --lines ${2:-50} ;;
  restart)  sudo -u $APP_USER pm2 restart sisam ;;
  stop)     sudo -u $APP_USER pm2 stop sisam ;;
  start)    sudo -u $APP_USER pm2 start sisam ;;
  backup)   sudo -u $APP_USER $APP_DIR/deploy/backup.sh ;;
  update)   sudo bash $APP_DIR/deploy/update.sh ;;
  *)
    echo "SISAM - Comandos disponíveis:"
    echo "  sisam status    — Ver status do sistema"
    echo "  sisam logs      — Ver logs (sisam logs 100 para mais)"
    echo "  sisam restart   — Reiniciar aplicação"
    echo "  sisam stop      — Parar aplicação"
    echo "  sisam start     — Iniciar aplicação"
    echo "  sisam backup    — Fazer backup agora"
    echo "  sisam update    — Atualizar para última versão"
    ;;
esac
CMD_EOF
  chmod +x /usr/local/bin/sisam
  log_info "Comando 'sisam' disponível globalmente"

  # Salvar configuração para referência
  cat > "${APP_DIR}/.install-info" <<INFO_EOF
DOMAIN=${DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
APP_PORT=${APP_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
USE_SSL=${USE_SSL}
INSTALLED_AT=$(date -Iseconds)
INFO_EOF
  chmod 600 "${APP_DIR}/.install-info"

  # Resultado final
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║     ✅ SISAM instalado com sucesso!          ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  if [ "$USE_SSL" = true ]; then
    echo -e "  ${CYAN}Acesse:${NC}  https://${DOMAIN}"
  else
    echo -e "  ${CYAN}Acesse:${NC}  http://${DOMAIN}"
  fi
  echo -e "  ${CYAN}Login:${NC}   ${ADMIN_EMAIL}"
  echo -e "  ${CYAN}Senha:${NC}   (a que você definiu)"
  echo ""
  echo -e "  ${YELLOW}Comandos úteis:${NC}"
  echo "    sisam status    — Ver status"
  echo "    sisam logs      — Ver logs"
  echo "    sisam restart   — Reiniciar"
  echo "    sisam backup    — Backup manual"
  echo "    sisam update    — Atualizar versão"
  echo ""
  echo -e "  ${YELLOW}Arquivos importantes:${NC}"
  echo "    ${APP_DIR}/.env.local          — Configurações"
  echo "    /var/log/sisam/                — Logs"
  echo "    /var/backups/sisam/            — Backups"
  echo ""
}

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

main() {
  check_root
  check_os
  collect_info
  check_resources

  echo ""
  log_info "Iniciando instalação..."
  echo ""

  step_update_system
  step_install_nodejs
  step_install_postgresql
  step_install_nginx
  step_setup_ssl
  step_clone_repository
  step_configure_env
  step_install_dependencies
  step_setup_database
  step_build_app
  step_configure_pm2
  step_finalize
}

main "$@"
