import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/notas-escolares/boletim?aluno_id=X&ano_letivo=Y
 *
 * Retorna boletim completo: todas disciplinas x todos períodos do ano
 * Inclui médias anuais calculadas e situação por disciplina
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id é obrigatório' }, { status: 400 })
    }

    // Buscar dados do aluno
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao,
              e.nome as escola_nome, e.id as escola_id, t.codigo as turma_codigo, t.nome as turma_nome
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Restrição de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== aluno.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    // Buscar configuração de notas da escola
    const configResult = await pool.query(
      'SELECT * FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
      [aluno.escola_id, anoLetivo]
    )
    const config = configResult.rows[0] || { nota_maxima: 10, media_aprovacao: 6 }

    // Buscar períodos do ano
    const periodosResult = await pool.query(
      `SELECT id, nome, tipo, numero FROM periodos_letivos
       WHERE ano_letivo = $1 AND ativo = true
       ORDER BY numero`,
      [anoLetivo]
    )

    // Buscar apenas disciplinas ativas
    const disciplinasResult = await pool.query(
      'SELECT id, nome, codigo, abreviacao, ordem FROM disciplinas_escolares WHERE ativo = true ORDER BY ordem, nome'
    )

    // Buscar todas as notas do aluno no ano
    const notasResult = await pool.query(
      `SELECT n.disciplina_id, n.periodo_id, n.nota, n.nota_recuperacao, n.nota_final, n.faltas, n.observacao
       FROM notas_escolares n
       WHERE n.aluno_id = $1 AND n.ano_letivo = $2`,
      [alunoId, anoLetivo]
    )

    // Buscar frequência unificada (para pré-escola e anos iniciais)
    const freqResult = await pool.query(
      `SELECT fb.periodo_id, fb.dias_letivos, fb.presencas, fb.faltas, fb.percentual_frequencia
       FROM frequencia_bimestral fb
       WHERE fb.aluno_id = $1 AND fb.ano_letivo = $2`,
      [alunoId, anoLetivo]
    )
    const freqMap: Record<string, any> = {}
    for (const f of freqResult.rows) {
      freqMap[f.periodo_id] = f
    }

    // Organizar notas em mapa: disciplina_id -> periodo_id -> nota
    const notasMap: Record<string, Record<string, any>> = {}
    for (const nota of notasResult.rows) {
      if (!notasMap[nota.disciplina_id]) notasMap[nota.disciplina_id] = {}
      notasMap[nota.disciplina_id][nota.periodo_id] = nota
    }

    // Montar boletim: para cada disciplina, todas as notas por período + média anual
    const boletim = disciplinasResult.rows.map(disc => {
      const periodos = periodosResult.rows.map(per => {
        const nota = notasMap[disc.id]?.[per.id]
        return {
          periodo_id: per.id,
          periodo_nome: per.nome,
          periodo_numero: per.numero,
          nota: nota?.nota ?? null,
          nota_recuperacao: nota?.nota_recuperacao ?? null,
          nota_final: nota?.nota_final ?? null,
          faltas: nota?.faltas ?? 0,
          observacao: nota?.observacao ?? null,
        }
      })

      // Calcular média anual (média das notas finais)
      const notasFinais = periodos
        .filter(p => p.nota_final !== null)
        .map(p => p.nota_final as number)

      const mediaAnual = notasFinais.length > 0
        ? Math.round((notasFinais.reduce((s, n) => s + n, 0) / notasFinais.length) * 100) / 100
        : null

      const totalFaltas = periodos.reduce((s, p) => s + p.faltas, 0)

      // Situação na disciplina
      let situacao: string | null = null
      if (mediaAnual !== null) {
        situacao = mediaAnual >= config.media_aprovacao ? 'aprovado' : 'reprovado'
      }

      return {
        disciplina_id: disc.id,
        disciplina_nome: disc.nome,
        disciplina_codigo: disc.codigo,
        periodos,
        media_anual: mediaAnual,
        total_faltas: totalFaltas,
        situacao,
      }
    })

    // Frequência unificada por período
    const frequenciaPeriodos = periodosResult.rows.map((per: any) => {
      const f = freqMap[per.id]
      return {
        periodo_id: per.id,
        periodo_nome: per.nome,
        dias_letivos: f?.dias_letivos ?? null,
        presencas: f?.presencas ?? null,
        faltas: f?.faltas ?? null,
        percentual: f?.percentual_frequencia ? parseFloat(f.percentual_frequencia) : null,
      }
    })

    // Resumo de recuperação: disciplinas onde houve recuperação
    const recuperacao = boletim
      .map(d => ({
        disciplina: d.disciplina_nome,
        disciplina_codigo: d.disciplina_codigo,
        periodos: d.periodos
          .filter(p => p.nota_recuperacao !== null)
          .map(p => ({
            periodo: p.periodo_nome,
            nota_original: p.nota,
            nota_recuperacao: p.nota_recuperacao,
            nota_final: p.nota_final,
            substituiu: p.nota_recuperacao !== null && p.nota !== null && (p.nota_recuperacao as number) > (p.nota as number),
          })),
      }))
      .filter(d => d.periodos.length > 0)

    return NextResponse.json({
      aluno,
      config,
      periodos: periodosResult.rows,
      boletim,
      frequencia: frequenciaPeriodos,
      recuperacao,
    })
  } catch (error: any) {
    console.error('Erro ao gerar boletim:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
