import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/executivo?ano_letivo=2026
 * Dados agregados para o Painel Executivo do Secretário
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo') || String(new Date().getFullYear())

    const redisKey = cacheKey('executivo', anoLetivo)
    const data = await withRedisCache(redisKey, 60, async () => {
      const [
        totalAlunosResult,
        totalEscolasResult,
        totalTurmasResult,
        distribuicaoResult,
        escolasRankingResult,
        turmasSuperlotadasResult,
        tabelaEscolasResult,
      ] = await Promise.all([
        // Total alunos cursando
        pool.query(
          `SELECT COUNT(*) as total FROM alunos WHERE ano_letivo = $1 AND situacao = 'cursando'`,
          [anoLetivo]
        ),

        // Total escolas ativas
        pool.query(
          `SELECT COUNT(*) as total FROM escolas WHERE ativo = true`
        ),

        // Total turmas no ano
        pool.query(
          `SELECT COUNT(*) as total FROM turmas WHERE ano_letivo = $1`,
          [anoLetivo]
        ),

        // Distribuição por situação
        pool.query(
          `SELECT situacao, COUNT(*) as total
           FROM alunos WHERE ano_letivo = $1
           GROUP BY situacao
           ORDER BY total DESC`,
          [anoLetivo]
        ),

        // Ranking de escolas por média SISAM (resultados_consolidados)
        pool.query(
          `SELECT e.id, e.nome,
                  ROUND(AVG(rc.media_aluno)::numeric, 1) as media_sisam,
                  COUNT(DISTINCT rc.aluno_id) as total_avaliados
           FROM resultados_consolidados rc
           JOIN escolas e ON rc.escola_id = e.id
           WHERE rc.ano_letivo = $1 AND rc.media_aluno IS NOT NULL
           GROUP BY e.id, e.nome
           HAVING COUNT(DISTINCT rc.aluno_id) >= 5
           ORDER BY media_sisam DESC`,
          [anoLetivo]
        ),

        // Turmas superlotadas (>35 alunos)
        pool.query(
          `SELECT t.id, t.nome as turma_nome, t.serie, e.nome as escola_nome,
                  COUNT(a.id) as total_alunos
           FROM turmas t
           JOIN escolas e ON t.escola_id = e.id
           LEFT JOIN alunos a ON a.turma_id = t.id AND a.situacao = 'cursando'
           WHERE t.ano_letivo = $1
           GROUP BY t.id, t.nome, t.serie, e.nome
           HAVING COUNT(a.id) > 35
           ORDER BY COUNT(a.id) DESC`,
          [anoLetivo]
        ),

        // Tabela geral de escolas
        pool.query(
          `SELECT e.id, e.nome,
                  COUNT(DISTINCT a.id) FILTER (WHERE a.situacao = 'cursando') as total_alunos,
                  COUNT(DISTINCT t.id) as total_turmas,
                  ROUND(AVG(rc.media_aluno)::numeric, 1) as media_sisam,
                  ROUND(AVG(fb.percentual_frequencia)::numeric, 1) as frequencia_media
           FROM escolas e
           LEFT JOIN turmas t ON t.escola_id = e.id AND t.ano_letivo = $1
           LEFT JOIN alunos a ON a.escola_id = e.id AND a.ano_letivo = $1
           LEFT JOIN resultados_consolidados rc ON rc.escola_id = e.id AND rc.ano_letivo = $1
           LEFT JOIN frequencia_bimestral fb ON fb.aluno_id = a.id
             AND fb.periodo_id IN (SELECT id FROM periodos_letivos WHERE ano_letivo = $1)
           WHERE e.ativo = true
           GROUP BY e.id, e.nome
           ORDER BY e.nome`,
          [anoLetivo]
        ),
      ])

      const totalAlunos = parseInt(totalAlunosResult.rows[0]?.total || '0')
      const totalEscolas = parseInt(totalEscolasResult.rows[0]?.total || '0')
      const totalTurmas = parseInt(totalTurmasResult.rows[0]?.total || '0')

      // Calcular média SISAM geral
      const ranking = escolasRankingResult.rows
      const mediaSisamGeral = ranking.length > 0
        ? parseFloat((ranking.reduce((s: number, r: any) => s + parseFloat(r.media_sisam), 0) / ranking.length).toFixed(1))
        : null

      // Top 5 e Bottom 5
      const top5 = ranking.slice(0, 5)
      const bottom5 = ranking.length > 5 ? ranking.slice(-5).reverse() : []

      // Distribuição formatada
      const distribuicao = distribuicaoResult.rows.map((r: any) => ({
        situacao: r.situacao || 'sem_situacao',
        total: parseInt(r.total),
      }))

      // Escolas com frequência baixa (< 75%)
      const escolasFreqBaixa = tabelaEscolasResult.rows.filter(
        (e: any) => e.frequencia_media !== null && parseFloat(e.frequencia_media) < 75
      ).length

      return {
        ano_letivo: anoLetivo,
        kpis: {
          total_alunos: totalAlunos,
          total_escolas: totalEscolas,
          total_turmas: totalTurmas,
          media_sisam: mediaSisamGeral,
        },
        alertas: {
          escolas_freq_baixa: escolasFreqBaixa,
          turmas_superlotadas: turmasSuperlotadasResult.rows.length,
          turmas_superlotadas_lista: turmasSuperlotadasResult.rows,
        },
        ranking: { top5, bottom5 },
        distribuicao,
        tabela_escolas: tabelaEscolasResult.rows,
      }
    })

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('Erro no painel executivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
