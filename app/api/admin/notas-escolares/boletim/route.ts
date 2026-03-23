import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/notas-escolares/boletim?aluno_id=X&ano_letivo=Y
 *
 * Retorna boletim completo: todas disciplinas x todos períodos do ano
 * Calcula média anual conforme regra de avaliação da série:
 * - media_ponderada: usa pesos por período (ex: 2,3,2,3 / 10)
 * - media_aritmetica: soma / qtd
 * - maior_nota: maior nota_final
 * Recuperação: 1 por período, substitui se maior (já refletido em nota_final)
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
    const rawConfig = configResult.rows[0] || {}

    // Buscar regra de avaliação da série (com override da escola)
    const regraResult = await pool.query(
      `SELECT
          ra.formula_media, ra.pesos_periodos, ra.media_aprovacao as regra_media_aprovacao,
          ra.nota_maxima as regra_nota_maxima, ra.permite_recuperacao, ra.aprovacao_automatica,
          ra.arredondamento, ra.casas_decimais,
          ta.tipo_resultado,
          -- Override da escola
          era.media_aprovacao as escola_media_aprovacao,
          era.nota_maxima as escola_nota_maxima,
          COALESCE(ra_over.formula_media, ra.formula_media) as formula_efetiva,
          COALESCE(ra_over.pesos_periodos, ra.pesos_periodos) as pesos_efetivos,
          COALESCE(ra_over.aprovacao_automatica, ra.aprovacao_automatica) as aprovacao_efetiva
       FROM series_escolares se
       LEFT JOIN regras_avaliacao ra ON ra.id = se.regra_avaliacao_id
       LEFT JOIN tipos_avaliacao ta ON ta.id = se.tipo_avaliacao_id
       LEFT JOIN escola_regras_avaliacao era ON era.escola_id = $2 AND era.serie_escolar_id = se.id AND era.ativo = true
       LEFT JOIN regras_avaliacao ra_over ON ra_over.id = era.regra_avaliacao_id
       WHERE se.codigo = CASE
         WHEN $1 ILIKE '%creche%' THEN 'CRE'
         WHEN $1 ILIKE '%pré i%' OR $1 ILIKE '%pre i%' THEN 'PRE1'
         WHEN $1 ILIKE '%pré ii%' OR $1 ILIKE '%pre ii%' THEN 'PRE2'
         WHEN $1 ILIKE '%eja%1%' THEN 'EJA1'
         WHEN $1 ILIKE '%eja%2%' THEN 'EJA2'
         WHEN $1 ILIKE '%eja%3%' THEN 'EJA3'
         WHEN $1 ILIKE '%eja%4%' THEN 'EJA4'
         ELSE REGEXP_REPLACE($1, '[^0-9]', '', 'g')
       END
       LIMIT 1`,
      [aluno.serie || '', aluno.escola_id]
    )

    const regra = regraResult.rows[0] || null
    const formulaMedia = regra?.formula_efetiva || 'media_aritmetica'
    const pesosConfig: { periodo: number; peso: number }[] = regra?.pesos_efetivos || []
    const arredondamento = regra?.arredondamento || 'normal'
    const casasDecimais = regra?.casas_decimais ?? 1
    const aprovacaoAutomatica = regra?.aprovacao_efetiva || false
    const tipoResultado = regra?.tipo_resultado || 'numerico'

    // Config final: override escola > regra > config escola > fallback
    const config = {
      nota_maxima: parseFloat(regra?.escola_nota_maxima) || parseFloat(regra?.regra_nota_maxima) || parseFloat(rawConfig.nota_maxima) || 10,
      media_aprovacao: parseFloat(regra?.escola_media_aprovacao) || parseFloat(regra?.regra_media_aprovacao) || parseFloat(rawConfig.media_aprovacao) || 6,
    }

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
      `SELECT n.disciplina_id, n.periodo_id, n.nota, n.nota_recuperacao, n.nota_final,
              n.faltas, n.observacao, n.conceito, n.parecer_descritivo
       FROM notas_escolares n
       WHERE n.aluno_id = $1 AND n.ano_letivo = $2`,
      [alunoId, anoLetivo]
    )

    // Buscar frequência unificada
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

    // Organizar notas em mapa
    const notasMap: Record<string, Record<string, any>> = {}
    for (const nota of notasResult.rows) {
      if (!notasMap[nota.disciplina_id]) notasMap[nota.disciplina_id] = {}
      notasMap[nota.disciplina_id][nota.periodo_id] = nota
    }

    // Montar mapa de pesos por número do período
    const pesosMap: Record<number, number> = {}
    let somaPesos = 0
    for (const p of pesosConfig) {
      pesosMap[p.periodo] = p.peso
      somaPesos += p.peso
    }

    /**
     * Calcular média anual conforme fórmula da regra
     */
    function calcularMediaAnual(notasFinais: { numero: number; valor: number }[]): number | null {
      if (notasFinais.length === 0) return null

      let media: number

      if (formulaMedia === 'media_ponderada' && somaPesos > 0) {
        // Média ponderada: Σ(nota × peso) / Σ(pesos)
        let somaNotasPeso = 0
        let somaPesosUsados = 0
        for (const nf of notasFinais) {
          const peso = pesosMap[nf.numero] ?? 1
          somaNotasPeso += nf.valor * peso
          somaPesosUsados += peso
        }
        media = somaPesosUsados > 0 ? somaNotasPeso / somaPesosUsados : 0
      } else if (formulaMedia === 'maior_nota') {
        media = Math.max(...notasFinais.map(n => n.valor))
      } else if (formulaMedia === 'soma_dividida') {
        media = notasFinais.reduce((s, n) => s + n.valor, 0) / notasFinais.length
      } else {
        // media_aritmetica (default)
        media = notasFinais.reduce((s, n) => s + n.valor, 0) / notasFinais.length
      }

      // Arredondamento
      const fator = Math.pow(10, casasDecimais)
      if (arredondamento === 'cima') {
        media = Math.ceil(media * fator) / fator
      } else if (arredondamento === 'baixo') {
        media = Math.floor(media * fator) / fator
      } else if (arredondamento === 'nenhum') {
        // Sem arredondamento, mas limitar casas decimais
        media = Math.trunc(media * fator) / fator
      } else {
        // normal (Math.round)
        media = Math.round(media * fator) / fator
      }

      return media
    }

    // Montar boletim
    const boletim = disciplinasResult.rows.map(disc => {
      const periodos = periodosResult.rows.map(per => {
        const nota = notasMap[disc.id]?.[per.id]
        return {
          periodo_id: per.id,
          periodo_nome: per.nome,
          periodo_numero: per.numero,
          nota: nota?.nota !== undefined ? (nota.nota !== null ? parseFloat(nota.nota) : null) : null,
          nota_recuperacao: nota?.nota_recuperacao !== undefined ? (nota.nota_recuperacao !== null ? parseFloat(nota.nota_recuperacao) : null) : null,
          nota_final: nota?.nota_final !== undefined ? (nota.nota_final !== null ? parseFloat(nota.nota_final) : null) : null,
          faltas: nota?.faltas ?? 0,
          observacao: nota?.observacao ?? null,
          conceito: nota?.conceito ?? null,
          parecer_descritivo: nota?.parecer_descritivo ?? null,
        }
      })

      // Calcular média anual com a fórmula da regra
      const notasFinais = periodos
        .filter(p => p.nota_final !== null)
        .map(p => ({ numero: p.periodo_numero, valor: p.nota_final as number }))

      const mediaAnual = tipoResultado === 'parecer'
        ? null
        : calcularMediaAnual(notasFinais)

      const totalFaltas = periodos.reduce((s, p) => s + p.faltas, 0)

      // Situação na disciplina
      let situacao: string | null = null
      if (aprovacaoAutomatica) {
        // Parecer: aprovação automática
        const temAlgumDado = periodos.some(p => p.nota_final !== null || p.parecer_descritivo)
        if (temAlgumDado) situacao = 'aprovado'
      } else if (mediaAnual !== null) {
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

    // Resumo de recuperação
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
      config: {
        ...config,
        formula_media: formulaMedia,
        pesos_periodos: pesosConfig,
        arredondamento,
        casas_decimais: casasDecimais,
        aprovacao_automatica: aprovacaoAutomatica,
      },
      periodos: periodosResult.rows,
      boletim,
      frequencia: frequenciaPeriodos,
      recuperacao,
    })
  } catch (error: unknown) {
    console.error('Erro ao gerar boletim:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
