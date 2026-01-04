# 📦 Sistema de Cache JSON

## Visão Geral

O sistema de cache implementado armazena dados de consultas pesadas em arquivos JSON para melhorar significativamente o tempo de resposta das requisições. Os caches são atualizados automaticamente a cada hora e podem ser limpos manualmente quando necessário.

## Funcionalidades

### ⏱️ Expiração Automática
- **Tempo de expiração**: 1 hora (3600 segundos)
- **Limpeza automática**: Caches expirados são removidos automaticamente durante novas requisições
- **Renovação**: Quando um cache expira, os dados são buscados novamente do banco de dados

### 📊 Rotas com Cache

As seguintes rotas API utilizam cache:

1. **`/api/admin/dashboard-dados`**
   - Cache de dados do painel administrativo
   - Inclui métricas, estatísticas, gráficos, etc.

2. **`/api/admin/estatisticas`**
   - Cache de estatísticas gerais do sistema
   - Total de usuários, escolas, polos, alunos, etc.

3. **`/api/admin/resultados-consolidados`**
   - Cache de resultados consolidados dos alunos
   - Suporta filtros por escola, polo, série, turma, etc.

4. **`/api/admin/graficos`**
   - Cache de dados para gráficos e visualizações
   - Múltiplos tipos de gráficos (geral, escolas, disciplinas, etc.)

5. **`/api/admin/comparativos`**
   - Cache de dados de comparação entre escolas/turmas
   - Suporta comparação de múltiplas escolas ou polos

### 🔧 Funcionalidades de Gerenciamento

#### Rota de Gerenciamento de Cache

**`GET /api/admin/cache`**

Permite gerenciar os caches através de parâmetros:

- **`?acao=limpar_expirados`**: Remove apenas caches expirados
- **`?acao=limpar_todos`**: Remove todos os caches (admin apenas)
- **Sem parâmetros**: Retorna informações sobre todos os caches

**Exemplo de resposta:**
```json
{
  "ultimaAtualizacao": "2024-01-01T12:00:00.000Z",
  "totalCaches": 5,
  "tamanhoTotal": 524288,
  "tamanhoTotalKB": "512.00",
  "tamanhoTotalMB": "0.50",
  "caches": {
    "chave1": {
      "arquivo": "dashboard-chave1.json",
      "criadoEm": "2024-01-01T11:00:00.000Z",
      "expiraEm": "2024-01-01T12:00:00.000Z",
      "tamanho": 104857,
      "filtros": {}
    }
  }
}
```

#### Forçar Atualização

Qualquer rota que utiliza cache pode ter sua atualização forçada adicionando o parâmetro `?atualizar_cache=true`:

```
GET /api/admin/dashboard-dados?atualizar_cache=true
GET /api/admin/estatisticas?atualizar_cache=true
GET /api/admin/resultados-consolidados?atualizar_cache=true&serie=8º%20Ano
```

### 📁 Estrutura de Arquivos

Os arquivos de cache são armazenados em:
```
config/cache/
├── cache-meta.json          # Metadados de todos os caches
├── dashboard-[hash].json    # Cache de dashboard
├── estatisticas-[hash].json # Cache de estatísticas
├── resultados-[hash].json   # Cache de resultados
├── graficos-[hash].json     # Cache de gráficos
└── comparativos-[hash].json # Cache de comparativos
```

### 🔑 Geração de Chaves

As chaves de cache são geradas usando MD5 baseado em:
- Filtros aplicados (polo, escola, série, turma, etc.)
- Tipo de usuário
- ID do usuário
- ID do polo (se aplicável)
- ID da escola (se aplicável)

Isso garante que cada combinação única de filtros tenha seu próprio cache.

## Scripts

### Limpar Caches Expirados

**`scripts/limpar-caches-expirados.js`**

Script Node.js para limpar caches expirados manualmente ou via cron job.

**Uso:**
```bash
node scripts/limpar-caches-expirados.js
```

**Funcionalidades:**
- Remove automaticamente caches expirados
- Mostra estatísticas (total removido, tamanho liberado)
- Atualiza metadados do cache

**Configurar como Cron Job (Linux/Mac):**
```bash
# Executar a cada hora
0 * * * * cd /caminho/do/projeto && node scripts/limpar-caches-expirados.js
```

**Configurar como Tarefa Agendada (Windows):**
1. Abra o Agendador de Tarefas
2. Crie uma nova tarefa
3. Configure para executar: `node scripts/limpar-caches-expirados.js`
4. Defina para executar a cada hora

## Performance

### Benefícios

1. **Tempo de Resposta**: Redução de 70-90% no tempo de resposta para dados cacheados
2. **Carga no Banco**: Redução significativa de consultas ao banco de dados
3. **Experiência do Usuário**: Carregamento mais rápido das páginas

### Quando o Cache é Mais Efetivo

- Dados que não mudam frequentemente
- Consultas complexas com múltiplos JOINs
- Dados agregados e estatísticas
- Relatórios e visualizações

### Quando Forçar Atualização

- Após importações de dados
- Após alterações em configurações
- Quando dados foram atualizados manualmente
- Para garantir dados sempre atualizados

## Manutenção

### Limpeza Manual

**Via API:**
```bash
# Limpar expirados
curl -X GET "https://seu-dominio.com/api/admin/cache?acao=limpar_expirados"

# Limpar todos
curl -X GET "https://seu-dominio.com/api/admin/cache?acao=limpar_todos"
```

**Via Script:**
```bash
node scripts/limpar-caches-expirados.js
```

### Monitoramento

Verificar tamanho dos caches:
```bash
# Via API
GET /api/admin/cache

# Via filesystem
du -sh config/cache/
```

### Troubleshooting

**Problema**: Cache não está sendo criado
- Verifique se o diretório `config/cache/` existe e tem permissões de escrita
- Verifique os logs do servidor para erros

**Problema**: Cache não está sendo utilizado
- Verifique se a chave de cache está sendo gerada corretamente
- Verifique se o cache não expirou
- Adicione logs para debug

**Problema**: Dados desatualizados
- Use `?atualizar_cache=true` para forçar atualização
- Verifique se os caches estão expirando corretamente
- Reduza o tempo de expiração se necessário

## Segurança

- Apenas usuários com permissões adequadas podem acessar dados cacheados
- Os caches respeitam as permissões do usuário (polo, escola, etc.)
- Caches são específicos por usuário quando aplicável
- Arquivos de cache não devem ser commitados no Git (já configurado no `.gitignore`)

## Limitações

- **Armazenamento**: Limitado pelo espaço em disco disponível
- **Memória**: Grandes caches podem consumir memória ao serem carregados
- **Sincronização**: Em ambientes com múltiplas instâncias, cada uma tem seu próprio cache
- **Tempo Real**: Dados em cache podem ter até 1 hora de atraso (por design)

## Próximas Melhorias

- [ ] Cache distribuído (Redis) para ambientes multi-instância
- [ ] Invalidação seletiva de cache por tipo de dados
- [ ] Configuração de tempo de expiração por tipo de cache
- [ ] Estatísticas de hit/miss ratio
- [ ] Interface web para gerenciar caches

