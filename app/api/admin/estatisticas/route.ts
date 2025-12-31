import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const [usuarios, escolas, polos, questoes, resultados] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM escolas WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM polos WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM questoes'),
      pool.query('SELECT COUNT(*) as total FROM resultados_provas'),
    ])

    return NextResponse.json({
      totalUsuarios: parseInt(usuarios.rows[0].total),
      totalEscolas: parseInt(escolas.rows[0].total),
      totalPolos: parseInt(polos.rows[0].total),
      totalQuestoes: parseInt(questoes.rows[0].total),
      totalResultados: parseInt(resultados.rows[0].total),
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

