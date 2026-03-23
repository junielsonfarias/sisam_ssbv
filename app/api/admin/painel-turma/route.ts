import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { isAnosFinais } from '@/lib/disciplinas-mapping'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/painel-turma
 * Retorna dados do painel da turma: alunos, status de entrada, horário do dia, frequência por aula
 * Params: turma_id, data (YYYY-MM-DD, default: hoje)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]

    if (!turmaId) {
      return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
    }

    // Buscar info da turma
    const turmaResult = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, t.escola_id
       FROM turmas t WHERE t.id = $1`,
      [turmaId]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaResult.rows[0]
    const porAula = isAnosFinais(turma.serie)

    // Calcular dia da semana (1=Seg, 5=Sex)
    const dataObj = new Date(data + 'T12:00:00')
    const jsDay = dataObj.getUTCDay() // 0=Dom, 1=Seg, ..., 6=Sab
    const diaSemana = jsDay === 0 ? 7 : jsDay // 1=Seg...5=Sex, 6=Sab, 7=Dom
    const isDiaLetivo = diaSemana >= 1 && diaSemana <= 5

    // Buscar alunos da turma
    const alunosResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.situacao
       FROM alunos a
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
       ORDER BY a.nome`,
      [turmaId]
    )

    // Buscar entradas do dia (frequencia_diaria)
    const entradasResult = await pool.query(
      `SELECT aluno_id, hora_entrada, hora_saida
       FROM frequencia_diaria
       WHERE turma_id = $1 AND data = $2`,
      [turmaId, data]
    )

    const entradasMap = new Map<string, { hora_entrada: string | null; hora_saida: string | null }>()
    for (const e of entradasResult.rows) {
      entradasMap.set(e.aluno_id, { hora_entrada: e.hora_entrada, hora_saida: e.hora_saida })
    }

    // Buscar horário do dia (apenas para 6º-9º)
    let horarioDia: any[] = []
    let frequenciaAulas = new Map<string, Map<number, any>>()

    if (porAula && isDiaLetivo) {
      const horarioResult = await pool.query(
        `SELECT h.numero_aula, h.disciplina_id,
                d.nome AS disciplina_nome, d.codigo AS disciplina_codigo
         FROM horarios_aula h
         INNER JOIN disciplinas_escolares d ON d.id = h.disciplina_id
         WHERE h.turma_id = $1 AND h.dia_semana = $2
         ORDER BY h.numero_aula`,
        [turmaId, diaSemana]
      )
      horarioDia = horarioResult.rows

      // Buscar frequência por aula já registrada
      const fhaResult = await pool.query(
        `SELECT aluno_id, numero_aula, disciplina_id, presente, metodo
         FROM frequencia_hora_aula
         WHERE turma_id = $1 AND data = $2`,
        [turmaId, data]
      )

      for (const f of fhaResult.rows) {
        if (!frequenciaAulas.has(f.aluno_id)) {
          frequenciaAulas.set(f.aluno_id, new Map())
        }
        frequenciaAulas.get(f.aluno_id)!.set(f.numero_aula, {
          presente: f.presente,
          disciplina_id: f.disciplina_id,
          metodo: f.metodo,
        })
      }
    }

    // Montar resposta dos alunos
    const alunos = alunosResult.rows.map(a => {
      const entrada = entradasMap.get(a.id)
      const aulas: Record<number, any> = {}

      if (porAula) {
        const aulasAluno = frequenciaAulas.get(a.id)
        for (let i = 1; i <= 6; i++) {
          aulas[i] = aulasAluno?.get(i) || null
        }
      }

      return {
        id: a.id,
        nome: a.nome,
        codigo: a.codigo,
        na_escola: !!entrada?.hora_entrada,
        hora_entrada: entrada?.hora_entrada || null,
        hora_saida: entrada?.hora_saida || null,
        aulas: porAula ? aulas : undefined,
      }
    })

    // Contar aulas já registradas
    const aulasRegistradas = new Set<number>()
    for (const [, aulasMap] of frequenciaAulas) {
      for (const [num] of aulasMap) {
        aulasRegistradas.add(num)
      }
    }

    return NextResponse.json({
      turma: {
        id: turma.id,
        codigo: turma.codigo,
        nome: turma.nome,
        serie: turma.serie,
      },
      data,
      dia_semana: diaSemana,
      modelo_frequencia: porAula ? 'por_aula' : 'unificada',
      alunos,
      horario_dia: horarioDia,
      aulas_registradas: Array.from(aulasRegistradas),
      resumo: {
        total_alunos: alunos.length,
        presentes_na_escola: alunos.filter(a => a.na_escola).length,
        ausentes: alunos.filter(a => !a.na_escola).length,
        aulas_registradas: aulasRegistradas.size,
        total_aulas: horarioDia.length,
      },
    })
  } catch (error: unknown) {
    console.error('Erro no painel da turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
