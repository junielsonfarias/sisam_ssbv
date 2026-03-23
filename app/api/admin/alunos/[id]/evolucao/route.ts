import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/alunos/[id]/evolucao
 * Retorna dados de evolução do aluno: SISAM ano a ano + notas escolares para comparação
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const alunoId = params.id

    // 1. Resultados SISAM por avaliação/ano (com nome da avaliação)
    const sisamResult = await pool.query(
      `SELECT rc.ano_letivo, rc.serie, rc.presenca,
              rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.nota_producao,
              rc.media_aluno,
              rc.total_acertos_lp, rc.total_acertos_mat, rc.total_acertos_ch, rc.total_acertos_cn,
              rc.nivel_lp, rc.nivel_mat, rc.nivel_prod, rc.nivel_aluno,
              rc.tipo_avaliacao,
              COALESCE(av.nome, 'Avaliação ' || rc.ano_letivo) as avaliacao_nome,
              COALESCE(av.tipo, 'unica') as avaliacao_tipo,
              COALESCE(av.ordem, 1) as avaliacao_ordem,
              cs.avalia_lp, cs.avalia_mat, cs.avalia_ch, cs.avalia_cn,
              cs.tem_producao_textual,
              cs.qtd_questoes_lp, cs.qtd_questoes_mat, cs.qtd_questoes_ch, cs.qtd_questoes_cn,
              cs.qtd_itens_producao
       FROM resultados_consolidados rc
       LEFT JOIN avaliacoes av ON rc.avaliacao_id = av.id
       LEFT JOIN configuracao_series cs ON cs.serie = REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')
       WHERE rc.aluno_id = $1
       ORDER BY rc.ano_letivo ASC, COALESCE(av.ordem, 1) ASC`,
      [alunoId]
    )

    // 2. Notas escolares — média final por disciplina e ano letivo
    const notasResult = await pool.query(
      `SELECT ne.ano_letivo,
              d.nome as disciplina, d.codigo as disciplina_codigo, d.abreviacao,
              ROUND(AVG(ne.nota_final)::numeric, 2) as media_final,
              SUM(ne.faltas) as total_faltas,
              COUNT(*) as total_periodos,
              COUNT(ne.nota_final) FILTER (WHERE ne.nota_final IS NOT NULL) as periodos_com_nota
       FROM notas_escolares ne
       JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
       WHERE ne.aluno_id = $1
       GROUP BY ne.ano_letivo, d.id, d.nome, d.codigo, d.abreviacao
       ORDER BY ne.ano_letivo ASC, d.ordem ASC`,
      [alunoId]
    )

    // 3. Frequência por ano
    const freqResult = await pool.query(
      `SELECT fb.ano_letivo,
              ROUND(AVG(fb.percentual_frequencia)::numeric, 1) as media_frequencia,
              SUM(fb.faltas) as total_faltas,
              SUM(fb.presencas) as total_presencas,
              SUM(fb.dias_letivos) as total_dias_letivos
       FROM frequencia_bimestral fb
       WHERE fb.aluno_id = $1
       GROUP BY fb.ano_letivo
       ORDER BY fb.ano_letivo ASC`,
      [alunoId]
    )

    // Organizar SISAM por ano
    const sisamPorAno: Record<string, any[]> = {}
    for (const r of sisamResult.rows) {
      const ano = r.ano_letivo
      if (!sisamPorAno[ano]) sisamPorAno[ano] = []
      sisamPorAno[ano].push({
        avaliacao: r.avaliacao_nome,
        tipo: r.avaliacao_tipo,
        ordem: parseInt(r.avaliacao_ordem),
        serie: r.serie,
        presenca: r.presenca,
        nota_lp: r.nota_lp != null ? parseFloat(r.nota_lp) : null,
        nota_mat: r.nota_mat != null ? parseFloat(r.nota_mat) : null,
        nota_ch: r.nota_ch != null ? parseFloat(r.nota_ch) : null,
        nota_cn: r.nota_cn != null ? parseFloat(r.nota_cn) : null,
        nota_producao: r.nota_producao != null ? parseFloat(r.nota_producao) : null,
        media: r.media_aluno != null ? parseFloat(r.media_aluno) : null,
        acertos_lp: r.total_acertos_lp != null ? parseInt(r.total_acertos_lp) : null,
        acertos_mat: r.total_acertos_mat != null ? parseInt(r.total_acertos_mat) : null,
        acertos_ch: r.total_acertos_ch != null ? parseInt(r.total_acertos_ch) : null,
        acertos_cn: r.total_acertos_cn != null ? parseInt(r.total_acertos_cn) : null,
        nivel_lp: r.nivel_lp, nivel_mat: r.nivel_mat,
        nivel_prod: r.nivel_prod, nivel_aluno: r.nivel_aluno,
        avalia_lp: r.avalia_lp, avalia_mat: r.avalia_mat,
        avalia_ch: r.avalia_ch, avalia_cn: r.avalia_cn,
        tem_producao_textual: r.tem_producao_textual,
        qtd_lp: r.qtd_questoes_lp, qtd_mat: r.qtd_questoes_mat,
        qtd_ch: r.qtd_questoes_ch, qtd_cn: r.qtd_questoes_cn,
        qtd_prod: r.qtd_itens_producao,
      })
    }

    // Organizar notas escolares por ano
    const escolaPorAno: Record<string, any[]> = {}
    for (const r of notasResult.rows) {
      const ano = r.ano_letivo
      if (!escolaPorAno[ano]) escolaPorAno[ano] = []
      escolaPorAno[ano].push({
        disciplina: r.disciplina,
        codigo: r.disciplina_codigo,
        abreviacao: r.abreviacao,
        media_final: r.media_final != null ? parseFloat(r.media_final) : null,
        total_faltas: parseInt(r.total_faltas) || 0,
        periodos_com_nota: parseInt(r.periodos_com_nota) || 0,
      })
    }

    // Frequência por ano
    const freqPorAno: Record<string, any> = {}
    for (const r of freqResult.rows) {
      freqPorAno[r.ano_letivo] = {
        media_frequencia: r.media_frequencia != null ? parseFloat(r.media_frequencia) : null,
        total_faltas: parseInt(r.total_faltas) || 0,
        total_presencas: parseInt(r.total_presencas) || 0,
        total_dias: parseInt(r.total_dias_letivos) || 0,
      }
    }

    // Montar anos unificados
    const todosAnos = [...new Set([
      ...Object.keys(sisamPorAno),
      ...Object.keys(escolaPorAno),
      ...Object.keys(freqPorAno),
    ])].sort()

    // Montar comparativo por disciplina ao longo dos anos
    // Para LP e MAT que existem tanto no SISAM quanto na escola
    const comparativoLP: { ano: string; sisam: number | null; escola: number | null; avaliacao?: string }[] = []
    const comparativoMAT: { ano: string; sisam: number | null; escola: number | null; avaliacao?: string }[] = []

    for (const ano of todosAnos) {
      const sisamAno = sisamPorAno[ano] || []
      const escolaAno = escolaPorAno[ano] || []

      // Pegar a última avaliação SISAM do ano (final > diagnostica)
      const sisamUltimo = sisamAno.length > 0 ? sisamAno[sisamAno.length - 1] : null

      const escolaLP = escolaAno.find((e: any) => e.codigo === 'LP' || e.abreviacao === 'LP' || e.disciplina?.toLowerCase().includes('portuguesa'))
      const escolaMAT = escolaAno.find((e: any) => e.codigo === 'MAT' || e.abreviacao === 'MAT' || e.disciplina?.toLowerCase().includes('matem'))

      comparativoLP.push({
        ano,
        sisam: sisamUltimo?.nota_lp ?? null,
        escola: escolaLP?.media_final ?? null,
        avaliacao: sisamUltimo?.avaliacao,
      })
      comparativoMAT.push({
        ano,
        sisam: sisamUltimo?.nota_mat ?? null,
        escola: escolaMAT?.media_final ?? null,
        avaliacao: sisamUltimo?.avaliacao,
      })
    }

    return NextResponse.json({
      anos: todosAnos,
      sisam: sisamPorAno,
      escola: escolaPorAno,
      frequencia: freqPorAno,
      comparativo: {
        lp: comparativoLP,
        mat: comparativoMAT,
      }
    })

  } catch (error: unknown) {
    console.error('Erro ao buscar evolução do aluno:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
