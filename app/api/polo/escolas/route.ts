import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('PoloEscolas')

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['polo']) || !usuario.polo_id) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const result = await pool.query(
      'SELECT id, nome, codigo_inep, endereco, polo_id, ativo, gestor_escolar_habilitado FROM escolas WHERE polo_id = $1 AND ativo = true ORDER BY nome',
      [usuario.polo_id]
    )

    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    log.error('Erro ao buscar escolas', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

