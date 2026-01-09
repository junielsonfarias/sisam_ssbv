import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// GET - Obter configuração de séries para sincronização offline
// Retorna as configurações de questões por série para cálculos offline corretos
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Buscar configurações de série
    const configResult = await pool.query(`
      SELECT
        id,
        serie,
        tipo_ensino,
        avalia_lp,
        avalia_mat,
        avalia_ch,
        avalia_cn,
        qtd_questoes_lp,
        qtd_questoes_mat,
        qtd_questoes_ch,
        qtd_questoes_cn,
        qtd_itens_producao
      FROM configuracao_series
      ORDER BY serie
    `)

    // Buscar disciplinas configuradas por série
    const disciplinasResult = await pool.query(`
      SELECT
        csd.serie_id,
        csd.disciplina,
        csd.sigla,
        csd.ordem,
        csd.questao_inicio,
        csd.questao_fim,
        csd.qtd_questoes,
        csd.valor_questao
      FROM configuracao_series_disciplinas csd
      WHERE csd.ativo = true
      ORDER BY csd.serie_id, csd.ordem
    `)

    // Organizar disciplinas por série
    const disciplinasPorSerie: Record<number, any[]> = {}
    for (const disc of disciplinasResult.rows) {
      if (!disciplinasPorSerie[disc.serie_id]) {
        disciplinasPorSerie[disc.serie_id] = []
      }
      disciplinasPorSerie[disc.serie_id].push(disc)
    }

    // Montar resposta com configurações completas
    const configuracoes = configResult.rows.map(config => ({
      ...config,
      disciplinas: disciplinasPorSerie[config.id] || []
    }))

    return NextResponse.json({
      dados: configuracoes,
      total: configuracoes.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Erro ao buscar configuração de séries para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
