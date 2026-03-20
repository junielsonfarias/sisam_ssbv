# SISAM - Guia Completo de Instalação em VPS

## O que é este guia?

Este guia ensina como instalar o SISAM (Sistema de Avaliação Municipal) em um servidor VPS na internet, para que todos os usuários do município possam acessar pelo navegador.

Ao final, você terá o sistema rodando em um endereço como `https://sisam.suacidade.gov.br`.

---

## Antes de começar

### O que você precisa ter

1. **Uma VPS (servidor virtual)** contratada em qualquer provedor:
   - Recomendados: Hostinger, Contabo, DigitalOcean, Vultr, Hetzner
   - Sistema: **Ubuntu 22.04** (o mais comum)
   - Configuração mínima: **2 vCPU, 4GB RAM, 40GB SSD**
   - Custo estimado: R$ 40 a R$ 70/mês

2. **Um domínio** apontando para o IP da VPS (opcional, mas recomendado):
   - Exemplo: `sisam.suacidade.gov.br`
   - Configure o DNS do domínio para apontar para o IP da VPS
   - Tipo de registro: **A** → IP da VPS

3. **Acesso SSH** ao servidor (você receberá do provedor):
   - IP do servidor
   - Usuário (geralmente `root`)
   - Senha ou chave SSH

### O que o instalador faz automaticamente

Você NÃO precisa instalar nada manualmente. O script cuida de tudo:

- Instala Node.js, PostgreSQL, Nginx
- Cria o banco de dados e todas as tabelas
- Configura HTTPS/SSL gratuito (Let's Encrypt)
- Configura firewall de segurança
- Configura backup diário automático
- Cria comandos simples para gerenciar o sistema

---

## Passo 1: Acessar o servidor

### No Windows

1. Abra o **Prompt de Comando** ou **PowerShell**
2. Digite o comando abaixo substituindo pelo IP do seu servidor:

```
ssh root@123.456.789.10
```

3. Quando perguntado `Are you sure you want to continue connecting?`, digite `yes` e pressione Enter
4. Digite a senha do servidor e pressione Enter (a senha não aparece enquanto você digita, isso é normal)

### No Mac/Linux

1. Abra o **Terminal**
2. Digite:

```
ssh root@123.456.789.10
```

3. Siga as mesmas instruções acima

### Resultado esperado

Você verá algo como:

```
Welcome to Ubuntu 22.04.3 LTS
root@servidor:~#
```

Isso significa que você está dentro do servidor. Todos os próximos comandos serão digitados aqui.

---

## Passo 2: Baixar o instalador

Copie e cole este comando no terminal do servidor e pressione Enter:

```bash
git clone https://github.com/junielsonfarias/sisam_ssbv.git /tmp/sisam-install && sudo bash /tmp/sisam-install/deploy/install.sh
```

Se o `git` não estiver instalado, rode primeiro:

```bash
apt update && apt install -y git && git clone https://github.com/junielsonfarias/sisam_ssbv.git /tmp/sisam-install && sudo bash /tmp/sisam-install/deploy/install.sh
```

---

## Passo 3: Responder as perguntas do instalador

O instalador vai mostrar uma tela com perguntas. Responda cada uma:

### Pergunta 1: Domínio

```
Domínio do sistema (ex: sisam.cidade.gov.br, ou deixe vazio para IP):
```

- Se você tem um domínio configurado, digite ele. Exemplo: `sisam.ssbv.gov.br`
- Se não tem domínio, apenas pressione Enter (o sistema usará o IP do servidor)

### Pergunta 2: Email do administrador

```
Email do administrador:
```

- Digite o email que será usado para fazer login no sistema
- Exemplo: `admin@semed.gov.br`
- Este email também será usado para o certificado SSL

### Pergunta 3: Senha do administrador

```
Senha do administrador (min 12 chars, letra + número):
```

- Digite uma senha segura com pelo menos 12 caracteres
- Deve conter letras E números
- Exemplo: `MinhaSenh4Segur4` (use uma senha melhor que esta!)
- **Anote esta senha** em local seguro, você precisará para fazer login

### Pergunta 4: Nome do município

```
Nome do município:
```

- Digite o nome do seu município
- Exemplo: `São Sebastião da Boa Vista`

### Pergunta 5: Porta

```
Porta da aplicação [3000]:
```

- Apenas pressione Enter para usar a porta padrão (3000)
- Não precisa mudar, o Nginx cuida do redirecionamento

### Confirmação

O instalador mostrará um resumo:

```
Configuração:
  Domínio:    sisam.ssbv.gov.br
  Email:      admin@semed.gov.br
  Município:  São Sebastião da Boa Vista
  Porta:      3000
  SSL:        Sim

Confirma? (s/n):
```

- Digite `s` e pressione Enter para iniciar a instalação

---

## Passo 4: Aguardar a instalação

O instalador vai executar 12 etapas automaticamente. Isso leva entre **5 e 15 minutos** dependendo do servidor.

Você verá mensagens como:

```
[1/12] Atualizando sistema operacional...
[INFO] Sistema atualizado
[2/12] Instalando Node.js 20...
[INFO] Node.js v20.x + PM2 instalados
[3/12] Instalando PostgreSQL 15...
[INFO] Banco 'sisam_db' criado com usuário 'sisam_user'
...
```

**Não feche o terminal** durante a instalação. Se a conexão cair, reconecte via SSH e aguarde o processo terminar.

### Se algo der errado

- Se uma etapa falhar, o instalador vai mostrar uma mensagem em vermelho
- Anote a mensagem de erro
- Você pode rodar o instalador novamente, ele vai continuar de onde parou

---

## Passo 5: Instalação concluída!

Quando terminar, você verá:

```
╔══════════════════════════════════════════════╗
║     ✅ SISAM instalado com sucesso!          ║
╚══════════════════════════════════════════════╝

  Acesse:  https://sisam.ssbv.gov.br
  Login:   admin@semed.gov.br
  Senha:   (a que você definiu)

  Comandos úteis:
    sisam status    — Ver status
    sisam logs      — Ver logs
    sisam restart   — Reiniciar
    sisam backup    — Backup manual
    sisam update    — Atualizar versão
```

Abra o navegador e acesse o endereço mostrado. Faça login com o email e senha que você definiu.

---

## Gerenciamento do dia a dia

Após a instalação, você pode gerenciar o sistema com comandos simples. Acesse o servidor via SSH e use:

### Ver se o sistema está funcionando

```bash
sisam status
```

Resultado esperado:
```
┌─────┬────────┬─────────────┬──────┬───────┬──────────┐
│ id  │ name   │ mode        │ ↺    │ status│ cpu      │
├─────┼────────┼─────────────┼──────┼───────┼──────────┤
│ 0   │ sisam  │ fork        │ 0    │ online│ 0.5%     │
└─────┴────────┴─────────────┴──────┴───────┴──────────┘
```

- `online` = sistema funcionando
- `stopped` = sistema parado
- `errored` = sistema com erro (veja os logs)

### Ver os logs (quando algo dá errado)

```bash
sisam logs
```

Mostra as últimas 50 linhas de log. Para ver mais:

```bash
sisam logs 200
```

### Reiniciar o sistema

Use quando o sistema estiver lento ou com problemas:

```bash
sisam restart
```

### Parar o sistema

```bash
sisam stop
```

### Iniciar o sistema (se estiver parado)

```bash
sisam start
```

---

## Backups

### Backup automático

O sistema faz backup do banco de dados automaticamente **todos os dias às 2h da manhã**. Os backups ficam salvos por 30 dias em `/var/backups/sisam/`.

### Fazer backup manual

Antes de uma atualização importante ou mudança grande:

```bash
sisam backup
```

Resultado:
```
[2026-03-20] Iniciando backup do banco de dados...
[2026-03-20] Backup concluído: /var/backups/sisam/sisam_2026-03-20_1430.sql.gz (2.5M)

Backups disponíveis:
  /var/backups/sisam/sisam_2026-03-20_1430.sql.gz (2.5M)
  /var/backups/sisam/sisam_2026-03-19_0200.sql.gz (2.4M)
  Total: 2 backup(s)
```

### Restaurar um backup

Se algo der muito errado e você precisar voltar para uma versão anterior:

```bash
sudo bash /opt/sisam/deploy/restore.sh
```

O script vai:
1. Mostrar a lista de backups disponíveis
2. Pedir para você selecionar um (digitando o número)
3. Pedir confirmação (digitando SIM)
4. Fazer backup do estado atual antes de restaurar
5. Restaurar o backup selecionado
6. Reiniciar o sistema

---

## Atualizações

Quando uma nova versão do SISAM for lançada:

```bash
sisam update
```

O que acontece automaticamente:
1. Faz backup do banco de dados
2. Baixa o código novo do repositório
3. Instala novas dependências (se houver)
4. Executa novas migrações do banco (se houver)
5. Recompila a aplicação
6. Reinicia o sistema

**Se o build falhar**, o sistema volta automaticamente para a versão anterior. Você não perde dados.

---

## Configuração do domínio (DNS)

Para que o endereço `sisam.suacidade.gov.br` funcione, você precisa configurar o DNS:

### Se usa Registro.br (domínios .gov.br)

1. Acesse https://registro.br
2. Vá em "Meus domínios" → selecione seu domínio
3. Clique em "DNS" → "Editar zona"
4. Adicione um novo registro:
   - **Tipo:** A
   - **Nome:** sisam (ou o subdomínio desejado)
   - **Dados:** IP do seu servidor (ex: 123.456.789.10)
5. Salve e aguarde até 24h para propagar (geralmente leva 1-2h)

### Se usa Cloudflare

1. Acesse o painel do Cloudflare
2. Vá em DNS → Adicionar registro
3. **Tipo:** A | **Nome:** sisam | **Conteúdo:** IP do servidor
4. **Proxy:** Desligado (nuvem cinza) — importante para o SSL funcionar direto

### Verificar se o DNS está funcionando

No seu computador, abra o terminal e digite:

```
ping sisam.suacidade.gov.br
```

Se mostrar o IP do seu servidor, está funcionando.

---

## Configuração de SSL (HTTPS)

### Se informou domínio durante a instalação

O SSL é configurado automaticamente pelo instalador. Nada a fazer.

### Se não informou domínio (usou IP)

Depois de configurar o domínio, rode:

```bash
sudo certbot --nginx -d sisam.suacidade.gov.br
```

Siga as instruções na tela (aceitar termos, informar email).

### Renovação do SSL

O certificado SSL é renovado automaticamente a cada 60 dias. Não precisa fazer nada.

---

## Solução de problemas

### O site não abre

1. Verifique se o sistema está rodando:
```bash
sisam status
```

2. Se estiver `stopped` ou `errored`:
```bash
sisam restart
```

3. Verifique os logs:
```bash
sisam logs
```

4. Verifique se o Nginx está rodando:
```bash
sudo systemctl status nginx
```

5. Verifique se o firewall permite acesso:
```bash
sudo ufw status
```

Deve mostrar portas 80 e 443 como ALLOW.

### Erro "502 Bad Gateway"

Significa que o Nginx está funcionando mas a aplicação não:

```bash
sisam restart
```

Se persistir:
```bash
sisam logs 100
```

Procure por mensagens de erro em vermelho.

### Erro de banco de dados

```bash
sudo systemctl status postgresql
```

Se estiver parado:
```bash
sudo systemctl restart postgresql
sisam restart
```

### O sistema está lento

1. Verifique o uso de memória:
```bash
free -h
```

2. Verifique o uso de disco:
```bash
df -h
```

3. Reinicie o sistema:
```bash
sisam restart
```

### Esqueci a senha do admin

Acesse o servidor via SSH e rode:

```bash
cd /opt/sisam
node -e "const b=require('bcryptjs');b.hash('NovaSenha123',10).then(h=>{console.log(h);process.exit()})" > /tmp/hash.txt
HASH=$(cat /tmp/hash.txt)
source .env.local
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "UPDATE usuarios SET senha='$HASH' WHERE email='admin@semed.gov.br';"
rm /tmp/hash.txt
```

Substitua `NovaSenha123` pela nova senha e `admin@semed.gov.br` pelo email do admin.

---

## Desinstalação

Se precisar remover completamente o SISAM do servidor:

```bash
sudo bash /opt/sisam/deploy/uninstall.sh
```

O script vai pedir para digitar `DESINSTALAR` para confirmar.

**Os backups são preservados** em `/var/backups/sisam/` mesmo após desinstalar.

---

## Resumo de comandos

| Comando | O que faz |
|---------|-----------|
| `sisam status` | Ver se o sistema está funcionando |
| `sisam logs` | Ver logs do sistema |
| `sisam logs 200` | Ver últimas 200 linhas de log |
| `sisam restart` | Reiniciar o sistema |
| `sisam stop` | Parar o sistema |
| `sisam start` | Iniciar o sistema |
| `sisam backup` | Fazer backup manual |
| `sisam update` | Atualizar para nova versão |

## Arquivos importantes

| Arquivo | O que contém |
|---------|-------------|
| `/opt/sisam/.env.local` | Configurações (senhas, banco, etc.) |
| `/opt/sisam/deploy/` | Scripts de gerenciamento |
| `/var/log/sisam/` | Logs da aplicação |
| `/var/backups/sisam/` | Backups do banco de dados |

## Suporte

Se encontrar problemas, registre em:
https://github.com/junielsonfarias/sisam_ssbv/issues
