# 🚀 Guia de Deploy - SISAM

Este guia fornece instruções detalhadas para fazer o deploy do SISAM em produção.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 12+ instalado e rodando
- Acesso SSH ao servidor (se deploy remoto)
- Domínio configurado (opcional, mas recomendado)

## 🔧 Preparação Local

### 1. Verificar Pronto para Produção

```bash
npm run verificar-producao
```

Este script verifica:
- ✅ Variáveis de ambiente configuradas
- ✅ Banco de dados acessível
- ✅ Tabelas criadas
- ✅ Usuário administrador existe
- ✅ JWT_SECRET configurado

### 2. Build de Produção

```bash
npm run build
```

Isso criará uma versão otimizada do aplicativo na pasta `.next`.

### 3. Testar Build Localmente

```bash
npm run start
```

Acesse `http://localhost:3000` e verifique se tudo está funcionando.

## 🌐 Opções de Deploy

### Opção 1: Vercel (Recomendado para Next.js)

1. **Instalar Vercel CLI**:
```bash
npm i -g vercel
```

2. **Fazer login**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel --prod
```

4. **Configurar Variáveis de Ambiente**:
   - Acesse o dashboard da Vercel
   - Vá em Settings > Environment Variables
   - Adicione todas as variáveis do `.env`

### Opção 2: Servidor VPS/Dedicado

#### Passo 1: Preparar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2
```

#### Passo 2: Clonar Repositório

```bash
cd /var/www
git clone https://github.com/seu-usuario/Sisam_ssbv.git
cd Sisam_ssbv
```

#### Passo 3: Configurar Banco de Dados

```bash
# Criar banco de dados
sudo -u postgres psql
CREATE DATABASE sisam;
CREATE USER sisam_user WITH PASSWORD 'senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE sisam TO sisam_user;
\q

# Executar schema
psql -U sisam_user -d sisam -f database/schema.sql
```

#### Passo 4: Configurar Aplicação

```bash
# Instalar dependências
npm install --production

# Copiar arquivo de ambiente
cp .env.example .env
nano .env  # Editar com credenciais corretas
```

#### Passo 5: Build e Deploy

```bash
# Build
npm run build

# Iniciar com PM2
pm2 start npm --name "sisam" -- start
pm2 save
pm2 startup  # Seguir instruções para iniciar no boot
```

#### Passo 6: Configurar Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opção 3: Docker (Recomendado para ambientes isolados)

Crie um `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

E um `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=sisam
      - DB_USER=sisam_user
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=sisam
      - POSTGRES_USER=sisam_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🔐 Segurança em Produção

### Checklist de Segurança

- [ ] `JWT_SECRET` é forte e único (mínimo 32 caracteres)
- [ ] Senha do banco de dados é forte
- [ ] Arquivo `.env` não está no repositório
- [ ] HTTPS configurado (certificado SSL)
- [ ] Firewall configurado
- [ ] Backups automáticos do banco de dados
- [ ] Logs de erro configurados
- [ ] Senha do administrador alterada

### Gerar JWT_SECRET Seguro

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 Monitoramento

### PM2 Monitoring

```bash
pm2 monit
pm2 logs sisam
```

### Health Check

O sistema expõe um endpoint de health check:
```
GET /api/health
```

## 🔄 Atualizações

### Processo de Atualização

```bash
# 1. Fazer backup
npm run backup

# 2. Atualizar código
git pull origin main

# 3. Instalar dependências
npm install --production

# 4. Executar migrations (se houver)
npm run migrate

# 5. Build
npm run build

# 6. Reiniciar
pm2 restart sisam
```

## 🆘 Troubleshooting

### Erro de Conexão com Banco

- Verificar se PostgreSQL está rodando
- Verificar credenciais no `.env`
- Verificar firewall/portas

### Erro 500

- Verificar logs: `pm2 logs sisam`
- Verificar variáveis de ambiente
- Verificar permissões de arquivo

### Performance

- Verificar uso de memória: `pm2 monit`
- Considerar usar cache (Redis)
- Otimizar queries do banco

## 📞 Suporte

Para problemas ou dúvidas, consulte a documentação ou entre em contato com a equipe de desenvolvimento.

