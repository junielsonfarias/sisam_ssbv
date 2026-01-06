import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

/**
 * ENDPOINT DESABILITADO POR SEGURANCA
 * Este endpoint expunha informacoes sensiveis sobre variaveis de ambiente.
 * Foi desabilitado para proteger o sistema contra vazamento de informacoes.
 */
export async function GET() {
  // Endpoint desabilitado por seguranca - nao expor informacoes de ambiente
  return NextResponse.json(
    {
      erro: true,
      mensagem: 'Endpoint desabilitado por motivos de seguranca',
      codigo: 'ENDPOINT_DISABLED'
    },
    { status: 404 }
  )
}

