/**
 * /api/admin/censo-escolar
 *
 * GET ?tipo=alunos|docentes|turmas&ano=2026&escola=<uuid>?
 * Retorna CSV download.
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import {
  exportarAlunosCsv,
  exportarDocentesCsv,
  exportarTurmasCsv,
} from '@/lib/services/censo-escolar.service'

export const dynamic = 'force-dynamic'

export const GET = withAuthModulo(['administrador', 'tecnico'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') || 'alunos'
  const ano = searchParams.get('ano') || String(new Date().getFullYear())
  const escola = searchParams.get('escola') || undefined

  let csv: string
  switch (tipo) {
    case 'alunos':
      csv = await exportarAlunosCsv({ anoLetivo: ano, escolaId: escola })
      break
    case 'docentes':
      csv = await exportarDocentesCsv({ anoLetivo: ano, escolaId: escola })
      break
    case 'turmas':
      csv = await exportarTurmasCsv({ anoLetivo: ano, escolaId: escola })
      break
    default:
      return NextResponse.json({ mensagem: 'tipo inválido (alunos|docentes|turmas)' }, { status: 400 })
  }

  const filename = `censo-${tipo}-${ano}${escola ? `-escola-${escola.slice(0,8)}` : ''}.csv`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
