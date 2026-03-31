Crie um sistema de controle de acesso granular (por polo, escola, tipo) no padrao SISAM.

Entrada: $ARGUMENTS (hierarquia de permissoes, ex: "admin>tecnico>polo>escola>professor")

## 1. Helpers de acesso (`lib/api-helpers.ts`)

### Filtro automatico por polo/escola
```typescript
export interface WhereClauseResult {
  conditions: string[]
  params: (string | number | boolean | null)[]
  paramIndex: number
}

export function createWhereBuilder(startIndex: number = 1): WhereClauseResult {
  return { conditions: [], params: [], paramIndex: startIndex }
}

export function addCondition(builder: WhereClauseResult, field: string, value: string | number | null | undefined): WhereClauseResult {
  if (value === null || value === undefined || value === '') return builder
  builder.conditions.push(\`\${field} = $\${builder.paramIndex}\`)
  builder.params.push(value)
  builder.paramIndex++
  return builder
}

export function addRawCondition(builder: WhereClauseResult, condition: string): WhereClauseResult {
  builder.conditions.push(condition)
  return builder
}

export function buildConditionsString(builder: WhereClauseResult): string {
  return builder.conditions.length > 0 ? builder.conditions.join(' AND ') : '1=1'
}

/**
 * Adiciona filtro de acesso baseado no tipo de usuario.
 * - admin/tecnico: sem filtro (ve tudo)
 * - polo: filtra por polo_id
 * - escola: filtra por escola_id
 * - professor: filtra por escola_id (via turmas)
 */
export function addAccessControl(
  builder: WhereClauseResult,
  usuario: Usuario,
  config?: { escolaAlias?: string; escolaIdField?: string; poloIdField?: string }
): WhereClauseResult {
  const escolaIdField = config?.escolaIdField || 'e.id'
  const poloIdField = config?.poloIdField || 'e.polo_id'

  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    addCondition(builder, poloIdField, usuario.polo_id)
  } else if (['escola', 'professor'].includes(usuario.tipo_usuario) && usuario.escola_id) {
    addCondition(builder, escolaIdField, usuario.escola_id)
  }
  // admin e tecnico: sem filtro (ve tudo)

  return builder
}
```

### Uso na API
```typescript
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const where = createWhereBuilder()
  addRawCondition(where, 'a.ativo = true')
  addAccessControl(where, usuario, { escolaIdField: 'a.escola_id', poloIdField: 'e.polo_id' })

  const result = await pool.query(\`
    SELECT a.*, e.nome as escola_nome
    FROM alunos a
    INNER JOIN escolas e ON a.escola_id = e.id
    WHERE \${buildConditionsString(where)}
    ORDER BY a.nome
  \`, where.params)

  return NextResponse.json({ dados: result.rows })
})
```

## 2. Verificacao de permissao no withAuth
```typescript
// Verificar se usuario tem permissao E acesso aos dados
export function verificarAcessoEscola(usuario: Usuario, escolaId: string): boolean {
  if (['administrador', 'tecnico'].includes(usuario.tipo_usuario)) return true
  if (usuario.tipo_usuario === 'escola' && usuario.escola_id === escolaId) return true
  return false
}

export function verificarAcessoPolo(usuario: Usuario, poloId: string): boolean {
  if (['administrador', 'tecnico'].includes(usuario.tipo_usuario)) return true
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id === poloId) return true
  return false
}
```

## 3. Hierarquia padrao SISAM
```
administrador — ve TUDO, gerencia TUDO
    |
tecnico — mesmas permissoes do admin
    |
polo — ve apenas seu polo e escolas vinculadas
    |
escola — ve apenas sua escola
    |
professor — ve apenas suas turmas/alunos
    |
editor — CRUD de noticias (sem acesso a dados escolares)
    |
publicador — CRUD de publicacoes oficiais
```

## 4. ProtectedRoute no frontend
```typescript
// Admin vê tudo
<ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>

// Admin + polo + escola
<ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>

// Apenas professor
<ProtectedRoute tiposPermitidos={['professor']}>
```

## O que deu MUITO certo
- `addAccessControl()` — uma funcao resolve 90% dos filtros de acesso
- WHERE builder — elimina SQL injection e facilita filtros dinamicos
- Hierarquia clara — admin/tecnico SEMPRE passam, polo/escola filtram automaticamente
- ProtectedRoute no frontend + withAuth no backend — dupla verificacao
- Cache de auth por 5 min — reduz queries de verificacao
