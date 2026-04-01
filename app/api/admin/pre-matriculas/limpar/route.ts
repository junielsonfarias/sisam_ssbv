import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('LimparPreMatriculas')

export const dynamic = 'force-dynamic'

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  const result = await pool.query(
    `DELETE FROM pre_matriculas
     WHERE status = 'pendente'
     AND criado_em < NOW() - INTERVAL '90 days'
     RETURNING id`
  )
  const removidos = result.rowCount || 0
  log.info('Pre-matriculas pendentes removidas', { removidos, por: usuario.id })
  return NextResponse.json({
    mensagem: `${removidos} pre-matricula(s) pendente(s) removida(s)`,
    removidos
  })
})
