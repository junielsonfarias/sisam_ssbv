# Migração: Adicionar nota_producao e nivel_aprendizagem

## Descrição
Esta migração adiciona os campos `nota_producao` e `nivel_aprendizagem` à tabela `resultados_consolidados` e atualiza as views relacionadas.

Esses campos são necessários para séries como 2º ano, 3º ano e 5º ano.

## Campos Adicionados

### `nota_producao`
- Tipo: `DECIMAL(5,2)`
- Descrição: Nota de produção textual do aluno
- Permite NULL: Sim

### `nivel_aprendizagem`
- Tipo: `VARCHAR(50)`
- Descrição: Nível de aprendizagem do aluno
- Valores possíveis: 'Insuficiente', 'Básico', 'Adequado', 'Avançado', NULL
- Permite NULL: Sim

## Como Executar

### Opção 1: Usando o script Node.js
```bash
node scripts/executar-migracao-campos-adicionais.js
```

### Opção 2: Executando o SQL diretamente
```bash
psql -U postgres -d sisam -f database/migrations/add-nota-producao-nivel-aprendizagem.sql
```

### Opção 3: Via Supabase (se estiver usando)
1. Acesse o SQL Editor no Supabase
2. Copie e cole o conteúdo do arquivo `add-nota-producao-nivel-aprendizagem.sql`
3. Execute o script

## O que a migração faz

1. **Adiciona colunas na tabela `resultados_consolidados`**
   - Adiciona `nota_producao DECIMAL(5,2)`
   - Adiciona `nivel_aprendizagem VARCHAR(50)`

2. **Atualiza a VIEW `resultados_consolidados_v2`**
   - Adiciona suporte para `nota_producao` (inicialmente NULL, pode ser calculado posteriormente)

3. **Atualiza a VIEW `resultados_consolidados_unificada`**
   - Inclui `nota_producao` e `nivel_aprendizagem` nos resultados

## Verificação

Após executar a migração, você pode verificar se os campos foram adicionados:

```sql
-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'resultados_consolidados'
AND column_name IN ('nota_producao', 'nivel_aprendizagem');

-- Verificar estrutura da view
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'resultados_consolidados_unificada'
AND column_name IN ('nota_producao', 'nivel_aprendizagem');
```

## Notas Importantes

- A `nota_producao` na view `resultados_consolidados_v2` é inicialmente NULL. Ela pode ser preenchida:
  - Manualmente na tabela `resultados_consolidados`
  - Através de importação de dados
  - Através de cálculo específico se houver questões de produção textual identificáveis

- O `nivel_aprendizagem` deve ser preenchido na tabela `resultados_consolidados` durante a importação ou processamento dos dados.

## Reversão (se necessário)

Se precisar reverter a migração:

```sql
-- Remover colunas da tabela
ALTER TABLE resultados_consolidados 
DROP COLUMN IF EXISTS nota_producao,
DROP COLUMN IF EXISTS nivel_aprendizagem;

-- Recriar views sem os campos (usar versão anterior)
-- (Execute a migração anterior para restaurar as views)
```






