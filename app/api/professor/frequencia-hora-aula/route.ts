import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'
import { buscarFrequenciaHoraAula, registrarFrequenciaHoraAula } from '@/lib/services/frequencia'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/frequencia-hora-aula?turma_id=X&data=YYYY-MM-DD
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

  const resultado = await buscarFrequenciaHoraAula(turmaId, data)
  return NextResponse.json(resultado)
})

/**
 * POST /api/professor/frequencia-hora-aula
 * Body: { turma_id, data, numero_aula, disciplina_id, registros: [{aluno_id, presente}] }
 */
export const POST = withAuth('professor', async (request, usuario) => {
  const { turma_id, data, numero_aula, disciplina_id, registros } = await request.json()

  if (!turma_id || !data || !numero_aula || !disciplina_id || !registros || !Array.isArray(registros)) {
    return NextResponse.json({ mensagem: 'turma_id, data, numero_aula, disciplina_id e registros são obrigatórios' }, { status: 400 })
  }
  if (!validarData(data)) {
    return NextResponse.json({ mensagem: 'Formato de data inválido (use YYYY-MM-DD)' }, { status: 400 })
  }

  // Verificar vínculo com turma
  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  // Verificar vínculo com disciplina (polivalente pode qualquer, disciplina só a vinculada)
  const vinculoResult = await pool.query(
    `SELECT tipo_vinculo, disciplina_id FROM professor_turmas
     WHERE professor_id = $1 AND turma_id = $2 AND ativo = true`,
    [usuario.id, turma_id]
  )
  const vinculos = vinculoResult.rows
  const isPolivalente = vinculos.some((v: any) => v.tipo_vinculo === 'polivalente')
  const temDisciplina = vinculos.some((v: any) => v.disciplina_id === disciplina_id)

  if (!isPolivalente && !temDisciplina) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta disciplina' }, { status: 403 })
  }

  // Validar que a disciplina está no horário
  const dataObj = new Date(data + 'T12:00:00')
  let diaSemana = dataObj.getDay()
  if (diaSemana === 0) diaSemana = 7

  const horarioCheck = await pool.query(
    `SELECT 1 FROM horarios_aula
     WHERE turma_id = $1 AND numero_aula = $2 AND disciplina_id = $3 AND dia_semana = $4`,
    [turma_id, numero_aula, disciplina_id, diaSemana]
  )
  if (horarioCheck.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Esta disciplina não está na grade horária para este dia/aula' }, { status: 400 })
  }

  const salvos = await registrarFrequenciaHoraAula(turma_id, data, numero_aula, disciplina_id, registros, usuario.id)

  return NextResponse.json({
    mensagem: `Frequência registrada: ${salvos} aluno(s) na ${numero_aula}ª aula`,
    salvos,
    numero_aula,
  })
})
