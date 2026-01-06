import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

/**
 * ENDPOINT DESABILITADO POR SEGURANCA
 * Este endpoint expunha informacoes sobre a infraestrutura (DNS, IPs, hosts).
 * Foi desabilitado para proteger o sistema contra reconhecimento de infraestrutura.
 */
export async function GET() {
  // Endpoint desabilitado por seguranca - nao expor informacoes de infraestrutura
  return NextResponse.json(
    {
      erro: true,
      mensagem: 'Endpoint desabilitado por motivos de seguranca',
      codigo: 'ENDPOINT_DISABLED'
    },
    { status: 404 }
  )
}

