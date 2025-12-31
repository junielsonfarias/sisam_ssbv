# Inicialização Automática na Vercel

Este documento explica como o sistema cria automaticamente o usuário administrador durante o deploy na Vercel.

## 🔄 Processo Automático

### Durante o Deploy

1. **Build do Next.js**: O sistema compila a aplicação
2. **Script de Inicialização**: Após o build, o script `scripts/init-production.js` é executado automaticamente
3. **Criação do Usuário Admin**: O script verifica e cria o usuário administrador se não existir

### O que o Script Faz

1. ✅ Verifica se as variáveis de ambiente estão configuradas
2. ✅ Testa a conexão com o banco de dados
3. ✅ Verifica se a tabela `usuarios` existe
4. ✅ Verifica se já existe um usuário administrador
5. ✅ Cria o usuário admin se não existir:
   - **Email**: `admin@sisam.com`
   - **Senha**: `admin123`

## 📋 Pré-requisitos

### Variáveis de Ambiente na Vercel

Configure todas estas variáveis em **Settings → Environment Variables**:

```
DB_HOST = [host do seu banco PostgreSQL]
DB_PORT = 5432 (ou a porta do seu banco)
DB_NAME = [nome do banco de dados]
DB_USER = [usuário do banco]
DB_PASSWORD = [senha do banco]
JWT_SECRET = [chave secreta de pelo menos 32 caracteres]
NODE_ENV = production
```

**Importante**: 
- Marque todas as variáveis para **Production**
- Após adicionar/alterar variáveis, faça um **Redeploy manual**

### Banco de Dados

O banco de dados deve:
- ✅ Ter o schema executado (tabela `usuarios` deve existir)
- ✅ Estar acessível da Vercel (sem firewall bloqueando)
- ✅ Ter SSL habilitado (se necessário)

## 🔍 Verificar Inicialização

### Opção 1: Verificar Logs do Deploy

1. Acesse o painel da Vercel
2. Vá em **Deployments** → selecione o último deploy
3. Veja os logs do build
4. Procure por mensagens do script `init-production.js`:
   - `🚀 Inicializando sistema em produção...`
   - `✅ Usuário administrador criado com sucesso!`

### Opção 2: API de Status

Acesse após o deploy:
```
GET https://seu-dominio.vercel.app/api/init
```

Isso mostrará:
- Status das variáveis de ambiente
- Se o usuário admin existe
- Informações de conexão

### Opção 3: Criar Manualmente

Se o script automático não funcionar, você pode criar manualmente:

```
POST https://seu-dominio.vercel.app/api/admin/criar-admin
```

Ou:

```
POST https://seu-dominio.vercel.app/api/init
```

## 🐛 Solução de Problemas

### Erro: "Variáveis de ambiente não configuradas"

**Solução**: 
1. Verifique se todas as variáveis estão em **Settings → Environment Variables**
2. Certifique-se de que estão marcadas para **Production**
3. Faça um **Redeploy manual**

### Erro: "connect ECONNREFUSED 127.0.0.1:5432"

**Causa**: As variáveis de ambiente não estão sendo lidas

**Solução**:
1. Verifique se `DB_HOST` está configurado (não pode ser localhost)
2. Verifique se as variáveis estão marcadas para **Production**
3. Faça um **Redeploy manual** após configurar

### Erro: "Tabela usuarios não encontrada"

**Solução**: Execute o schema SQL no banco de dados:
```sql
-- Execute o arquivo database/schema.sql no seu banco
```

### Script não executa durante o build

**Solução**: 
1. Verifique se o script `scripts/init-production.js` existe
2. Verifique se `package.json` tem o script `postbuild`
3. O script não falha o build, apenas avisa se houver erro

## 🔐 Credenciais Padrão

Após a inicialização bem-sucedida:

- **Email**: `admin@sisam.com`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere a senha após o primeiro acesso!

## 📝 Logs do Script

O script mostra logs detalhados durante a execução:

```
🚀 Inicializando sistema em produção...
📊 Configurações do banco:
   Host: xxxxx.xxxxx.com
   Port: 5432
   Database: verceldb
   User: default
   SSL: Habilitado
🔌 Testando conexão com banco de dados...
✅ Conexão com banco estabelecida!
📋 Verificando estrutura do banco...
✅ Estrutura do banco verificada!
👤 Verificando usuário administrador...
➕ Criando usuário administrador padrão...
✅ Usuário administrador criado/atualizado com sucesso!
   Email: admin@sisam.com
   Senha: admin123
   ⚠️  ALTERE A SENHA APÓS O PRIMEIRO ACESSO!

🎉 Inicialização concluída com sucesso!
```

## 🔄 Reexecutar Inicialização

Se precisar reexecutar a inicialização:

1. **Via API**:
   ```
   POST https://seu-dominio.vercel.app/api/init
   ```

2. **Via Redeploy**:
   - Faça um novo deploy na Vercel
   - O script será executado automaticamente

## 📞 Suporte

Se o problema persistir:
1. Verifique os logs do deploy na Vercel
2. Verifique os logs da função `/api/init` (GET)
3. Verifique se todas as variáveis estão configuradas corretamente

