import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/boletim
 *
 * Endpoint publico para consulta de boletim escolar.
 * Busca por codigo do aluno OU cpf + data_nascimento.
 *
 * Query params:
 *   - codigo: codigo do aluno
 *   - cpf: CPF do aluno (com ou sem mascara)
 *   - data_nascimento: data de nascimento (YYYY-MM-DD)
 *   - ano_letivo: ano letivo (opcional, default = ano atual)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo')?.trim()
    const cpfRaw = searchParams.get('cpf')?.trim()
    const dataNascimento = searchParams.get('data_nascimento')?.trim()
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    // Validar que pelo menos um criterio foi informado
    if (!codigo && (!cpfRaw || !dataNascimento)) {
      return NextResponse.json(
        { mensagem: 'Informe o codigo do aluno ou CPF + data de nascimento.' },
        { status: 400 }
      )
    }

    // Limpar CPF (remover pontos e tracos)
    const cpf = cpfRaw ? cpfRaw.replace(/\D/g, '') : null

    // Validar formato da data de nascimento
    if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return NextResponse.json(
        { mensagem: 'Data de nascimento deve estar no formato AAAA-MM-DD.' },
        { status: 400 }
      )
    }

    // Buscar aluno
    let alunoResult
    if (codigo) {
      alunoResult = await pool.query(
        `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao, a.pcd,
                e.nome as escola_nome,
                t.codigo as turma_codigo, t.nome as turma_nome
         FROM alunos a
         INNER JOIN escolas e ON a.escola_id = e.id
         LEFT JOIN turmas t ON a.turma_id = t.id
         WHERE a.codigo = $1 AND a.ativo = true AND a.ano_letivo = $2`,
        [codigo, anoLetivo]
      )
    } else {
      alunoResult = await pool.query(
        `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao, a.pcd,
                e.nome as escola_nome,
                t.codigo as turma_codigo, t.nome as turma_nome
         FROM alunos a
         INNER JOIN escolas e ON a.escola_id = e.id
         LEFT JOIN turmas t ON a.turma_id = t.id
         WHERE a.cpf = $1 AND a.data_nascimento = $2 AND a.ativo = true AND a.ano_letivo = $3`,
        [cpf, dataNascimento, anoLetivo]
      )
    }

    if (alunoResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno nao encontrado. Verifique os dados informados.' },
        { status: 404 }
      )
    }

    const aluno = alunoResult.rows[0]

    // Buscar notas escolares
    const notasResult = await pool.query(
      `SELECT ne.nota_final, ne.nota_recuperacao, ne.faltas,
              d.nome as disciplina, d.abreviacao,
              p.nome as periodo, p.numero as periodo_numero
       FROM notas_escolares ne
       INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
       INNER JOIN periodos_letivos p ON ne.periodo_id = p.id
       WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
       ORDER BY p.numero, d.nome`,
      [aluno.id, anoLetivo]
    )

    // Buscar frequencia bimestral
    const frequenciaResult = await pool.query(
      `SELECT fb.bimestre, fb.aulas_dadas, fb.faltas, fb.percentual_frequencia,
              p.nome as periodo_nome
       FROM frequencia_bimestral fb
       LEFT JOIN periodos_letivos p ON fb.periodo_id = p.id
       WHERE fb.aluno_id = $1 AND fb.ano_letivo = $2
       ORDER BY fb.bimestre`,
      [aluno.id, anoLetivo]
    )

    // Agrupar notas por periodo
    const notasPorPeriodo: Record<number, any[]> = {}
    for (const nota of notasResult.rows) {
      const num = nota.periodo_numero
      if (!notasPorPeriodo[num]) notasPorPeriodo[num] = []
      notasPorPeriodo[num].push({
        disciplina: nota.disciplina,
        abreviacao: nota.abreviacao,
        nota_final: nota.nota_final !== null ? parseFloat(nota.nota_final) : null,
        nota_recuperacao: nota.nota_recuperacao !== null ? parseFloat(nota.nota_recuperacao) : null,
        faltas: nota.faltas || 0,
      })
    }

    // Calcular frequencia geral
    const frequencias = frequenciaResult.rows.map((f: any) => ({
      bimestre: f.bimestre,
      periodo_nome: f.periodo_nome,
      aulas_dadas: f.aulas_dadas || 0,
      faltas: f.faltas || 0,
      percentual_frequencia: f.percentual_frequencia !== null
        ? parseFloat(f.percentual_frequencia)
        : null,
    }))

    const freqComValor = frequencias.filter((f: any) => f.percentual_frequencia !== null)
    const frequenciaGeral = freqComValor.length > 0
      ? Math.round(
          (freqComValor.reduce((sum: number, f: any) => sum + f.percentual_frequencia, 0) /
            freqComValor.length) *
            100
        ) / 100
      : null

    const totalFaltas = frequencias.reduce((sum: number, f: any) => sum + f.faltas, 0)

    return NextResponse.json({
      aluno: {
        nome: aluno.nome,
        codigo: aluno.codigo,
        serie: aluno.serie,
        turma_codigo: aluno.turma_codigo,
        turma_nome: aluno.turma_nome,
        escola_nome: aluno.escola_nome,
        ano_letivo: aluno.ano_letivo,
        situacao: aluno.situacao,
        pcd: aluno.pcd || false,
      },
      notas: notasPorPeriodo,
      frequencia: frequencias,
      frequencia_geral: frequenciaGeral,
      total_faltas: totalFaltas,
    })
  } catch (error: any) {
    console.error('Erro ao consultar boletim:', error?.message || error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}
