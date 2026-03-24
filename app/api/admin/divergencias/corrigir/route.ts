// SISAM - API de Correção de Divergências
// POST: Executa correção de divergências

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { executarCorrecao } from '@/lib/divergencias/corretores'
import { TipoDivergencia, CONFIGURACOES_DIVERGENCIAS } from '@/lib/divergencias/tipos'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/divergencias/corrigir
 * Executa correção de uma divergência específica
 *
 * Body:
 *   - tipo: TipoDivergencia (obrigatório)
 *   - ids: string[] (opcional - IDs específicos para corrigir)
 *   - corrigirTodos: boolean (opcional - corrigir todos do tipo)
 *   - dadosCorrecao: object (opcional - dados adicionais para correção manual)
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Acesso não autorizado. Apenas administradores podem corrigir divergências.' },
        { status: 403 }
      )
    }

    const correcaoSchema = z.object({
      tipo: z.string().min(1, 'Tipo é obrigatório'),
      ids: z.array(z.string()).optional(),
      corrigirTodos: z.boolean().optional(),
      dadosCorrecao: z.any().optional(),
    })
    let body: z.infer<typeof correcaoSchema>
    try {
      const raw = await request.json()
      const parsed = correcaoSchema.safeParse(raw)
      if (!parsed.success) {
        return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.errors }, { status: 400 })
      }
      body = parsed.data
    } catch {
      return NextResponse.json({ mensagem: 'Erro ao processar dados' }, { status: 400 })
    }
    const { tipo, ids, corrigirTodos, dadosCorrecao } = body

    // Validar tipo
    if (!tipo || !CONFIGURACOES_DIVERGENCIAS[tipo as TipoDivergencia]) {
      return NextResponse.json(
        { mensagem: 'Tipo de divergência inválido' },
        { status: 400 }
      )
    }

    const config = CONFIGURACOES_DIVERGENCIAS[tipo as TipoDivergencia]

    // Validar se é corrigível
    if (!config.corrigivel) {
      return NextResponse.json(
        { mensagem: `Divergência "${config.titulo}" não pode ser corrigida automaticamente` },
        { status: 400 }
      )
    }

    // Validar parâmetros
    if (!corrigirTodos && (!ids || ids.length === 0)) {
      return NextResponse.json(
        { mensagem: 'Informe os IDs para corrigir ou marque corrigirTodos=true' },
        { status: 400 }
      )
    }

    // Se não é correção automática e corrigirTodos foi marcado, bloquear
    if (!config.correcaoAutomatica && corrigirTodos) {
      return NextResponse.json(
        { mensagem: `"${config.titulo}" requer correção manual individual` },
        { status: 400 }
      )
    }

    // Executar correção
    const resultado = await executarCorrecao(
      {
        tipo: tipo as TipoDivergencia,
        ids,
        corrigirTodos,
        dadosCorrecao
      },
      usuario.id,
      usuario.nome
    )

    return NextResponse.json({
      ...resultado,
      tipo,
      titulo: config.titulo
    }, { status: resultado.sucesso ? 200 : 400 })

  } catch (error: unknown) {
    console.error('Erro ao corrigir divergência:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao corrigir divergência', erro: (error as Error).message },
      { status: 500 }
    )
  }
}
