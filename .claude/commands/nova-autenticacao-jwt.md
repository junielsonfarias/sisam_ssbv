Crie um sistema de autenticacao JWT completo no padrao SISAM.

Entrada: $ARGUMENTS (tipos de usuario, ex: "admin,editor,usuario")

## 1. Criar `lib/types.ts` — Tipos de usuario
```typescript
export type TipoUsuario = 'administrador' | 'tecnico' | 'polo' | 'escola' | 'professor'
// Adaptar conforme $ARGUMENTS

export interface Usuario {
  id: string
  nome: string
  email: string
  tipo_usuario: TipoUsuario
  polo_id?: string | null
  escola_id?: string | null
  ativo: boolean
  criado_em: Date
}
```

## 2. Criar `lib/auth.ts` — Funcoes de autenticacao
```typescript
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pool from '@/database/connection'
import { Usuario, TipoUsuario } from './types'

const JWT_SECRET = process.env.JWT_SECRET
// Validar JWT_SECRET na inicializacao (min 32 chars, throw em producao)

export interface TokenPayload {
  userId: string
  email: string
  tipoUsuario: TipoUsuario
  poloId?: string | null
  escolaId?: string | null
}

// Hash senha com bcrypt (salt 12)
export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12)
}

// Comparar senha
export async function comparePassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash)
}

// Gerar token JWT (7 dias)
export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '7d' })
}

// Verificar token
export function verificarToken(token: string): TokenPayload | null {
  try { return jwt.verify(token, JWT_SECRET!) as TokenPayload } catch { return null }
}

// Extrair usuario do request (cookie httpOnly)
export async function getUsuarioFromRequest(request: NextRequest): Promise<Usuario | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  const payload = verificarToken(token)
  if (!payload) return null
  // Buscar usuario no banco (com cache em memoria)
  const result = await pool.query('SELECT id, nome, email, tipo_usuario, polo_id, escola_id, ativo FROM usuarios WHERE id = $1 AND ativo = true', [payload.userId])
  return result.rows[0] || null
}

// Verificar permissao
export function verificarPermissao(usuario: Usuario, tiposPermitidos: TipoUsuario[]): boolean {
  return tiposPermitidos.includes(usuario.tipo_usuario)
}
```

## 3. Criar `lib/auth/with-auth.ts` — Wrapper de autenticacao
```typescript
export function withAuth(
  tiposOuHandler: TipoUsuario[] | TipoUsuario | Handler,
  handler?: Handler
): (request: NextRequest) => Promise<NextResponse> {
  // Extrair tipos e handler dos args
  // Verificar auth e permissao
  // Retornar 401/403 se nao autorizado
  // Chamar handler com (request, usuario)
}
```

## 4. Criar API `/api/auth/login` (POST)
- Validar email + senha com Zod
- Buscar usuario no banco
- Comparar senha com bcrypt
- Gerar token JWT
- Setar cookie httpOnly, Secure, SameSite=Lax, maxAge=7dias, path=/
- Rate limiting proprio (5 tentativas/15min)

## 5. Criar API `/api/auth/logout` (GET)
- Limpar cookie auth-token (maxAge=0)

## 6. Criar API `/api/auth/verificar` (GET)
- Extrair usuario do request
- Retornar dados do usuario (sem senha)

## 7. Criar `components/protected-route.tsx`
- Verificar auth via API (com cache 5min)
- Suporte offline via localStorage
- Redirect para /login se nao autorizado
- Loading spinner enquanto verifica

## 8. Seguranca
- Senha minima: 12 caracteres com letra + numero
- JWT_SECRET minimo 32 caracteres
- Cookie httpOnly (JS nao acessa)
- SameSite=Lax (CSRF protection)
- Secure=true em producao
- Nunca retornar senha em respostas
- Log de auditoria em login/logout
