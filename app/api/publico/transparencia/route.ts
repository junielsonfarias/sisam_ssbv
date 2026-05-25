/**
 * GET /api/publico/transparencia
 *
 * Endpoint PÚBLICO (sem auth) — dados abertos da rede municipal.
 * Apenas indicadores agregados, sem dados individuais identificáveis.
 *
 * Query:
 *  - ?recurso=resumo (default): visão geral municipal
 *  - ?recurso=escolas: lista escolas com indicadores
 *  - ?recurso=indicadores&escola=<uuid>: detalhe de uma escola
 *  - ?ano=2026 (opcional, default ano atual)
 *
 * Rate-limit: aplicado pelo middleware global (rota /api/).
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  indicadoresEscola,
  listarEscolasPublicas,
  resumoMunicipal,
} from '@/lib/services/transparencia.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'resumo'
  const ano = searchParams.get('ano') || String(new Date().getFullYear())

  // Cache curto (5 min) — dados podem ser servidos por CDN
  const headers = {
    'Cache-Control': 'public, max-age=300, s-maxage=300',
    'Content-Type': 'application/json',
  }

  try {
    switch (recurso) {
      case 'resumo': {
        const dados = await resumoMunicipal(ano)
        return NextResponse.json(dados, { headers })
      }
      case 'escolas': {
        const dados = await listarEscolasPublicas(ano)
        return NextResponse.json({ ano_letivo: ano, total: dados.length, escolas: dados }, { headers })
      }
      case 'indicadores': {
        const escolaId = searchParams.get('escola')
        if (!escolaId) {
          return NextResponse.json({ mensagem: 'Informe ?escola=' }, { status: 400 })
        }
        const dados = await indicadoresEscola(escolaId, ano)
        if (!dados) return NextResponse.json({ mensagem: 'Escola não encontrada' }, { status: 404 })
        return NextResponse.json(dados, { headers })
      }
      default:
        return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ mensagem: 'Erro ao consultar dados' }, { status: 500 })
  }
}
