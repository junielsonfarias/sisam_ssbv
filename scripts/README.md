# Scripts de Manutenção do SISAM

Este diretório contém scripts utilitários para administração, migração e manutenção do sistema SISAM.

## Categorias de Scripts

### Migrações de Banco de Dados
Scripts para criar ou alterar estrutura do banco.

| Script | Descrição |
|--------|-----------|
| `setup-database.js` | Configuração inicial do banco de dados |
| `executar-migracao-*.js` | Executa migrações específicas |
| `migrate-*.js` | Scripts de migração de estrutura |
| `aplicar-migracao-*.js` | Aplica migrações pendentes |
| `aplicar-schema-supabase.js` | Aplica schema no Supabase |

### Deploy/Vercel
Scripts para configuração de deploy na Vercel.

| Script | Descrição |
|--------|-----------|
| `configurar-vercel*.js` | Configura projeto na Vercel |
| `atualizar-variaveis-vercel.js` | Atualiza variáveis de ambiente |
| `atualizar-vercel-*.js` | Configurações de deploy |
| `configurar-env-*.js` | Configura arquivos .env |

### Análise de Dados
Scripts para analisar dados importados e diagnosticar problemas.

| Script | Descrição |
|--------|-----------|
| `analisar-*.js` | Análise de dados e estrutura |
| `diagnostico-*.js` | Diagnóstico de problemas |
| `investigar-*.js` | Investigação detalhada de dados |

### Correção de Dados
Scripts para corrigir dados inconsistentes.

| Script | Descrição |
|--------|-----------|
| `corrigir-*.js` | Correções de dados |
| `forcar-padronizacao-*.js` | Força padrões em dados |
| `popular-aluno-id*.js` | Popula IDs faltantes |

### Limpeza
Scripts para remover dados antigos ou desnecessários.

| Script | Descrição |
|--------|-----------|
| `limpar-*.js` | Remove dados específicos |
| `excluir-*.js` | Exclui registros |
| `remover-*.js` | Remove itens |
| `cancelar-todas-importacoes.js` | Cancela importações pendentes |

### Unificação
Scripts para unificar/deduplicar registros.

| Script | Descrição |
|--------|-----------|
| `unificar-escolas*.js` | Unifica escolas duplicadas |
| `analisar-e-remover-duplicatas-alunos.js` | Remove alunos duplicados |

### Utilitários
Scripts de uso geral.

| Script | Descrição |
|--------|-----------|
| `seed.js` | Popula banco com dados iniciais |
| `seed-supabase.js` | Seed para Supabase |
| `listar-tabelas.js` | Lista tabelas do banco |
| `list-users.js` | Lista usuários |
| `generate-pwa-icons.js` | Gera ícones do PWA |

### Testes (Ignorados no Git)
Scripts de teste temporários - não versionados.

| Padrão | Descrição |
|--------|-----------|
| `testar-*.js` | Scripts de teste |
| `test-*.js` | Testes de funcionalidade |
| `verificar-*.js` | Verificações de dados |

## Como Executar

```bash
# Executar script com Node.js
node scripts/nome-do-script.js

# Executar com variáveis de ambiente
DB_HOST=localhost node scripts/setup-database.js
```

## Variáveis de Ambiente Necessárias

A maioria dos scripts requer estas variáveis:

- `DB_HOST` - Host do banco de dados
- `DB_PORT` - Porta (default: 5432)
- `DB_NAME` - Nome do banco
- `DB_USER` - Usuário
- `DB_PASSWORD` - Senha

Para scripts de Vercel:
- `VERCEL_TOKEN` - Token de acesso da Vercel
- `VERCEL_PROJECT_ID` - ID do projeto

## Observações

1. **Backup**: Sempre faça backup antes de executar scripts de correção ou limpeza
2. **Ambiente**: Verifique se está no ambiente correto (dev/prod)
3. **Logs**: A maioria dos scripts gera logs detalhados no console
4. **Transações**: Scripts de migração usam transações quando possível
