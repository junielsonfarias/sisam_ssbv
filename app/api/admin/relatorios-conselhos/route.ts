import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico'], async (request: NextRequest, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const conselho = searchParams.get('conselho') || 'CACSFUNDEB'
    const ano_letivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!['CACSFUNDEB', 'CAE', 'CME'].includes(conselho)) {
      return NextResponse.json({ mensagem: 'Conselho inválido. Use: CACSFUNDEB, CAE ou CME' }, { status: 400 })
    }

    const redisKey = cacheKey('conselhos', conselho, ano_letivo)
    const data = await withRedisCache(redisKey, 300, async () => {
    // Dados base: escolas com contagens
    const escolasBase = await pool.query(
      `SELECT
        e.id, e.nome as escola, e.polo_id,
        COUNT(DISTINCT a.id) FILTER (WHERE a.ativo = true AND a.ano_letivo = $1) as total_alunos,
        COUNT(DISTINCT t.id) FILTER (WHERE t.ano_letivo = $1) as total_turmas
      FROM escolas e
      LEFT JOIN alunos a ON a.escola_id = e.id
      LEFT JOIN turmas t ON t.escola_id = e.id
      WHERE e.ativo = true
      GROUP BY e.id, e.nome, e.polo_id
      ORDER BY e.nome`,
      [ano_letivo]
    )

    let dadosEspecificos: any = {}

    if (conselho === 'CACSFUNDEB') {
      // Total professores por escola
      const professores = await pool.query(
        `SELECT
          e.id as escola_id,
          COUNT(DISTINCT pt.professor_id) as total_professores
        FROM escolas e
        LEFT JOIN turmas t ON t.escola_id = e.id AND t.ano_letivo = $1
        LEFT JOIN professor_turma pt ON pt.turma_id = t.id
        WHERE e.ativo = true
        GROUP BY e.id`,
        [ano_letivo]
      )
      const profMap: Record<string, number> = {}
      for (const r of professores.rows) profMap[r.escola_id] = parseInt(r.total_professores)

      // Frequência média por escola
      const frequencia = await pool.query(
        `SELECT
          a.escola_id,
          ROUND(AVG(fb.percentual_frequencia)::numeric, 2) as freq_media
        FROM frequencia_bimestral fb
        JOIN alunos a ON a.id = fb.aluno_id
        WHERE a.ano_letivo = $1 AND a.ativo = true
        GROUP BY a.escola_id`,
        [ano_letivo]
      )
      const freqMap: Record<string, number> = {}
      for (const r of frequencia.rows) freqMap[r.escola_id] = parseFloat(r.freq_media || '0')

      dadosEspecificos = {
        escolas: escolasBase.rows.map(e => ({
          ...e,
          total_professores: profMap[e.id] || 0,
          frequencia_media: freqMap[e.id] || 0,
        })),
        resumo: {
          total_alunos: escolasBase.rows.reduce((s, e) => s + parseInt(e.total_alunos), 0),
          total_turmas: escolasBase.rows.reduce((s, e) => s + parseInt(e.total_turmas), 0),
          total_professores: Object.values(profMap).reduce((s, v) => s + v, 0),
          frequencia_geral: frequencia.rows.length > 0
            ? parseFloat((frequencia.rows.reduce((s: number, r: any) => s + parseFloat(r.freq_media || 0), 0) / frequencia.rows.length).toFixed(2))
            : 0,
        }
      }
    }

    if (conselho === 'CAE') {
      // Turmas por turno por escola
      const turnos = await pool.query(
        `SELECT
          t.escola_id,
          t.turno,
          COUNT(*) as total,
          SUM(t.capacidade_maxima) as capacidade_total
        FROM turmas t
        WHERE t.ano_letivo = $1
        GROUP BY t.escola_id, t.turno
        ORDER BY t.escola_id, t.turno`,
        [ano_letivo]
      )
      const turnosMap: Record<string, any[]> = {}
      for (const r of turnos.rows) {
        if (!turnosMap[r.escola_id]) turnosMap[r.escola_id] = []
        turnosMap[r.escola_id].push({ turno: r.turno, total: parseInt(r.total), capacidade: parseInt(r.capacidade_total || 0) })
      }

      dadosEspecificos = {
        escolas: escolasBase.rows.map(e => ({
          ...e,
          turnos: turnosMap[e.id] || [],
        })),
        resumo: {
          total_alunos: escolasBase.rows.reduce((s, e) => s + parseInt(e.total_alunos), 0),
          total_turmas: escolasBase.rows.reduce((s, e) => s + parseInt(e.total_turmas), 0),
          total_escolas: escolasBase.rows.filter(e => parseInt(e.total_alunos) > 0).length,
        }
      }
    }

    if (conselho === 'CME') {
      // Aprovação/reprovação por escola
      const situacoes = await pool.query(
        `SELECT
          a.escola_id,
          a.situacao,
          COUNT(*) as total
        FROM alunos a
        WHERE a.ano_letivo = $1 AND a.ativo = true
        GROUP BY a.escola_id, a.situacao`,
        [ano_letivo]
      )
      const sitMap: Record<string, Record<string, number>> = {}
      for (const r of situacoes.rows) {
        if (!sitMap[r.escola_id]) sitMap[r.escola_id] = {}
        sitMap[r.escola_id][r.situacao || 'cursando'] = parseInt(r.total)
      }

      // Frequência
      const frequencia = await pool.query(
        `SELECT
          a.escola_id,
          ROUND(AVG(fb.percentual_frequencia)::numeric, 2) as freq_media
        FROM frequencia_bimestral fb
        JOIN alunos a ON a.id = fb.aluno_id
        WHERE a.ano_letivo = $1 AND a.ativo = true
        GROUP BY a.escola_id`,
        [ano_letivo]
      )
      const freqMap: Record<string, number> = {}
      for (const r of frequencia.rows) freqMap[r.escola_id] = parseFloat(r.freq_media || '0')

      // Resultados SISAM resumidos
      const sisam = await pool.query(
        `SELECT
          rc.escola_id,
          ROUND(AVG(rc.media_aluno::decimal), 2) as media_sisam,
          COUNT(DISTINCT rc.aluno_id) as alunos_avaliados
        FROM resultados_consolidados rc
        WHERE rc.ano_letivo = $1 AND rc.presenca IN ('P','p')
        GROUP BY rc.escola_id`,
        [ano_letivo]
      )
      const sisamMap: Record<string, { media: number; avaliados: number }> = {}
      for (const r of sisam.rows) sisamMap[r.escola_id] = { media: parseFloat(r.media_sisam || '0'), avaliados: parseInt(r.alunos_avaliados) }

      dadosEspecificos = {
        escolas: escolasBase.rows.map(e => ({
          ...e,
          situacoes: sitMap[e.id] || {},
          frequencia_media: freqMap[e.id] || 0,
          media_sisam: sisamMap[e.id]?.media || 0,
          alunos_avaliados_sisam: sisamMap[e.id]?.avaliados || 0,
        })),
        resumo: {
          total_alunos: escolasBase.rows.reduce((s, e) => s + parseInt(e.total_alunos), 0),
          total_escolas: escolasBase.rows.filter(e => parseInt(e.total_alunos) > 0).length,
          total_aprovados: Object.values(sitMap).reduce((s, m) => s + (m.aprovado || 0), 0),
          total_reprovados: Object.values(sitMap).reduce((s, m) => s + (m.reprovado || 0), 0),
        }
      }
    }

    return {
      conselho,
      ano_letivo,
      ...dadosEspecificos,
    }
    }) // end withRedisCache

    return NextResponse.json(data)
  } catch (error) {
    console.error('[relatorios-conselhos] Erro:', (error as Error).message)
    return NextResponse.json({ mensagem: 'Erro ao gerar relatório do conselho' }, { status: 500 })
  }
})
