import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard-gestor
 * Dashboard consolidado do Gestor Escolar
 * Params: escola_id?, ano_letivo?
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let escolaId = searchParams.get('escola_id')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    // Escola só vê seus dados
    if (usuario.tipo_usuario === 'escola') {
      escolaId = usuario.escola_id || null
    }

    // ============================================
    // 1. Métricas de Alunos
    // ============================================
    const alunosParams: any[] = [anoLetivo]
    let alunosWhere = `WHERE a.ano_letivo = $1`
    if (escolaId) {
      alunosParams.push(escolaId)
      alunosWhere += ` AND a.escola_id = $${alunosParams.length}`
    }

    const alunosQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE a.situacao = 'cursando' OR a.situacao IS NULL) as cursando,
        COUNT(*) FILTER (WHERE a.situacao = 'transferido') as transferidos,
        COUNT(*) FILTER (WHERE a.situacao = 'abandono') as abandono,
        COUNT(*) FILTER (WHERE a.situacao = 'aprovado') as aprovados,
        COUNT(*) FILTER (WHERE a.situacao = 'reprovado') as reprovados,
        COUNT(*) FILTER (WHERE a.pcd = true) as pcd
      FROM alunos a
      ${alunosWhere}
    `

    // ============================================
    // 2. Métricas de Turmas
    // ============================================
    const turmasParams: any[] = [anoLetivo]
    let turmasWhere = `WHERE t.ano_letivo = $1`
    if (escolaId) {
      turmasParams.push(escolaId)
      turmasWhere += ` AND t.escola_id = $${turmasParams.length}`
    }

    const turmasQuery = `
      SELECT
        COUNT(DISTINCT t.id) as total_turmas,
        COUNT(DISTINCT t.serie) as total_series,
        json_agg(
          json_build_object(
            'serie', t.serie,
            'total', sub.total_alunos
          ) ORDER BY t.serie
        ) as por_serie
      FROM turmas t
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as total_alunos
        FROM alunos a
        WHERE a.turma_id = t.id AND (a.situacao = 'cursando' OR a.situacao IS NULL)
      ) sub ON true
      ${turmasWhere}
    `

    // ============================================
    // 3. Métricas de Notas (último período com dados)
    // ============================================
    const notasParams: any[] = [anoLetivo]
    let notasWhere = `WHERE ne.ano_letivo = $1`
    if (escolaId) {
      notasParams.push(escolaId)
      notasWhere += ` AND ne.escola_id = $${notasParams.length}`
    }

    const notasQuery = `
      SELECT
        COUNT(DISTINCT ne.aluno_id) as total_alunos_com_nota,
        COUNT(*) as total_lancamentos,
        ROUND(AVG(ne.nota_final)::numeric, 2) as media_geral,
        COUNT(*) FILTER (WHERE ne.nota_final IS NOT NULL AND ne.nota_final < 6) as abaixo_media,
        COUNT(*) FILTER (WHERE ne.nota_final IS NOT NULL AND ne.nota_final >= 6) as acima_media,
        COUNT(*) FILTER (WHERE ne.nota_recuperacao IS NOT NULL) as em_recuperacao
      FROM notas_escolares ne
      INNER JOIN alunos a ON ne.aluno_id = a.id
      ${notasWhere}
      AND (a.situacao = 'cursando' OR a.situacao IS NULL)
      AND ne.nota_final IS NOT NULL
    `

    // Média por disciplina
    const mediaDiscParams: any[] = [anoLetivo]
    let mediaDiscWhere = `WHERE ne.ano_letivo = $1`
    if (escolaId) {
      mediaDiscParams.push(escolaId)
      mediaDiscWhere += ` AND ne.escola_id = $${mediaDiscParams.length}`
    }

    const mediaDiscQuery = `
      SELECT d.nome as disciplina, d.abreviacao,
             ROUND(AVG(ne.nota_final)::numeric, 2) as media,
             COUNT(*) as total,
             COUNT(*) FILTER (WHERE ne.nota_final < 6) as abaixo
      FROM notas_escolares ne
      INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
      INNER JOIN alunos a ON ne.aluno_id = a.id
      ${mediaDiscWhere}
      AND ne.nota_final IS NOT NULL
      AND (a.situacao = 'cursando' OR a.situacao IS NULL)
      GROUP BY d.id, d.nome, d.abreviacao
      ORDER BY d.nome
    `

    // ============================================
    // 4. Métricas de Frequência
    // ============================================
    const freqParams: any[] = [anoLetivo]
    let freqWhere = `WHERE fb.ano_letivo = $1`
    if (escolaId) {
      freqParams.push(escolaId)
      freqWhere += ` AND fb.escola_id = $${freqParams.length}`
    }

    const freqQuery = `
      SELECT
        COUNT(DISTINCT fb.aluno_id) as total_com_frequencia,
        ROUND(AVG(fb.percentual_frequencia)::numeric, 1) as media_frequencia,
        COUNT(*) FILTER (WHERE fb.percentual_frequencia < 75) as abaixo_75,
        COUNT(*) FILTER (WHERE fb.percentual_frequencia >= 75 AND fb.percentual_frequencia < 90) as entre_75_90,
        COUNT(*) FILTER (WHERE fb.percentual_frequencia >= 90) as acima_90,
        SUM(fb.faltas) as total_faltas
      FROM frequencia_bimestral fb
      INNER JOIN alunos a ON fb.aluno_id = a.id
      ${freqWhere}
      AND (a.situacao = 'cursando' OR a.situacao IS NULL)
    `

    // ============================================
    // 5. Transferências recentes
    // ============================================
    const transfParams: any[] = [anoLetivo]
    let transfWhere = `WHERE a.ano_letivo = $1 AND hs.tipo_movimentacao IS NOT NULL`
    if (escolaId) {
      transfParams.push(escolaId)
      transfWhere += ` AND a.escola_id = $${transfParams.length}`
    }

    const transfQuery = `
      SELECT
        COUNT(*) FILTER (WHERE hs.tipo_movimentacao = 'saida') as saidas,
        COUNT(*) FILTER (WHERE hs.tipo_movimentacao = 'entrada') as entradas,
        COUNT(*) FILTER (WHERE hs.tipo_transferencia = 'dentro_municipio') as dentro_municipio,
        COUNT(*) FILTER (WHERE hs.tipo_transferencia = 'fora_municipio') as fora_municipio
      FROM historico_situacao hs
      INNER JOIN alunos a ON hs.aluno_id = a.id
      ${transfWhere}
    `

    // ============================================
    // 6. Conselhos de Classe
    // ============================================
    const conselhoParams: any[] = [anoLetivo]
    let conselhoWhere = `WHERE cc.ano_letivo = $1`
    if (escolaId) {
      conselhoParams.push(escolaId)
      conselhoWhere += ` AND cc.escola_id = $${conselhoParams.length}`
    }

    const conselhoQuery = `
      SELECT
        COUNT(DISTINCT cc.id) as total_conselhos,
        COUNT(DISTINCT cc.turma_id) as turmas_com_conselho,
        COUNT(cca.id) as total_pareceres,
        COUNT(cca.id) FILTER (WHERE cca.parecer = 'aprovado') as aprovados,
        COUNT(cca.id) FILTER (WHERE cca.parecer = 'reprovado') as reprovados,
        COUNT(cca.id) FILTER (WHERE cca.parecer = 'recuperacao') as recuperacao,
        COUNT(cca.id) FILTER (WHERE cca.parecer = 'progressao_parcial') as progressao
      FROM conselho_classe cc
      LEFT JOIN conselho_classe_alunos cca ON cca.conselho_id = cc.id
      ${conselhoWhere}
    `

    // ============================================
    // 7. Alunos por série (distribuição)
    // ============================================
    const distParams: any[] = [anoLetivo]
    let distWhere = `WHERE a.ano_letivo = $1 AND (a.situacao = 'cursando' OR a.situacao IS NULL)`
    if (escolaId) {
      distParams.push(escolaId)
      distWhere += ` AND a.escola_id = $${distParams.length}`
    }

    const distQuery = `
      SELECT t.serie, COUNT(*) as total
      FROM alunos a
      INNER JOIN turmas t ON a.turma_id = t.id
      ${distWhere}
      GROUP BY t.serie
      ORDER BY t.serie
    `

    // Executar todas as queries em paralelo
    const [
      alunosResult,
      turmasResult,
      notasResult,
      mediaDiscResult,
      freqResult,
      transfResult,
      conselhoResult,
      distResult,
    ] = await Promise.all([
      pool.query(alunosQuery, alunosParams),
      pool.query(turmasQuery, turmasParams),
      pool.query(notasQuery, notasParams),
      pool.query(mediaDiscQuery, mediaDiscParams),
      pool.query(freqQuery, freqParams),
      pool.query(transfQuery, transfParams),
      pool.query(conselhoQuery, conselhoParams),
      pool.query(distQuery, distParams),
    ])

    const alunosData = alunosResult.rows[0] || {}
    const turmasData = turmasResult.rows[0] || {}
    const notasData = notasResult.rows[0] || {}
    const freqData = freqResult.rows[0] || {}
    const transfData = transfResult.rows[0] || {}
    const conselhoData = conselhoResult.rows[0] || {}

    return NextResponse.json({
      alunos: {
        total: parseInt(alunosData.total) || 0,
        cursando: parseInt(alunosData.cursando) || 0,
        transferidos: parseInt(alunosData.transferidos) || 0,
        abandono: parseInt(alunosData.abandono) || 0,
        aprovados: parseInt(alunosData.aprovados) || 0,
        reprovados: parseInt(alunosData.reprovados) || 0,
        pcd: parseInt(alunosData.pcd) || 0,
      },
      turmas: {
        total: parseInt(turmasData.total_turmas) || 0,
        series: parseInt(turmasData.total_series) || 0,
      },
      notas: {
        total_alunos_com_nota: parseInt(notasData.total_alunos_com_nota) || 0,
        total_lancamentos: parseInt(notasData.total_lancamentos) || 0,
        media_geral: parseFloat(notasData.media_geral) || 0,
        abaixo_media: parseInt(notasData.abaixo_media) || 0,
        acima_media: parseInt(notasData.acima_media) || 0,
        em_recuperacao: parseInt(notasData.em_recuperacao) || 0,
        por_disciplina: mediaDiscResult.rows.map(r => ({
          disciplina: r.disciplina,
          abreviacao: r.abreviacao,
          media: parseFloat(r.media) || 0,
          total: parseInt(r.total) || 0,
          abaixo: parseInt(r.abaixo) || 0,
        })),
      },
      frequencia: {
        total_com_frequencia: parseInt(freqData.total_com_frequencia) || 0,
        media_frequencia: parseFloat(freqData.media_frequencia) || 0,
        abaixo_75: parseInt(freqData.abaixo_75) || 0,
        entre_75_90: parseInt(freqData.entre_75_90) || 0,
        acima_90: parseInt(freqData.acima_90) || 0,
        total_faltas: parseInt(freqData.total_faltas) || 0,
      },
      transferencias: {
        saidas: parseInt(transfData.saidas) || 0,
        entradas: parseInt(transfData.entradas) || 0,
        dentro_municipio: parseInt(transfData.dentro_municipio) || 0,
        fora_municipio: parseInt(transfData.fora_municipio) || 0,
      },
      conselho: {
        total_conselhos: parseInt(conselhoData.total_conselhos) || 0,
        turmas_com_conselho: parseInt(conselhoData.turmas_com_conselho) || 0,
        total_pareceres: parseInt(conselhoData.total_pareceres) || 0,
        aprovados: parseInt(conselhoData.aprovados) || 0,
        reprovados: parseInt(conselhoData.reprovados) || 0,
        recuperacao: parseInt(conselhoData.recuperacao) || 0,
        progressao: parseInt(conselhoData.progressao) || 0,
      },
      distribuicao_serie: distResult.rows.map(r => ({
        serie: r.serie,
        total: parseInt(r.total) || 0,
      })),
    })
  } catch (error: any) {
    console.error('Erro no dashboard gestor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
