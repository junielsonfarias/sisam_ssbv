import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { Usuario, TipoUsuario } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { validarModulo, type Modulo } from '@/lib/auth/validar-modulo'

const log = createLogger('with-auth')

/**
 * Wrapper de autenticação para rotas API.
 * Elimina o boilerplate de getUsuarioFromRequest + verificarPermissao.
 *
 * Uso simples (qualquer usuário autenticado):
 * ```ts
 * export const GET = withAuth(async (request, usuario) => {
 *   return NextResponse.json({ nome: usuario.nome })
 * })
 * ```
 *
 * Com restrição por tipo:
 * ```ts
 * export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
 *   // só admin e técnico chegam aqui
 * })
 * ```
 *
 * Apenas professor:
 * ```ts
 * export const GET = withAuth('professor', async (request, usuario) => {
 *   // só professor chega aqui
 * })
 * ```
 */
export function withAuth(
  tiposOuHandler: TipoUsuario[] | TipoUsuario | ((request: NextRequest, usuario: Usuario) => Promise<NextResponse>),
  handler?: (request: NextRequest, usuario: Usuario) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  let tiposPermitidos: TipoUsuario[] | null = null
  let fn: (request: NextRequest, usuario: Usuario) => Promise<NextResponse>

  if (typeof tiposOuHandler === 'function') {
    // withAuth(async (req, user) => { ... })
    tiposPermitidos = null
    fn = tiposOuHandler
  } else if (typeof tiposOuHandler === 'string') {
    // withAuth('professor', async (req, user) => { ... })
    tiposPermitidos = [tiposOuHandler]
    fn = handler!
  } else {
    // withAuth(['admin', 'tecnico'], async (req, user) => { ... })
    tiposPermitidos = tiposOuHandler
    fn = handler!
  }

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const usuario = await getUsuarioFromRequest(request)

      if (!usuario) {
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 401 })
      }

      if (tiposPermitidos && !verificarPermissao(usuario, tiposPermitidos)) {
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
      }

      return await fn(request, usuario)
    } catch (error: unknown) {
      log.error(`Erro na rota ${request.method} ${request.url}`, error)
      return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
    }
  }
}

/**
 * Variante de `withAuth` que também exige acesso a um módulo (Pt.2).
 *
 * Antes deste wrapper, as colunas `acesso_sisam/gestor/semed/transparencia/admin`
 * eram populadas no JWT mas NUNCA validadas no backend — qualquer usuário
 * cujo tipo era permitido chegava nos endpoints `/api/semed/...` mesmo com
 * `acesso_semed = false`. A coluna era cosmética.
 *
 * USO:
 * ```ts
 * export const GET = withAuthModulo(['administrador', 'tecnico'], 'semed', async (req, user) => {
 *   // só chega aqui se user passar em verificarPermissao E em validarModulo('semed')
 * })
 * ```
 *
 * Administradores plenos sempre passam (fallback definido em `validarModulo`).
 */
export function withAuthModulo(
  tiposPermitidos: TipoUsuario[] | TipoUsuario,
  modulo: Modulo,
  handler: (request: NextRequest, usuario: Usuario) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  const tipos = typeof tiposPermitidos === 'string' ? [tiposPermitidos] : tiposPermitidos

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const usuario = await getUsuarioFromRequest(request)

      if (!usuario) {
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 401 })
      }

      if (!verificarPermissao(usuario, tipos)) {
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
      }

      if (!validarModulo(usuario, modulo)) {
        return NextResponse.json(
          { mensagem: 'Você não tem acesso ao módulo solicitado.' },
          { status: 403 }
        )
      }

      return await handler(request, usuario)
    } catch (error: unknown) {
      log.error(`Erro na rota ${request.method} ${request.url}`, error)
      return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
    }
  }
}
