import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/alunos/[id]/historico
 * Dados completos para geração do histórico escolar
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { id: alunoId } = await params

    // Dados do aluno atual
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao,
              a.data_nascimento, a.cpf, a.rg, a.naturalidade, a.nacionalidade,
              a.nome_mae, a.nome_pai, a.responsavel, a.sexo,
              e.nome as escola_nome, e.id as escola_id
       FROM alunos a
       LEFT JOIN escolas e ON a.escola_id = e.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Buscar histórico de situação (anos anteriores) + notas + resultados SISAM
    const [historicoResult, notasResult, consolidadoResult] = await Promise.all([
      // Histórico de situação (transferências, aprovações, etc.)
      pool.query(
        `SELECT hs.situacao, hs.situacao_anterior, hs.data, hs.observacao,
                hs.escola_destino_nome, hs.escola_origem_nome, hs.criado_em
         FROM historico_situacao hs
         WHERE hs.aluno_id = $1
         ORDER BY hs.data ASC, hs.criado_em ASC`,
        [alunoId]
      ),

      // Notas escolares por ano/disciplina/bimestre
      pool.query(
        `SELECT ne.nota, ne.nota_recuperacao, ne.nota_final, ne.faltas,
                d.nome as disciplina, d.abreviacao, d.ordem,
                pl.nome as periodo, pl.numero as periodo_numero, pl.ano_letivo
         FROM notas_escolares ne
         JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
         JOIN periodos_letivos pl ON ne.periodo_id = pl.id
         WHERE ne.aluno_id = $1
         ORDER BY pl.ano_letivo, d.ordem, pl.numero`,
        [alunoId]
      ),

      // Resultados consolidados SISAM
      pool.query(
        `SELECT rc.ano_letivo, rc.serie,
                ROUND(rc.media_aluno::numeric, 1) as media_aluno,
                rc.presenca
         FROM resultados_consolidados rc
         WHERE rc.aluno_id = $1
         ORDER BY rc.ano_letivo`,
        [alunoId]
      ),
    ])

    // Organizar notas por ano_letivo > disciplina
    const notasPorAno: Record<string, Record<string, any>> = {}
    for (const nota of notasResult.rows) {
      const ano = nota.ano_letivo
      if (!notasPorAno[ano]) notasPorAno[ano] = {}
      const disc = nota.disciplina
      if (!notasPorAno[ano][disc]) {
        notasPorAno[ano][disc] = {
          disciplina: disc,
          abreviacao: nota.abreviacao,
          ordem: nota.ordem,
          bimestres: {},
          media: null,
          total_faltas: 0,
        }
      }
      notasPorAno[ano][disc].bimestres[nota.periodo_numero] = {
        nota: nota.nota !== null ? parseFloat(nota.nota) : null,
        recuperacao: nota.nota_recuperacao !== null ? parseFloat(nota.nota_recuperacao) : null,
        final: nota.nota_final !== null ? parseFloat(nota.nota_final) : null,
        faltas: nota.faltas !== null ? parseInt(nota.faltas) : 0,
      }
    }

    // Calcular médias
    for (const ano of Object.keys(notasPorAno)) {
      for (const disc of Object.keys(notasPorAno[ano])) {
        const bims = notasPorAno[ano][disc].bimestres
        const notasFinais = Object.values(bims)
          .map((b: any) => b.final ?? b.nota)
          .filter((n: any): n is number => n !== null)
        const totalFaltas = Object.values(bims).reduce(
          (sum: number, b: any) => sum + (b.faltas || 0), 0
        )
        notasPorAno[ano][disc].media = notasFinais.length > 0
          ? parseFloat((notasFinais.reduce((a: number, b: number) => a + b, 0) / notasFinais.length).toFixed(1))
          : null
        notasPorAno[ano][disc].total_faltas = totalFaltas
      }
    }

    return NextResponse.json({
      aluno: {
        ...aluno,
        data_nascimento: aluno.data_nascimento
          ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')
          : null,
      },
      historico_situacao: historicoResult.rows,
      notas_por_ano: notasPorAno,
      resultados_sisam: consolidadoResult.rows,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar histórico escolar:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
