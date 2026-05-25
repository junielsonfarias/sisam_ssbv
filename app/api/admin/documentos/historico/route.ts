/**
 * POST /api/admin/documentos/historico
 *
 * Emite histórico escolar formal para um aluno. Retorna código de validação
 * e snapshot dos dados. PDF é gerado em endpoint separado / cliente.
 *
 * Body: { alunoId: uuid }
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  coletarDadosHistoricoEscolar,
  emitirDocumento,
} from '@/lib/services/documentos.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  alunoId: z.string().uuid(),
})

export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'alunoId obrigatório' }, { status: 400 })
  }

  let dados: Record<string, unknown>
  try {
    dados = await coletarDadosHistoricoEscolar(parsed.data.alunoId)
  } catch (e) {
    return NextResponse.json({ mensagem: (e as Error).message }, { status: 404 })
  }

  const resultado = await emitirDocumento({
    tipo: 'historico_escolar',
    alunoId: parsed.data.alunoId,
    dados,
    emitidoPor: usuario.id,
    escolaId: usuario.escola_id || null,
    escolaNome: (dados.escola_atual as any)?.nome || null,
  })

  return NextResponse.json({
    ...resultado,
    dados,
    url_validacao: `/validar/${resultado.codigo_validacao}`,
    mensagem: 'Histórico emitido. Use o código de validação para verificar autenticidade.',
  }, { status: 201 })
})
