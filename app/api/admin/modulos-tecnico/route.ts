import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { validateRequest, modulosTecnicoUpdateSchema } from '@/lib/schemas'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminModulosTecnico')

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    // Buscar todos os módulos ordenados por ordem
    const result = await pool.query(
      `SELECT id, modulo_key, modulo_label, habilitado, ordem, criado_em, atualizado_em FROM modulos_tecnico ORDER BY ordem ASC, modulo_label ASC`
    )

    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    log.error('Erro ao buscar módulos do técnico', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(['administrador'], async (request, usuario) => {
  try {
    const validation = await validateRequest(request, modulosTecnicoUpdateSchema)
    if (!validation.success) return validation.response
    const { modulos } = validation.data

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
        `SELECT id, modulo_key, modulo_label, habilitado, ordem, criado_em, atualizado_em FROM modulos_tecnico ORDER BY ordem ASC, modulo_label ASC`
      )

      return NextResponse.json(result.rows)
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    log.error('Erro ao atualizar módulos do técnico', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
