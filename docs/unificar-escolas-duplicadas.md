# Unificar Escolas Duplicadas

Este documento explica como unificar escolas que foram cadastradas com nomes similares devido a pequenas diferenças (pontos, espaços, etc.).

## Problema

Escolas com nomes praticamente idênticos foram cadastradas como escolas diferentes, por exemplo:
- `EMEF PDE JOSÉ DE ANCHIETA` (código: `EMEF_PDE_JOSÉ_DE_ANCHIETA`)
- `EMEF PDE. JOSÉ DE ANCHIETA` (código: `EMEF_PDE._JOSÉ_DE_ANCHIETA`)

A diferença é apenas um ponto após "PDE", mas isso criou duas escolas separadas no sistema.

## Solução

Foi criado um script SQL que:
1. **Analisa** todas as escolas e identifica grupos de duplicatas
2. **Unifica** as escolas duplicadas, mantendo a mais antiga e migrando todos os dados
3. **Desativa** (não deleta) as escolas duplicadas para manter histórico

## Como Executar

⚠️ **IMPORTANTE**: Execute os scripts na ordem, um por vez, no Supabase SQL Editor.

### Passo 1: Criar Função Auxiliar

Execute primeiro o arquivo: `database/migrations/unificar-escolas-duplicadas-etapa1-funcao.sql`

Esta parte cria a função que normaliza nomes de escolas para comparação.

### Passo 2: Análise

Execute o arquivo: `database/migrations/unificar-escolas-duplicadas-etapa2-analise.sql`

O script possui as seguintes seções:

1. ✅ **Função auxiliar** - Já executada no Passo 1
2. ✅ **Análise** - Mostra quais escolas serão unificadas (você está executando agora)
3. ⏳ **Unificação** - Executa a unificação (execute no Passo 3 após revisar)
4. ⏳ **Verificação** - Verifica se ainda há duplicatas (execute no Passo 4)

### Passo 2 (continuação): Revisar Resultados da Análise

Após executar a análise, você verá no painel de mensagens (Messages/Logs) do Supabase:
- Quantos grupos de escolas duplicadas foram encontrados
- Detalhes de cada escola no grupo:
  - ID, nome, código
  - Data de criação
  - Quantidade de alunos, turmas e resultados
  - Qual será mantida (a mais antiga) e quais serão unificadas

### Passo 3: Executar Unificação

Após revisar a análise, execute o arquivo: `database/migrations/unificar-escolas-duplicadas-etapa3-unificacao.sql`

O script irá:
1. Para cada grupo de escolas duplicadas:
   - Identificar a escola principal (mais antiga)
   - Migrar todos os dados relacionados:
     - Turmas (`turmas.escola_id`)
     - Alunos (`alunos.escola_id`)
     - Resultados consolidados (`resultados_consolidados.escola_id`)
     - Resultados de provas (`resultados_provas.escola_id`)
     - Usuários (`usuarios.escola_id`)
   - Desativar a escola duplicada (marcar como `ativo = false`)
   - Renomear o código da escola duplicada para evitar conflitos

### Passo 4: Verificação

Após a unificação, execute o arquivo: `database/migrations/unificar-escolas-duplicadas-etapa4-verificacao.sql`

Esta query mostrará se ainda existem escolas duplicadas. Se não retornar nenhuma linha, significa que tudo foi unificado com sucesso! ✅

## Prevenção Futura

O código de importação foi ajustado para usar normalização de nomes antes de comparar/criar escolas:

- Remove pontos (`.`)
- Remove espaços extras
- Compara nomes normalizados antes de criar novas escolas

Isso evita que novas duplicatas sejam criadas durante importações futuras.

## Notas Importantes

1. **Backup**: Sempre faça backup do banco antes de executar scripts de migração
2. **Histórico**: As escolas duplicadas são desativadas, não deletadas, mantendo o histórico
3. **Transações**: Cada escola é processada em uma transação separada, então se uma falhar, as outras continuam
4. **Logs**: O script mostra logs detalhados de cada etapa

## Função de Normalização

A função `normalizar_nome_escola()` normaliza nomes removendo:
- Pontos (`.`)
- Espaços múltiplos
- Converte para maiúsculas
- Remove espaços extras no início/fim

Exemplos:
- `EMEF PDE. JOSÉ DE ANCHIETA` → `EMEF PDE JOSÉ DE ANCHIETA`
- `EMEF  PDE   JOSÉ DE ANCHIETA` → `EMEF PDE JOSÉ DE ANCHIETA`

## Arquivos Relacionados

- `database/migrations/unificar-escolas-duplicadas-etapa1-funcao.sql` - Criar função auxiliar
- `database/migrations/unificar-escolas-duplicadas-etapa2-analise.sql` - Análise de duplicatas
- `database/migrations/unificar-escolas-duplicadas-etapa3-unificacao.sql` - Executar unificação
- `database/migrations/unificar-escolas-duplicadas-etapa4-verificacao.sql` - Verificar resultado
- `database/migrations/unificar-escolas-duplicadas.sql` - Script completo (alternativa)
- `app/api/admin/importar-completo/route.ts` - Código de importação ajustado
- `app/api/admin/importar-cadastros/route.ts` - Código de importação de cadastros ajustado

