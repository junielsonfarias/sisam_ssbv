import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/infrequencia
 * Retorna alunos com maior infrequência em um período
 * Params: periodo_id, escola_id?, polo_id?, serie?, limite?
 *
 * Combina dados de:
 * - frequencia_bimestral (frequência unificada para pré-escola + 1º-5º)
 * - notas_escolares.faltas (frequência por disciplina para 6º-9º, somadas)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodoId = searchParams.get('periodo_id')
    const escolaId = searchParams.get('escola_id')
    const poloId = searchParams.get('polo_id')
    const serie = searchParams.get('serie')
    const limite = parseInt(searchParams.get('limite') || '50')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!periodoId) {
      return NextResponse.json({ mensagem: 'Informe periodo_id' }, { status: 400 })
    }

    // Restrições por permissão
    let escolaFilter: string | null = escolaId
    let poloFilter: string | null = poloId

    if (usuario.tipo_usuario === 'escola') {
      escolaFilter = usuario.escola_id || null
    } else if (usuario.tipo_usuario === 'polo') {
      poloFilter = usuario.polo_id || null
    }

    // Query para frequência unificada (pré-escola + 1º ao 5º)
    // Usa tabela frequencia_bimestral
    const paramsUnificada: any[] = [periodoId, anoLetivo]
    let whereUnificada = `WHERE fb.periodo_id = $1 AND a.ano_letivo = $2 AND (a.situacao = 'cursando' OR a.situacao IS NULL)`

    // Filtrar apenas séries de anos iniciais (não 6-9)
    whereUnificada += ` AND (
      t.serie !~ '^[6-9]' AND t.serie NOT LIKE '6%' AND t.serie NOT LIKE '7%' AND t.serie NOT LIKE '8%' AND t.serie NOT LIKE '9%'
    )`

    if (escolaFilter) {
      paramsUnificada.push(escolaFilter)
      whereUnificada += ` AND a.escola_id = $${paramsUnificada.length}`
    }
    if (poloFilter) {
      paramsUnificada.push(poloFilter)
      whereUnificada += ` AND e.polo_id = $${paramsUnificada.length}`
    }
    if (serie) {
      paramsUnificada.push(`%${serie}%`)
      whereUnificada += ` AND t.serie ILIKE $${paramsUnificada.length}`
    }

    const queryUnificada = `
      SELECT a.id as aluno_id, a.nome as aluno_nome, a.codigo, t.serie, t.codigo as turma_codigo,
             e.nome as escola_nome, p.nome as polo_nome,
             fb.dias_letivos, fb.faltas, fb.presencas, fb.faltas_justificadas,
             fb.percentual_frequencia,
             'unificada' as tipo_frequencia
      FROM frequencia_bimestral fb
      INNER JOIN alunos a ON fb.aluno_id = a.id
      INNER JOIN turmas t ON fb.turma_id = t.id
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${whereUnificada}
      ORDER BY fb.faltas DESC, a.nome
    `

    // Query para frequência por disciplina (6º ao 9º)
    // Soma faltas de todas as disciplinas em notas_escolares
    const paramsDisciplina: any[] = [periodoId, anoLetivo]
    let whereDisciplina = `WHERE ne.periodo_id = $1 AND a.ano_letivo = $2 AND (a.situacao = 'cursando' OR a.situacao IS NULL)`

    // Filtrar apenas séries de anos finais (6-9)
    whereDisciplina += ` AND (
      t.serie ~ '^[6-9]' OR t.serie LIKE '6%' OR t.serie LIKE '7%' OR t.serie LIKE '8%' OR t.serie LIKE '9%'
    )`

    if (escolaFilter) {
      paramsDisciplina.push(escolaFilter)
      whereDisciplina += ` AND a.escola_id = $${paramsDisciplina.length}`
    }
    if (poloFilter) {
      paramsDisciplina.push(poloFilter)
      whereDisciplina += ` AND e.polo_id = $${paramsDisciplina.length}`
    }
    if (serie) {
      paramsDisciplina.push(`%${serie}%`)
      whereDisciplina += ` AND t.serie ILIKE $${paramsDisciplina.length}`
    }

    const queryDisciplina = `
      SELECT a.id as aluno_id, a.nome as aluno_nome, a.codigo, t.serie, t.codigo as turma_codigo,
             e.nome as escola_nome, p.nome as polo_nome,
             SUM(ne.faltas) as faltas,
             COUNT(DISTINCT ne.disciplina_id) as total_disciplinas,
             'por_disciplina' as tipo_frequencia
      FROM notas_escolares ne
      INNER JOIN alunos a ON ne.aluno_id = a.id
      INNER JOIN turmas t ON ne.turma_id = t.id
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${whereDisciplina}
      GROUP BY a.id, a.nome, a.codigo, t.serie, t.codigo, e.nome, p.nome
      ORDER BY SUM(ne.faltas) DESC, a.nome
    `

    const [resultUnificada, resultDisciplina] = await Promise.all([
      pool.query(queryUnificada, paramsUnificada),
      pool.query(queryDisciplina, paramsDisciplina),
    ])

    // Combinar e ordenar por faltas (desc)
    const todosAlunos = [
      ...resultUnificada.rows.map((r: any) => ({
        ...r,
        faltas: parseInt(r.faltas) || 0,
        percentual_frequencia: r.percentual_frequencia ? parseFloat(r.percentual_frequencia) : null,
      })),
      ...resultDisciplina.rows.map((r: any) => ({
        ...r,
        faltas: parseInt(r.faltas) || 0,
        dias_letivos: null,
        presencas: null,
        faltas_justificadas: null,
        percentual_frequencia: null,
      })),
    ]
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, limite)

    // Resumo
    const totalAlunosInfrequentes = todosAlunos.filter(a => {
      if (a.tipo_frequencia === 'unificada' && a.percentual_frequencia !== null) {
        return a.percentual_frequencia < 75
      }
      return a.faltas > 10 // threshold para quando não temos percentual
    }).length

    return NextResponse.json({
      alunos: todosAlunos,
      resumo: {
        total: todosAlunos.length,
        infrequentes_75: totalAlunosInfrequentes,
      },
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar infrequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
