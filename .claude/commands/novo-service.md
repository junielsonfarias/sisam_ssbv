Crie um novo service no padrao do projeto SISAM.

Entrada: $ARGUMENTS (nome do recurso e descricao)
Exemplo: "lembretes Service para gerenciar lembretes escolares"

Siga EXATAMENTE este padrao:

1. Criar `lib/services/[recurso].service.ts` com:
   ```typescript
   import pool from '@/database/connection'
   import { createLogger } from '@/lib/logger'

   const log = createLogger('[Recurso]')

   // Interfaces para DB rows
   interface RecursoDbRow {
     id: string
     // ... campos do SELECT
   }

   // Interface publica de retorno
   export interface Recurso {
     id: string
     // ... campos tipados
   }
   ```

2. Funcoes exportadas:
   - JSDoc com descricao e "Usado por: [rota]"
   - Parametros tipados (nunca `any` para params de entrada)
   - Retorno tipado: `Promise<Recurso[]>` ou `Promise<Recurso | null>`
   - Queries parametrizadas com `$1, $2`
   - Usar `createWhereBuilder()` para WHERE dinamicos
   - `ORDER BY` para consistencia
   - `LIMIT` para seguranca em buscas

3. Padrao de busca:
   ```typescript
   export async function buscarRecursos(filtros: FiltrosRecurso): Promise<Recurso[]> {
     const where = createWhereBuilder()
     addRawCondition(where, 'r.ativo = true')
     if (filtros.escolaId) addCondition(where, 'r.escola_id', filtros.escolaId)
     const result = await pool.query(
       `SELECT ... FROM recursos r WHERE ${buildConditionsString(where)} ORDER BY r.nome LIMIT 100`,
       where.params
     )
     return result.rows
   }
   ```

4. Apos criar, verificar tipos com `npx tsc --noEmit`.
