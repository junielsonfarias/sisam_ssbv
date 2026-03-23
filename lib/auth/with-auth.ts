import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { Usuario, TipoUsuario } from '@/lib/types'

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
      console.error(`Erro na rota ${request.method} ${request.url}:`, (error as Error)?.message)
      return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
    }
  }
}
