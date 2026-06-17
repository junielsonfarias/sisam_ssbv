import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { calcularMediaAnual } from '@/lib/services/media-anual'

export const dynamic = 'force-dynamic'

// ============================================
// Schema de validação para POST
// ============================================

const resultadoSchema = z.object({
  aluno_id: z.string().uuid(),
  situacao: z.enum(['aprovado', 'reprovado', 'progressao_parcial']),
})

const aplicarResultadosSchema = z.object({
  escola_id: z.string().uuid(),
  ano_letivo: z.string().min(4).max(10),
  resultados: z.array(resultadoSchema).min(1),
  // Override consciente do gate de dias letivos (exige justificativa)
  forcar: z.boolean().optional().default(false),
  justificativa: z.string().max(500).optional(),
})

// ============================================
// Helpers
// ============================================

/**
 * Mapeia o campo serie do aluno para o codigo da series_escolares.
 * Ex: "5º Ano" -> "5", "Creche" -> "CRE", "EJA 2" -> "EJA2"
 */
function serieParaCodigo(serie: string): string {
  if (!serie) return ''
  const lower = serie.toLowerCase()
  if (lower.includes('creche')) return 'CRE'
  if (lower.includes('pré') || lower.includes('pre')) {
    if (lower.includes('ii') || lower.includes('2')) return 'PRE2'
    return 'PRE1'
  }
  if (lower.includes('eja')) {
    const num = serie.replace(/[^0-9]/g, '')
    return `EJA${num}`
  }
  const num = serie.replace(/[^0-9]/g, '')
  return num || serie
}

/**
 * Calcula os dias letivos efetivos da escola no ano (via função SQL
 * contar_dias_letivos, que considera feriados/recessos/reposições do
 * calendário) e compara com o mínimo exigido (anos_letivos.dias_letivos_total,
 * default 200 — LDB art. 24, I). Retorna `suficientes: null` quando o ano não
 * tem datas configuradas (não dá para validar).
 */
async function calcularDiasLetivos(
  escolaId: string,
  anoLetivo: string
): Promise<{ efetivos: number | null; exigidos: number; suficientes: boolean | null }> {
  const anoResult = await pool.query(
    `SELECT id, data_inicio, data_fim, dias_letivos_total
       FROM anos_letivos WHERE ano = $1 LIMIT 1`,
    [anoLetivo]
  )
  const ano = anoResult.rows[0]
  const exigidos = ano?.dias_letivos_total ?? 200
  if (!ano || !ano.data_inicio || !ano.data_fim) {
    return { efetivos: null, exigidos, suficientes: null }
  }
  const diasResult = await pool.query(
    `SELECT contar_dias_letivos($1::uuid, $2::uuid, $3::date, $4::date) AS dias`,
    [ano.id, escolaId, ano.data_inicio, ano.data_fim]
  )
  const efetivos = parseInt(diasResult.rows[0]?.dias) || 0
  return { efetivos, exigidos, suficientes: efetivos >= exigidos }
}

/**
 * Busca o parecer do Conselho de Classe de cada aluno no período FINAL
 * (maior `numero`) — o conselho de fechamento é soberano sobre o cálculo.
 * Ignora 'sem_parecer'. Retorna Map<aluno_id, parecer>.
 */
async function buscarPareceresConselho(
  escolaId: string,
  anoLetivo: string,
  alunoIds: string[]
): Promise<Map<string, string>> {
  if (alunoIds.length === 0) return new Map()
  const r = await pool.query(
    `SELECT DISTINCT ON (cca.aluno_id) cca.aluno_id, cca.parecer
       FROM conselho_classe_alunos cca
       JOIN conselho_classe cc ON cc.id = cca.conselho_id
       JOIN periodos_letivos p ON p.id = cc.periodo_id
      WHERE cc.escola_id = $1 AND cc.ano_letivo = $2
        AND cca.aluno_id = ANY($3)
        AND cca.parecer <> 'sem_parecer'
      ORDER BY cca.aluno_id, p.numero DESC`,
    [escolaId, anoLetivo, alunoIds]
  )
  const mapa = new Map<string, string>()
  for (const row of r.rows) mapa.set(row.aluno_id, row.parecer)
  return mapa
}

/** Situações finais aplicáveis em `alunos.situacao` pelo fechamento. */
type SituacaoFinal = 'aprovado' | 'reprovado' | 'progressao_parcial'

/**
 * Converte o parecer do conselho para a situação aplicável em `alunos.situacao`.
 * O Conselho de Classe é soberano (Fase 1.2); a progressão parcial é uma
 * situação própria desde a Fase 2.2 (aprovado com dependência).
 *  - aprovado            → 'aprovado'
 *  - progressao_parcial  → 'progressao_parcial' (avança com dependência)
 *  - reprovado, recuperacao → 'reprovado'
 */
function parecerParaSituacao(parecer: string): SituacaoFinal | null {
  if (parecer === 'aprovado') return 'aprovado'
  if (parecer === 'progressao_parcial') return 'progressao_parcial'
  if (parecer === 'reprovado' || parecer === 'recuperacao') return 'reprovado'
  return null
}

// ============================================
// GET - Preview dos resultados de fechamento
// ============================================

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const anoLetivo = searchParams.get('ano_letivo')

    if (!escolaId || !anoLetivo) {
      return NextResponse.json({ mensagem: 'Parâmetros escola_id e ano_letivo são obrigatórios' }, { status: 400 })
    }

    // 1. Buscar alunos cursando da escola/ano
    const alunosResult = await pool.query(
      `SELECT a.id, a.nome, a.serie, a.turma_id,
              t.codigo as turma_codigo, t.nome as turma_nome
       FROM alunos a
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.escola_id = $1
         AND a.ano_letivo = $2
         AND a.situacao = 'cursando'
         AND a.ativo = true
       ORDER BY a.serie, t.codigo, a.nome`,
      [escolaId, anoLetivo]
    )

    if (alunosResult.rows.length === 0) {
      return NextResponse.json({
        resultados: [],
        resumo: { total: 0, aprovados: 0, reprovados: 0, em_recuperacao: 0, parciais: 0, dependencias: 0 },
      })
    }

    // 2. Buscar todas as regras de avaliação vinculadas a series_escolares
    const regrasResult = await pool.query(
      `SELECT se.codigo as serie_codigo, se.max_dependencias,
              ra.id as regra_id, ra.formula_media, ra.pesos_periodos, ra.media_aprovacao,
              ra.nota_maxima, ra.qtd_periodos, ra.aprovacao_automatica, ra.casas_decimais, ra.arredondamento,
              ta.tipo_resultado
       FROM series_escolares se
       JOIN regras_avaliacao ra ON ra.id = se.regra_avaliacao_id
       JOIN tipos_avaliacao ta ON ta.id = se.tipo_avaliacao_id
       WHERE se.ativo = true AND ra.ativo = true`
    )

    // Mapa serie_codigo -> regra
    const regrasMap = new Map<string, any>()
    for (const r of regrasResult.rows) {
      regrasMap.set(r.serie_codigo, r)
    }

    // 3. Buscar todas as notas da escola/ano de uma vez
    const alunoIds = alunosResult.rows.map((a: any) => a.id)
    const notasResult = await pool.query(
      `SELECT n.aluno_id, n.disciplina_id, n.nota_final,
              d.nome as disciplina_nome, d.codigo as disciplina_codigo,
              p.numero as periodo_numero
       FROM notas_escolares n
       JOIN disciplinas_escolares d ON n.disciplina_id = d.id
       JOIN periodos_letivos p ON n.periodo_id = p.id
       WHERE n.escola_id = $1
         AND n.ano_letivo = $2
         AND n.aluno_id = ANY($3)
       ORDER BY n.aluno_id, d.ordem, p.numero`,
      [escolaId, anoLetivo, alunoIds]
    )

    // Agrupar notas por aluno -> disciplina -> periodo
    // Map<aluno_id, Map<disciplina_id, { nome, codigo, notas: Map<periodo, nota_final> }>>
    const notasAgrupadas = new Map<string, Map<string, { nome: string; codigo: string; notas: Map<number, number> }>>()
    for (const n of notasResult.rows) {
      if (!notasAgrupadas.has(n.aluno_id)) {
        notasAgrupadas.set(n.aluno_id, new Map())
      }
      const disciplinas = notasAgrupadas.get(n.aluno_id)!
      if (!disciplinas.has(n.disciplina_id)) {
        disciplinas.set(n.disciplina_id, {
          nome: n.disciplina_nome,
          codigo: n.disciplina_codigo,
          notas: new Map(),
        })
      }
      if (n.nota_final !== null && n.nota_final !== undefined) {
        disciplinas.get(n.disciplina_id)!.notas.set(n.periodo_numero, parseFloat(n.nota_final))
      }
    }

    // Política de frequência da escola (% mínimo + abono de justificadas).
    // Sem config: defaults LDB (75%, não abona).
    const configFreqResult = await pool.query(
      `SELECT percentual_frequencia_minimo, abona_faltas_justificadas
         FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2 LIMIT 1`,
      [escolaId, anoLetivo]
    )
    const percentualMinimo: number = configFreqResult.rows[0]?.percentual_frequencia_minimo ?? 75
    const abonaJustificadas: boolean = configFreqResult.rows[0]?.abona_faltas_justificadas === true

    // 4. Buscar frequência bimestral de todos os alunos
    const freqResult = await pool.query(
      `SELECT fb.aluno_id,
              SUM(fb.dias_letivos) as total_dias,
              SUM(fb.presencas) as total_presencas,
              SUM(fb.faltas) as total_faltas,
              SUM(fb.faltas_justificadas) as total_justificadas
       FROM frequencia_bimestral fb
       WHERE fb.escola_id = $1
         AND fb.ano_letivo = $2
         AND fb.aluno_id = ANY($3)
       GROUP BY fb.aluno_id`,
      [escolaId, anoLetivo, alunoIds]
    )

    const freqMap = new Map<string, { total_dias: number; total_presencas: number; total_faltas: number; total_justificadas: number }>()
    for (const f of freqResult.rows) {
      freqMap.set(f.aluno_id, {
        total_dias: parseInt(f.total_dias) || 0,
        total_presencas: parseInt(f.total_presencas) || 0,
        total_faltas: parseInt(f.total_faltas) || 0,
        total_justificadas: parseInt(f.total_justificadas) || 0,
      })
    }

    // 5. Processar cada aluno
    const resultados: any[] = []
    let totalAprovados = 0
    let totalReprovados = 0
    let totalEmRecuperacao = 0
    let totalParciais = 0
    let totalDependencias = 0

    for (const aluno of alunosResult.rows) {
      const serieCodigo = serieParaCodigo(aluno.serie || '')
      const regra = regrasMap.get(serieCodigo)

      // Se não encontrou regra ou é parecer com aprovação automática
      if (!regra) {
        resultados.push({
          aluno_id: aluno.id,
          aluno_nome: aluno.nome,
          serie: aluno.serie,
          turma_codigo: aluno.turma_codigo || '-',
          medias: [],
          frequencia_percentual: null,
          situacao_proposta: 'aprovado',
          motivo: 'Sem regra de avaliação definida - aprovação automática',
          parcial: false,
        })
        totalAprovados++
        continue
      }

      if (regra.aprovacao_automatica || regra.tipo_resultado === 'parecer') {
        resultados.push({
          aluno_id: aluno.id,
          aluno_nome: aluno.nome,
          serie: aluno.serie,
          turma_codigo: aluno.turma_codigo || '-',
          medias: [],
          frequencia_percentual: null,
          situacao_proposta: 'aprovado',
          motivo: regra.tipo_resultado === 'parecer'
            ? 'Avaliação por parecer - aprovação automática'
            : 'Aprovação automática pela regra de avaliação',
          parcial: false,
        })
        totalAprovados++
        continue
      }

      const mediaAprovacao = parseFloat(regra.media_aprovacao) || 6
      const pesosPeriodos: { periodo: number; peso: number }[] = regra.pesos_periodos
        ? (typeof regra.pesos_periodos === 'string' ? JSON.parse(regra.pesos_periodos) : regra.pesos_periodos)
        : Array.from({ length: regra.qtd_periodos || 4 }, (_, i) => ({ periodo: i + 1, peso: 1 }))

      // Calcular médias por disciplina
      const disciplinas = notasAgrupadas.get(aluno.id)
      const medias: { disciplina: string; media_anual: number | null; periodos_com_nota: number; periodos_total: number }[] = []
      let todasAprovadas = true
      let algumaParcial = false

      if (disciplinas && disciplinas.size > 0) {
        for (const [, disc] of disciplinas) {
          const resultado = calcularMediaAnual(disc.notas, {
            formula: regra.formula_media,
            pesosPeriodos,
            casasDecimais: regra.casas_decimais,
            arredondamento: regra.arredondamento,
          })

          if (resultado.periodos_com_nota < resultado.periodos_total) {
            algumaParcial = true
          }

          medias.push({
            disciplina: disc.nome,
            media_anual: resultado.periodos_com_nota > 0 ? resultado.media : null,
            periodos_com_nota: resultado.periodos_com_nota,
            periodos_total: resultado.periodos_total,
          })

          if (resultado.periodos_com_nota > 0 && resultado.media < mediaAprovacao) {
            todasAprovadas = false
          }
        }
      } else {
        // Sem notas lançadas
        algumaParcial = true
      }

      // Frequência
      const freq = freqMap.get(aluno.id)
      let frequenciaPercentual: number | null = null
      let reprovadoPorFrequencia = false
      if (freq && freq.total_dias > 0) {
        // Abono opcional: faltas justificadas contam como presença.
        const presencasEfetivas = freq.total_presencas + (abonaJustificadas ? freq.total_justificadas : 0)
        frequenciaPercentual = Math.round((presencasEfetivas / freq.total_dias) * 10000) / 100
        if (frequenciaPercentual < percentualMinimo) {
          reprovadoPorFrequencia = true
        }
      }

      // Determinar situação
      let situacaoProposta: string
      let motivo: string

      if (algumaParcial && medias.length === 0) {
        situacaoProposta = 'parcial'
        motivo = 'Sem notas lançadas'
        totalParciais++
      } else if (reprovadoPorFrequencia) {
        situacaoProposta = 'reprovado'
        motivo = `Reprovado por frequência (${frequenciaPercentual?.toFixed(1)}% < ${percentualMinimo}%)`
        totalReprovados++
      } else if (!todasAprovadas) {
        const disciplinasAbaixo = medias
          .filter(m => m.media_anual !== null && m.media_anual < mediaAprovacao)
          .map(m => `${m.disciplina} (${m.media_anual?.toFixed(1)})`)
        // Progressão parcial (dependência): se o nº de disciplinas abaixo da
        // média cabe no limite da série (series_escolares.max_dependencias), o
        // aluno avança carregando dependência em vez de ser reprovado direto
        // (LDB art. 24 / regimento). max_dependencias = 0 → sem dependência.
        const maxDependencias = parseInt(regra.max_dependencias) || 0
        if (maxDependencias > 0 && disciplinasAbaixo.length <= maxDependencias) {
          situacaoProposta = 'progressao_parcial'
          motivo = `Progressão parcial — dependência em ${disciplinasAbaixo.length} de até ${maxDependencias}: ${disciplinasAbaixo.join(', ')}`
          totalDependencias++
        } else {
          situacaoProposta = 'reprovado'
          motivo = `Média abaixo em: ${disciplinasAbaixo.join(', ')}`
          totalReprovados++
        }
      } else if (algumaParcial) {
        situacaoProposta = 'parcial'
        motivo = 'Notas incompletas - nem todos os períodos foram lançados'
        totalParciais++
      } else {
        situacaoProposta = 'aprovado'
        motivo = 'Todas as disciplinas com média e frequência suficientes'
        totalAprovados++
      }

      resultados.push({
        aluno_id: aluno.id,
        aluno_nome: aluno.nome,
        serie: aluno.serie,
        turma_codigo: aluno.turma_codigo || '-',
        medias,
        frequencia_percentual: frequenciaPercentual,
        situacao_proposta: situacaoProposta,
        motivo,
        parcial: algumaParcial,
      })
    }

    // Parecer do Conselho de Classe (período final) — soberano sobre o cálculo.
    // Anexa o parecer e sinaliza divergência com a proposta automática.
    const pareceresConselho = await buscarPareceresConselho(escolaId, anoLetivo, alunoIds)
    for (const res of resultados) {
      const parecer = pareceresConselho.get(res.aluno_id) || null
      res.parecer_conselho = parecer
      const situacaoConselho = parecer ? parecerParaSituacao(parecer) : null
      res.divergencia_conselho = situacaoConselho !== null && situacaoConselho !== res.situacao_proposta
    }

    // Dias letivos efetivos x exigidos (LDB art. 24 — gate de fechamento)
    const diasLetivos = await calcularDiasLetivos(escolaId, anoLetivo)

    return NextResponse.json({
      resultados,
      resumo: {
        total: resultados.length,
        aprovados: totalAprovados,
        reprovados: totalReprovados,
        em_recuperacao: totalEmRecuperacao,
        parciais: totalParciais,
        dependencias: totalDependencias,
        dias_letivos_efetivos: diasLetivos.efetivos,
        dias_letivos_exigidos: diasLetivos.exigidos,
        dias_letivos_suficientes: diasLetivos.suficientes,
      },
    })
  } catch (error: unknown) {
    console.error('Erro ao calcular fechamento do ano:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

// ============================================
// POST - Aplicar resultados do fechamento
// ============================================

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = aplicarResultadosSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json({
        mensagem: 'Dados inválidos',
        erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
      }, { status: 400 })
    }

    const { escola_id, ano_letivo, resultados, forcar, justificativa } = validacao.data

    // Gate de dias letivos (LDB art. 24, I — mínimo de 200 dias/800h).
    // Bloqueia o fechamento se insuficiente, salvo override explícito do gestor.
    const diasLetivos = await calcularDiasLetivos(escola_id, ano_letivo)
    if (diasLetivos.suficientes === false && !forcar) {
      return NextResponse.json({
        mensagem: `Dias letivos insuficientes: ${diasLetivos.efetivos} de ${diasLetivos.exigidos} exigidos (LDB art. 24). Reveja o calendário ou confirme o fechamento com justificativa.`,
        erro: 'DIAS_LETIVOS_INSUFICIENTES',
        dias_letivos_efetivos: diasLetivos.efetivos,
        dias_letivos_exigidos: diasLetivos.exigidos,
      }, { status: 422 })
    }

    // Validar que todos os alunos existem e estão 'cursando'
    const alunoIds = resultados.map(r => r.aluno_id)
    const alunosCheck = await pool.query(
      `SELECT id, situacao, nome FROM alunos
       WHERE id = ANY($1) AND escola_id = $2 AND ano_letivo = $3`,
      [alunoIds, escola_id, ano_letivo]
    )

    const alunosMap = new Map<string, { situacao: string; nome: string }>()
    for (const a of alunosCheck.rows) {
      alunosMap.set(a.id, { situacao: a.situacao, nome: a.nome })
    }

    // Verificar alunos não encontrados ou com situação inválida
    const errosValidacao: { aluno_id: string; mensagem: string }[] = []
    for (const r of resultados) {
      const aluno = alunosMap.get(r.aluno_id)
      if (!aluno) {
        errosValidacao.push({ aluno_id: r.aluno_id, mensagem: 'Aluno não encontrado nesta escola/ano' })
      } else if (aluno.situacao !== 'cursando') {
        errosValidacao.push({ aluno_id: r.aluno_id, mensagem: `Aluno já está com situação '${aluno.situacao}'` })
      }
    }

    if (errosValidacao.length > 0) {
      return NextResponse.json({
        mensagem: `${errosValidacao.length} erro(s) de validação encontrados`,
        erros: errosValidacao,
      }, { status: 400 })
    }

    // Parecer do Conselho de Classe (soberano) — quando há parecer, ele decide
    // a situação aplicada, prevalecendo sobre a proposta enviada pelo gestor.
    const pareceresConselho = await buscarPareceresConselho(escola_id, ano_letivo, alunoIds)

    // Observação do histórico — registra override de dias letivos (auditoria)
    const observacaoBase = `Fechamento do ano letivo ${ano_letivo}` +
      (forcar && diasLetivos.suficientes === false
        ? ` — OVERRIDE de dias letivos (${diasLetivos.efetivos}/${diasLetivos.exigidos}): ${justificativa?.trim() || 'sem justificativa'}`
        : '')

    // Aplicar em lote com transação
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let processados = 0
      let aprovados = 0
      let reprovados = 0
      let dependencias = 0
      const errosProcessamento: { aluno_id: string; mensagem: string }[] = []

      const BATCH_SIZE = 50
      for (let i = 0; i < resultados.length; i += BATCH_SIZE) {
        const lote = resultados.slice(i, i + BATCH_SIZE)

        for (const item of lote) {
          try {
            // Conselho soberano: se há parecer, ele decide; senão, vale a
            // situação enviada pelo gestor (que viu a proposta no preview).
            const parecer = pareceresConselho.get(item.aluno_id) || null
            const situacaoConselho = parecer ? parecerParaSituacao(parecer) : null
            const situacaoFinal = situacaoConselho ?? item.situacao
            const origem = situacaoConselho
              ? `Decisão do Conselho de Classe (parecer: ${parecer})`
              : 'Decisão do gestor'
            const observacaoItem = `${observacaoBase} — ${origem}`

            // Atualizar situação do aluno
            await client.query(
              `UPDATE alunos SET situacao = $1 WHERE id = $2`,
              [situacaoFinal, item.aluno_id]
            )

            // Registrar no histórico
            await client.query(
              `INSERT INTO historico_situacao (aluno_id, situacao, situacao_anterior, data, observacao, registrado_por)
               VALUES ($1, $2, 'cursando', CURRENT_DATE, $3, $4)`,
              [
                item.aluno_id,
                situacaoFinal,
                observacaoItem,
                usuario.id,
              ]
            )

            processados++
            if (situacaoFinal === 'aprovado') aprovados++
            else if (situacaoFinal === 'progressao_parcial') dependencias++
            else reprovados++
          } catch (err: unknown) {
            console.error(`Erro ao processar aluno ${item.aluno_id}:`, (err as Error).message)
            errosProcessamento.push({ aluno_id: item.aluno_id, mensagem: (err as Error)?.message || 'Erro desconhecido' })
          }
        }
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Fechamento aplicado com sucesso: ${processados} aluno(s) processado(s)`,
        processados,
        aprovados,
        reprovados,
        dependencias,
        erros: errosProcessamento.length,
        errosDetalhes: errosProcessamento.length > 0 ? errosProcessamento : undefined,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    console.error('Erro ao aplicar fechamento do ano:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
