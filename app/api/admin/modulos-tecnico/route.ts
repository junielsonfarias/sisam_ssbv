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

    // Buscar todos os módulos ordenados por ordem
    const result = await pool.query(
      `SELECT * FROM modulos_tecnico ORDER BY ordem ASC, modulo_label ASC`
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar módulos do técnico:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor', erro: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado. Apenas administradores podem atualizar módulos.' },
        { status: 403 }
      )
    }

    const { modulos } = await request.json()

    if (!Array.isArray(modulos)) {
      return NextResponse.json(
        { mensagem: 'Formato inválido. Esperado array de módulos.' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Atualizar cada módulo
      for (const modulo of modulos) {
        if (!modulo.modulo_key) continue

        await client.query(
          `UPDATE modulos_tecnico 
           SET habilitado = $1, ordem = $2, modulo_label = $3, atualizado_em = CURRENT_TIMESTAMP
           WHERE modulo_key = $4`,
          [
            modulo.habilitado !== undefined ? modulo.habilitado : true,
            modulo.ordem !== undefined ? modulo.ordem : 0,
            modulo.modulo_label || modulo.modulo_key,
            modulo.modulo_key
          ]
        )
      }

      await client.query('COMMIT')

      // Retornar módulos atualizados
      const result = await pool.query(
        `SELECT * FROM modulos_tecnico ORDER BY ordem ASC, modulo_label ASC`
      )

      return NextResponse.json(result.rows)
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao atualizar módulos do técnico:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor', erro: error.message },
      { status: 500 }
    )
  }
}

