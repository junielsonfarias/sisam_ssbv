import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// ============================================
// Schema de validação para POST
// ============================================

const resultadoSchema = z.object({
  aluno_id: z.string().uuid(),
  situacao: z.enum(['aprovado', 'reprovado']),
})

const aplicarResultadosSchema = z.object({
  escola_id: z.string().uuid(),
  ano_letivo: z.string().min(4).max(10),
  resultados: z.array(resultadoSchema).min(1),
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
 * Calcula a média ponderada dadas notas e pesos por período.
 * pesos_periodos: [{ periodo: 1, peso: 1 }, { periodo: 2, peso: 1 }, ...]
 * notas_por_periodo: Map<numero_periodo, nota_final>
 */
function calcularMediaPonderada(
  notasPorPeriodo: Map<number, number>,
  pesosPeriodos: { periodo: number; peso: number }[]
): { media: number; periodos_com_nota: number; periodos_total: number } {
  let somaPesosNotas = 0
  let somaPesos = 0
  let periodosComNota = 0

  for (const pp of pesosPeriodos) {
    const nota = notasPorPeriodo.get(pp.periodo)
    if (nota !== undefined && nota !== null) {
      somaPesosNotas += nota * pp.peso
      somaPesos += pp.peso
      periodosComNota++
    }
  }

  const media = somaPesos > 0 ? somaPesosNotas / somaPesos : 0
  return {
    media: Math.round(media * 100) / 100,
    periodos_com_nota: periodosComNota,
    periodos_total: pesosPeriodos.length,
  }
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
        resumo: { total: 0, aprovados: 0, reprovados: 0, em_recuperacao: 0, parciais: 0 },
      })
    }

    // 2. Buscar todas as regras de avaliação vinculadas a series_escolares
    const regrasResult = await pool.query(
      `SELECT se.codigo as serie_codigo,
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

    // 4. Buscar frequência bimestral de todos os alunos
    const freqResult = await pool.query(
      `SELECT fb.aluno_id,
              SUM(fb.dias_letivos) as total_dias,
              SUM(fb.presencas) as total_presencas,
              SUM(fb.faltas) as total_faltas
       FROM frequencia_bimestral fb
       WHERE fb.escola_id = $1
         AND fb.ano_letivo = $2
         AND fb.aluno_id = ANY($3)
       GROUP BY fb.aluno_id`,
      [escolaId, anoLetivo, alunoIds]
    )

    const freqMap = new Map<string, { total_dias: number; total_presencas: number; total_faltas: number }>()
    for (const f of freqResult.rows) {
      freqMap.set(f.aluno_id, {
        total_dias: parseInt(f.total_dias) || 0,
        total_presencas: parseInt(f.total_presencas) || 0,
        total_faltas: parseInt(f.total_faltas) || 0,
      })
    }

    // 5. Processar cada aluno
    const resultados: any[] = []
    let totalAprovados = 0
    let totalReprovados = 0
    let totalEmRecuperacao = 0
    let totalParciais = 0

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
          const resultado = calcularMediaPonderada(disc.notas, pesosPeriodos)

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
        frequenciaPercentual = Math.round((freq.total_presencas / freq.total_dias) * 10000) / 100
        if (frequenciaPercentual < 75) {
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
        motivo = `Reprovado por frequência (${frequenciaPercentual?.toFixed(1)}% < 75%)`
        totalReprovados++
      } else if (!todasAprovadas) {
        const disciplinasAbaixo = medias
          .filter(m => m.media_anual !== null && m.media_anual < mediaAprovacao)
          .map(m => `${m.disciplina} (${m.media_anual?.toFixed(1)})`)
        situacaoProposta = 'reprovado'
        motivo = `Média abaixo em: ${disciplinasAbaixo.join(', ')}`
        totalReprovados++
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

    return NextResponse.json({
      resultados,
      resumo: {
        total: resultados.length,
        aprovados: totalAprovados,
        reprovados: totalReprovados,
        em_recuperacao: totalEmRecuperacao,
        parciais: totalParciais,
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

    const { escola_id, ano_letivo, resultados } = validacao.data

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

    // Aplicar em lote com transação
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let processados = 0
      let aprovados = 0
      let reprovados = 0
      const errosProcessamento: { aluno_id: string; mensagem: string }[] = []

      const BATCH_SIZE = 50
      for (let i = 0; i < resultados.length; i += BATCH_SIZE) {
        const lote = resultados.slice(i, i + BATCH_SIZE)

        for (const item of lote) {
          try {
            // Atualizar situação do aluno
            await client.query(
              `UPDATE alunos SET situacao = $1 WHERE id = $2`,
              [item.situacao, item.aluno_id]
            )

            // Registrar no histórico
            await client.query(
              `INSERT INTO historico_situacao (aluno_id, situacao, situacao_anterior, data, observacao, registrado_por)
               VALUES ($1, $2, 'cursando', CURRENT_DATE, $3, $4)`,
              [
                item.aluno_id,
                item.situacao,
                `Fechamento do ano letivo ${ano_letivo}`,
                usuario.id,
              ]
            )

            processados++
            if (item.situacao === 'aprovado') aprovados++
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
