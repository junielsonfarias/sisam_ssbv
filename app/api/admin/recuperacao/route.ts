import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/recuperacao
 * Lista alunos em situação de recuperação (nota abaixo da média)
 * Params: periodo_id, escola_id?, turma_id?, serie?, ano_letivo?
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
    const turmaId = searchParams.get('turma_id')
    const serie = searchParams.get('serie')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!periodoId) {
      return NextResponse.json({ mensagem: 'Informe periodo_id' }, { status: 400 })
    }

    // Restrições por permissão
    let escolaFilter: string | null = escolaId
    let poloFilter: string | null = null

    if (usuario.tipo_usuario === 'escola') {
      escolaFilter = usuario.escola_id || null
    } else if (usuario.tipo_usuario === 'polo') {
      poloFilter = usuario.polo_id || null
    }

    // Buscar média de aprovação (usar a primeira configuração encontrada ou padrão 6)
    let mediaAprovacao = 6
    const configQuery = escolaFilter
      ? `SELECT media_aprovacao FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2 LIMIT 1`
      : `SELECT media_aprovacao FROM configuracao_notas_escola WHERE ano_letivo = $1 LIMIT 1`
    const configParams = escolaFilter ? [escolaFilter, anoLetivo] : [anoLetivo]

    try {
      const configResult = await pool.query(configQuery, configParams)
      if (configResult.rows.length > 0) {
        mediaAprovacao = configResult.rows[0].media_aprovacao
      }
    } catch (err) {
      console.warn('[Recuperacao] Falha ao carregar config, usando padrão:', (err as Error).message)
    }

    // Query principal: alunos com nota_final abaixo da média
    const params: any[] = [periodoId, anoLetivo, mediaAprovacao]
    let where = `WHERE ne.periodo_id = $1 AND ne.ano_letivo = $2
                 AND ne.nota_final IS NOT NULL AND ne.nota_final < $3
                 AND (a.situacao = 'cursando' OR a.situacao IS NULL)`

    if (escolaFilter) {
      params.push(escolaFilter)
      where += ` AND ne.escola_id = $${params.length}`
    }
    if (poloFilter) {
      params.push(poloFilter)
      where += ` AND e.polo_id = $${params.length}`
    }
    if (turmaId) {
      params.push(turmaId)
      where += ` AND ne.turma_id = $${params.length}`
    }
    if (serie) {
      const numSerie = serie.match(/(\d+)/)?.[1] || serie.trim()
      params.push(numSerie)
      where += ` AND COALESCE(t.serie_numero, REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g')) = $${params.length}`
    }

    const query = `
      SELECT ne.aluno_id, a.nome as aluno_nome, a.codigo,
             t.serie, t.codigo as turma_codigo,
             e.nome as escola_nome, p.nome as polo_nome,
             d.nome as disciplina_nome, d.abreviacao as disciplina_abreviacao,
             ne.nota, ne.nota_recuperacao, ne.nota_final,
             ne.faltas,
             CASE
               WHEN ne.nota_recuperacao IS NOT NULL THEN 'em_recuperacao'
               ELSE 'pendente'
             END as status_recuperacao
      FROM notas_escolares ne
      INNER JOIN alunos a ON ne.aluno_id = a.id
      INNER JOIN turmas t ON ne.turma_id = t.id
      INNER JOIN escolas e ON ne.escola_id = e.id
      INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${where}
      ORDER BY a.nome, d.nome
    `

    const result = await pool.query(query, params)

    // Agrupar por aluno
    const alunosMap: Record<string, {
      aluno_id: string; aluno_nome: string; codigo: string | null
      serie: string; turma_codigo: string
      escola_nome: string; polo_nome: string | null
      disciplinas: {
        disciplina_nome: string; disciplina_abreviacao: string | null
        nota: number | null; nota_recuperacao: number | null; nota_final: number | null
        faltas: number; status_recuperacao: string
      }[]
    }> = {}

    for (const row of result.rows) {
      if (!alunosMap[row.aluno_id]) {
        alunosMap[row.aluno_id] = {
          aluno_id: row.aluno_id,
          aluno_nome: row.aluno_nome,
          codigo: row.codigo,
          serie: row.serie,
          turma_codigo: row.turma_codigo,
          escola_nome: row.escola_nome,
          polo_nome: row.polo_nome,
          disciplinas: [],
        }
      }
      alunosMap[row.aluno_id].disciplinas.push({
        disciplina_nome: row.disciplina_nome,
        disciplina_abreviacao: row.disciplina_abreviacao,
        nota: row.nota !== null ? parseFloat(row.nota) : null,
        nota_recuperacao: row.nota_recuperacao !== null ? parseFloat(row.nota_recuperacao) : null,
        nota_final: row.nota_final !== null ? parseFloat(row.nota_final) : null,
        faltas: row.faltas || 0,
        status_recuperacao: row.status_recuperacao,
      })
    }

    const alunos = Object.values(alunosMap)
      .sort((a, b) => b.disciplinas.length - a.disciplinas.length || a.aluno_nome.localeCompare(b.aluno_nome))

    // Resumo
    const totalAlunos = alunos.length
    const totalDisciplinas = result.rows.length
    const pendentes = result.rows.filter(r => r.status_recuperacao === 'pendente').length
    const emRecuperacao = result.rows.filter(r => r.status_recuperacao === 'em_recuperacao').length

    return NextResponse.json({
      alunos,
      resumo: {
        total_alunos: totalAlunos,
        total_disciplinas: totalDisciplinas,
        pendentes,
        em_recuperacao: emRecuperacao,
        media_aprovacao: mediaAprovacao,
      },
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar recuperação:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
