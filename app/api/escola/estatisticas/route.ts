import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['escola']) || !usuario.escola_id) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    let totalResultados = 0
    let totalAcertos = 0

    try {
      const resultadosResult = await pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1',
        [usuario.escola_id]
      )
      totalResultados = parseInt(resultadosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de resultados:', error.message)
    }

    try {
      const acertosResult = await pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1 AND acertou = true',
        [usuario.escola_id]
      )
      totalAcertos = parseInt(acertosResult.rows[0]?.total || '0', 10) || 0
    } catch (error: any) {
      console.error('Erro ao buscar total de acertos:', error.message)
    }

    const taxaAcertos = totalResultados > 0 ? (totalAcertos / totalResultados) * 100 : 0

    return NextResponse.json({
      totalResultados,
      taxaAcertos,
    })
  } catch (error: any) {
    console.error('Erro geral ao buscar estatísticas:', error)
    console.error('Stack trace:', error.stack)
    
    return NextResponse.json({
      totalResultados: 0,
      taxaAcertos: 0,
      erro: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 })
  }
}

