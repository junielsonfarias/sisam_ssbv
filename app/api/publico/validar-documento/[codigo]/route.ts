/**
 * GET /api/publico/validar-documento/[codigo]
 *
 * Endpoint público (sem auth) para validar documento via código curto.
 * Usado pela página /validar/[codigo] e pelo QR code do documento.
 *
 * Retorna dados não-sensíveis do snapshot para confirmação visual.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validarDocumento, TIPO_DOC_LABEL } from '@/lib/services/documentos.service'
import { getClientIP } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const codigo = params.codigo.toUpperCase().trim()
  if (!/^[A-Z0-9-]{8,20}$/.test(codigo)) {
    return NextResponse.json(
      { valido: false, mensagem: 'Código inválido' },
      { status: 400 }
    )
  }

  const doc = await validarDocumento({
    codigo,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
  })

  if (!doc) {
    return NextResponse.json(
      { valido: false, mensagem: 'Documento não encontrado ou cancelado.' },
      { status: 404 }
    )
  }

  // Retorna apenas dados resumidos (sem expor todo o snapshot)
  const snapshot = doc.dados_snapshot as any
  return NextResponse.json({
    valido: true,
    codigo: doc.codigo_validacao,
    tipo: doc.tipo,
    tipo_label: TIPO_DOC_LABEL[doc.tipo as keyof typeof TIPO_DOC_LABEL] || doc.tipo,
    aluno_nome: snapshot?.aluno?.nome || null,
    escola_nome: doc.escola_nome_snapshot || snapshot?.escola_atual?.nome || null,
    emitido_em: doc.emitido_em,
    hash_conteudo: doc.hash_conteudo,
    status: doc.status,
    vezes_validado: doc.vezes_validado,
  })
}
