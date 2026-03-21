import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/frequencia-hora-aula
 * Lista frequência por hora-aula de uma turma do professor
 * Params: turma_id, data
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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

    // Buscar dia da semana (1=seg, 5=sex)
    const dataObj = new Date(data + 'T12:00:00')
    let diaSemana = dataObj.getDay() // 0=dom, 6=sab
    if (diaSemana === 0) diaSemana = 7 // dom → 7
    // Converter para 1-5 (seg-sex)

    // Buscar horários do dia para a turma
    const horariosResult = await pool.query(
      `SELECT ha.numero_aula, ha.disciplina_id, de.nome as disciplina_nome, de.abreviacao
       FROM horarios_aula ha
       INNER JOIN disciplinas_escolares de ON de.id = ha.disciplina_id
       WHERE ha.turma_id = $1 AND ha.dia_semana = $2
       ORDER BY ha.numero_aula`,
      [turmaId, diaSemana]
    )

    // Buscar frequência já registrada
    const frequenciasResult = await pool.query(
      `SELECT fha.id, fha.aluno_id, fha.numero_aula, fha.disciplina_id,
              fha.presente, fha.metodo,
              a.nome AS aluno_nome, a.codigo AS aluno_codigo,
              de.nome AS disciplina_nome
       FROM frequencia_hora_aula fha
       INNER JOIN alunos a ON a.id = fha.aluno_id
       INNER JOIN disciplinas_escolares de ON de.id = fha.disciplina_id
       WHERE fha.turma_id = $1 AND fha.data = $2
       ORDER BY fha.numero_aula, a.nome`,
      [turmaId, data]
    )

    // Buscar alunos da turma
    const alunosResult = await pool.query(
      `SELECT id, nome, codigo FROM alunos
       WHERE turma_id = $1 AND ativo = true AND situacao = 'cursando'
       ORDER BY nome`,
      [turmaId]
    )

    return NextResponse.json({
      horarios: horariosResult.rows,
      frequencias: frequenciasResult.rows,
      alunos: alunosResult.rows,
    })
  } catch (error: any) {
    console.error('Erro ao buscar frequência por aula:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/professor/frequencia-hora-aula
 * Registra frequência por aula em lote
 * Body: { turma_id, data, numero_aula, disciplina_id, registros: [{aluno_id, presente}] }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { turma_id, data, numero_aula, disciplina_id, registros } = await request.json()

    if (!turma_id || !data || !numero_aula || !disciplina_id || !registros || !Array.isArray(registros)) {
      return NextResponse.json({ mensagem: 'turma_id, data, numero_aula, disciplina_id e registros são obrigatórios' }, { status: 400 })
    }

    if (!validarData(data)) {
      return NextResponse.json({ mensagem: 'Formato de data inválido (use YYYY-MM-DD)' }, { status: 400 })
    }

    // Verificar vínculo (para disciplina, verificar a disciplina específica)
    const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Verificar se professor tem vínculo com esta disciplina (se tipo disciplina)
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

    // Validar que a disciplina está no horário da turma para este dia/aula
    const dataObj = new Date(data + 'T12:00:00')
    let diaSemanaPost = dataObj.getDay()
    if (diaSemanaPost === 0) diaSemanaPost = 7

    const horarioCheck = await pool.query(
      `SELECT 1 FROM horarios_aula
       WHERE turma_id = $1 AND numero_aula = $2 AND disciplina_id = $3 AND dia_semana = $4`,
      [turma_id, numero_aula, disciplina_id, diaSemanaPost]
    )
    if (horarioCheck.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Esta disciplina não está na grade horária para este dia/aula' }, { status: 400 })
    }

    // Buscar escola_id
    const turmaResult = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turma_id])
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    const escolaId = turmaResult.rows[0].escola_id

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let salvos = 0
      for (const reg of registros) {
        if (!reg.aluno_id || reg.presente === undefined) continue

        await client.query(
          `INSERT INTO frequencia_hora_aula
            (aluno_id, turma_id, escola_id, data, numero_aula, disciplina_id, presente, metodo, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', $8)
           ON CONFLICT (aluno_id, data, numero_aula) DO UPDATE SET
            presente = EXCLUDED.presente,
            disciplina_id = EXCLUDED.disciplina_id,
            metodo = 'manual',
            registrado_por = EXCLUDED.registrado_por`,
          [reg.aluno_id, turma_id, escolaId, data, numero_aula, disciplina_id, reg.presente, usuario.id]
        )
        salvos++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Frequência registrada: ${salvos} aluno(s) na ${numero_aula}ª aula`,
        salvos,
        numero_aula,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao registrar frequência por aula:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
