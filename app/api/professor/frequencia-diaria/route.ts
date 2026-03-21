import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'
import { buscarFrequenciaDiaria, registrarFrequenciaDiaria, excluirFrequenciaDiaria } from '@/lib/services/frequencia'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/frequencia-diaria?turma_id=X&data=YYYY-MM-DD
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')
  const data = searchParams.get('data')

  if (!turmaId || !data) {
    return NextResponse.json({ mensagem: 'turma_id e data são obrigatórios' }, { status: 400 })
  }
  if (!validarData(data)) {
    return NextResponse.json({ mensagem: 'Formato de data inválido (use YYYY-MM-DD)' }, { status: 400 })
  }

  const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const resultado = await buscarFrequenciaDiaria(turmaId, data)
  return NextResponse.json(resultado)
})

/**
 * POST /api/professor/frequencia-diaria
 * Body: { turma_id, data, registros: [{aluno_id, status}] }
 */
export const POST = withAuth('professor', async (request, usuario) => {
  const { turma_id, data, registros } = await request.json()

  if (!turma_id || !data || !registros || !Array.isArray(registros)) {
    return NextResponse.json({ mensagem: 'turma_id, data e registros são obrigatórios' }, { status: 400 })
  }
  if (!validarData(data)) {
    return NextResponse.json({ mensagem: 'Formato de data inválido (use YYYY-MM-DD)' }, { status: 400 })
  }

  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const salvos = await registrarFrequenciaDiaria(turma_id, data, registros, usuario.id)
  return NextResponse.json({ mensagem: `Frequência registrada: ${salvos} aluno(s)`, salvos })
})

/**
 * DELETE /api/professor/frequencia-diaria
 * Body: { frequencia_id }
 */
export const DELETE = withAuth('professor', async (request, usuario) => {
  const { frequencia_id } = await request.json()
  if (!frequencia_id) {
    return NextResponse.json({ mensagem: 'frequencia_id é obrigatório' }, { status: 400 })
  }

  // Verificar que a frequência pertence a uma turma do professor
  const freqResult = await pool.query(
    `SELECT fd.id FROM frequencia_diaria fd
     INNER JOIN professor_turmas pt ON pt.turma_id = fd.turma_id
     WHERE fd.id = $1 AND pt.professor_id = $2 AND pt.ativo = true`,
    [frequencia_id, usuario.id]
  )
  if (freqResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Registro não encontrado ou sem permissão' }, { status: 404 })
  }

  await excluirFrequenciaDiaria(frequencia_id)
  return NextResponse.json({ mensagem: 'Registro excluído com sucesso' })
})
