import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const escolaId = searchParams.get('escola_id')
  const poloId = searchParams.get('polo_id')
  const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

  // Filtro de acesso
  const escolaFiltro = usuario.tipo_usuario === 'escola' ? usuario.escola_id : escolaId

  let query = `
    SELECT t.id, t.codigo, t.serie, t.ano_letivo,
           t.capacidade_maxima,
           e.nome as escola_nome, e.id as escola_id,
           COUNT(DISTINCT a.id) FILTER (WHERE a.ativo = true AND (a.situacao IS NULL OR a.situacao = 'cursando')) as alunos_matriculados,
           COALESCE(t.capacidade_maxima, 35) - COUNT(DISTINCT a.id) FILTER (WHERE a.ativo = true AND (a.situacao IS NULL OR a.situacao = 'cursando')) as vagas_disponiveis,
           COALESCE(fe.fila_count, 0) as fila_espera
    FROM turmas t
    JOIN escolas e ON t.escola_id = e.id
    LEFT JOIN alunos a ON a.turma_id = t.id
    LEFT JOIN (
      SELECT turma_id, COUNT(*) as fila_count
      FROM fila_espera
      WHERE status = 'aguardando'
      GROUP BY turma_id
    ) fe ON fe.turma_id = t.id
    WHERE t.ativo = true AND t.ano_letivo = $1
  `

  const params: any[] = [anoLetivo]
  let paramIdx = 2

  if (escolaFiltro) {
    query += ` AND t.escola_id = $${paramIdx}`
    params.push(escolaFiltro)
    paramIdx++
  }

  // Filtro por polo: do parâmetro ou do usuário tipo polo
  const poloFiltro = usuario.tipo_usuario === 'polo' ? usuario.polo_id : poloId
  if (poloFiltro) {
    query += ` AND e.polo_id = $${paramIdx}`
    params.push(poloFiltro)
    paramIdx++
  }

  query += ` GROUP BY t.id, t.codigo, t.serie, t.ano_letivo, t.capacidade_maxima, e.nome, e.id, fe.fila_count
             ORDER BY e.nome, t.serie, t.codigo`

  const result = await pool.query(query, params)

  // Resumo
  const turmas = result.rows.map(r => ({
    ...r,
    alunos_matriculados: parseInt(r.alunos_matriculados),
    vagas_disponiveis: Math.max(0, parseInt(r.vagas_disponiveis)),
    fila_espera: parseInt(r.fila_espera),
    capacidade_maxima: Math.max(1, parseInt(r.capacidade_maxima || '35')),
    percentual_ocupacao: Math.round((parseInt(r.alunos_matriculados) / Math.max(1, parseInt(r.capacidade_maxima || '35'))) * 100)
  }))

  const resumo = {
    total_turmas: turmas.length,
    total_vagas: turmas.reduce((s, t) => s + t.capacidade_maxima, 0),
    total_matriculados: turmas.reduce((s, t) => s + t.alunos_matriculados, 0),
    total_disponiveis: turmas.reduce((s, t) => s + t.vagas_disponiveis, 0),
    total_fila: turmas.reduce((s, t) => s + t.fila_espera, 0),
    turmas_lotadas: turmas.filter(t => t.vagas_disponiveis <= 0).length,
    ocupacao_media: turmas.length > 0
      ? Math.round(turmas.reduce((s, t) => s + t.percentual_ocupacao, 0) / turmas.length)
      : 0
  }

  // Distribuição por série
  const porSerie: Record<string, { serie: string; capacidade: number; matriculados: number; vagas: number; fila: number }> = {}
  for (const t of turmas) {
    const s = t.serie || 'Sem série'
    if (!porSerie[s]) porSerie[s] = { serie: s, capacidade: 0, matriculados: 0, vagas: 0, fila: 0 }
    porSerie[s].capacidade += t.capacidade_maxima
    porSerie[s].matriculados += t.alunos_matriculados
    porSerie[s].vagas += t.vagas_disponiveis
    porSerie[s].fila += t.fila_espera
  }

  return NextResponse.json({
    turmas,
    resumo,
    por_serie: Object.values(porSerie).sort((a, b) => a.serie.localeCompare(b.serie, undefined, { numeric: true }))
  })
})

// Atualizar capacidade (individual ou em lote)
export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const body = await request.json()
    const { turma_id, capacidade_maxima, lote } = body

    // Edição em lote
    if (Array.isArray(lote) && lote.length > 0) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        let atualizadas = 0
        for (const item of lote) {
          if (!item.turma_id || item.capacidade_maxima === undefined) continue
          if (item.capacidade_maxima < 1 || item.capacidade_maxima > 100) continue
          await client.query(
            `UPDATE turmas SET capacidade_maxima = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2`,
            [item.capacidade_maxima, item.turma_id]
          )
          atualizadas++
        }
        await client.query('COMMIT')
        return NextResponse.json({ mensagem: `${atualizadas} turma(s) atualizada(s)` })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }

    // Edição individual
    if (!turma_id || capacidade_maxima === undefined) {
      return NextResponse.json({ mensagem: 'turma_id e capacidade_maxima são obrigatórios' }, { status: 400 })
    }

    if (capacidade_maxima < 1 || capacidade_maxima > 100) {
      return NextResponse.json({ mensagem: 'Capacidade deve ser entre 1 e 100' }, { status: 400 })
    }

    await pool.query(
      `UPDATE turmas SET capacidade_maxima = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2`,
      [capacidade_maxima, turma_id]
    )

    return NextResponse.json({ mensagem: 'Capacidade atualizada' })
  } catch (error: unknown) {
    console.error('Erro ao atualizar capacidade:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
