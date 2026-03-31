Crie uma nova migracao SQL para o banco PostgreSQL do SISAM.

Entrada: $ARGUMENTS (descricao da tabela ou alteracao)
Exemplo: "tabela de lembretes com titulo, descricao, data, escola_id"

Siga EXATAMENTE este padrao:

1. Criar arquivo em `database/migrations/add-[nome-recurso].sql`
2. Header padrao:
   ```sql
   -- =====================================================
   -- SISAM - Migration: [Descricao]
   -- Data: [data atual]
   -- =====================================================
   ```
3. Usar `CREATE TABLE IF NOT EXISTS` com:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Campos com tipos adequados (VARCHAR, TEXT, INTEGER, BOOLEAN, TIMESTAMP, JSONB)
   - Foreign keys: `REFERENCES tabela(id) ON DELETE CASCADE`
   - `ativo BOOLEAN DEFAULT true`
   - `criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
   - `atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
4. Criar indices para campos de busca: `CREATE INDEX IF NOT EXISTS idx_...`
5. Indices compostos para queries frequentes
6. Se for alteracao de tabela existente, usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

Apos criar a migracao, perguntar se quer criar a API route e a pagina correspondentes.
