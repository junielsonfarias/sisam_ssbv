import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { calcularNotaFinal, lancarNotas } from '@/lib/services/notas'
import { z } from 'zod'
import {
  parseSearchParams, createWhereBuilder, addCondition, addAccessControl, buildWhereString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// Schema para lançamento em lote (suporta numerico, conceito e parecer)
const notaLoteSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid().optional(), // Opcional para parecer (sem disciplina específica)
  periodo_id: z.string().uuid(),
  notas: z.array(z.object({
    aluno_id: z.string().uuid(),
    nota: z.number().min(0).max(100).nullable().optional(),
    nota_recuperacao: z.number().min(0).max(100).nullable().optional(),
    faltas: z.number().int().min(0).optional(),
    observacao: z.string().max(500).nullable().optional(),
    conceito: z.string().max(5).nullable().optional(),
    parecer_descritivo: z.string().max(5000).nullable().optional(),
  })),
})

/**
 * GET /api/admin/notas-escolares
 *
 * Busca notas de uma turma para uma disciplina e período específicos
 * Params: turma_id, disciplina_id, periodo_id
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const searchParams = request.nextUrl.searchParams
  const { turma_id, disciplina_id, periodo_id, escola_id, aluno_id } = parseSearchParams(
    searchParams, ['turma_id', 'disciplina_id', 'periodo_id', 'escola_id', 'aluno_id']
  )

  if (!turma_id && !escola_id && !aluno_id) {
    return NextResponse.json({ mensagem: 'Informe turma_id, escola_id ou aluno_id' }, { status: 400 })
  }

  const where = createWhereBuilder()

  // Restrição de acesso
  addAccessControl(where, usuario, { escolaIdField: 'n.escola_id', poloIdField: 'e.polo_id' })

  // turma_id usa COALESCE — precisa de addRawCondition pattern
  if (turma_id) {
    where.conditions.push(`COALESCE(n.turma_id, a.turma_id) = $${where.paramIndex}`)
    where.params.push(turma_id)
    where.paramIndex++
  }

  addCondition(where, 'n.disciplina_id', disciplina_id)
  addCondition(where, 'n.periodo_id', periodo_id)
  addCondition(where, 'n.escola_id', escola_id)
  addCondition(where, 'n.aluno_id', aluno_id)

  const whereClause = buildWhereString(where)

  const result = await pool.query(
    `SELECT n.id, n.aluno_id, n.disciplina_id, n.periodo_id, n.escola_id, n.turma_id,
            n.ano_letivo, n.nota, n.nota_recuperacao, n.nota_final, n.faltas,
            n.observacao, n.conceito, n.parecer_descritivo, n.criado_em, n.atualizado_em,
            a.nome as aluno_nome, a.codigo as aluno_codigo,
            d.nome as disciplina_nome, d.codigo as disciplina_codigo,
            p.nome as periodo_nome, p.numero as periodo_numero,
            t.codigo as turma_codigo, t.serie as turma_serie, t.nome as turma_nome
     FROM notas_escolares n
     INNER JOIN alunos a ON n.aluno_id = a.id
     INNER JOIN disciplinas_escolares d ON n.disciplina_id = d.id
     INNER JOIN periodos_letivos p ON n.periodo_id = p.id
     INNER JOIN escolas e ON n.escola_id = e.id
     LEFT JOIN turmas t ON COALESCE(n.turma_id, a.turma_id) = t.id
     ${whereClause}
     ORDER BY a.nome, d.ordem, p.numero`,
    where.params
  )

  return NextResponse.json(result.rows)
})

/**
 * POST /api/admin/notas-escolares
 *
 * Lançamento de notas em lote para uma turma/disciplina/período
 * Suporta 3 tipos: numerico, conceito, parecer
 * Detecta automaticamente pelo tipo de avaliação da série
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const body = await request.json()
    const validacao = notaLoteSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json({
        mensagem: 'Dados inválidos',
        erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
      }, { status: 400 })
    }

    const { turma_id, disciplina_id, periodo_id, notas } = validacao.data

    // Buscar turma para obter escola_id, ano_letivo e serie
    const turmaResult = await pool.query(
      `SELECT t.escola_id, t.ano_letivo, t.serie,
              se.tipo_avaliacao_id, se.regra_avaliacao_id,
              ta.codigo as tipo_codigo, ta.tipo_resultado, ta.escala_conceitos, ta.nota_maxima as tipo_nota_maxima,
              ra.permite_recuperacao as regra_permite_recuperacao, ra.aprovacao_automatica,
              ra.media_aprovacao as regra_media_aprovacao, ra.nota_maxima as regra_nota_maxima
       FROM turmas t
       LEFT JOIN series_escolares se ON REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g') = se.codigo
         OR se.codigo = CASE
           WHEN t.serie ILIKE '%creche%' THEN 'CRE'
           WHEN t.serie ILIKE '%pré i%' OR t.serie ILIKE '%pre i%' OR t.serie ILIKE '%pré 1%' THEN 'PRE1'
           WHEN t.serie ILIKE '%pré ii%' OR t.serie ILIKE '%pre ii%' OR t.serie ILIKE '%pré 2%' THEN 'PRE2'
           WHEN t.serie ILIKE '%eja%1%' THEN 'EJA1'
           WHEN t.serie ILIKE '%eja%2%' THEN 'EJA2'
           WHEN t.serie ILIKE '%eja%3%' THEN 'EJA3'
           WHEN t.serie ILIKE '%eja%4%' THEN 'EJA4'
           ELSE REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g')
         END
       LEFT JOIN tipos_avaliacao ta ON ta.id = se.tipo_avaliacao_id
       LEFT JOIN regras_avaliacao ra ON ra.id = se.regra_avaliacao_id
       WHERE t.id = $1
       LIMIT 1`,
      [turma_id]
    )

    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaResult.rows[0]
    const { escola_id, ano_letivo } = turma
    const tipoResultado = turma.tipo_resultado || 'numerico'
    const escalaConceitos = turma.escala_conceitos || []

    // Restrição de acesso para escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Buscar configuração de notas da escola como fallback
    const configResult = await pool.query(
      'SELECT * FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
      [escola_id, ano_letivo]
    )

    const rawConfig = configResult.rows[0] || {}
    const config = {
      nota_maxima: parseFloat(turma.regra_nota_maxima) || parseFloat(rawConfig.nota_maxima) || 10,
      media_aprovacao: parseFloat(turma.regra_media_aprovacao) || parseFloat(rawConfig.media_aprovacao) || 6,
      peso_avaliacao: parseFloat(rawConfig.peso_avaliacao) || 0.6,
      peso_recuperacao: parseFloat(rawConfig.peso_recuperacao) || 0.4,
      permite_recuperacao: turma.regra_permite_recuperacao ?? rawConfig.permite_recuperacao ?? true,
    }

    // Pré-processar notas com base no tipo de resultado (conceito, parecer, numérico)
    const notasPreparadas = []
    const errosPreprocessamento: { aluno_id: string; mensagem: string }[] = []

    for (const item of notas) {
      let notaVal: number | null = item.nota ?? null
      let notaRecVal: number | null = item.nota_recuperacao ?? null
      let conceitoVal: string | null = item.conceito ?? null
      let parecerVal: string | null = item.parecer_descritivo ?? null

      if (tipoResultado === 'parecer') {
        notaVal = null
        notaRecVal = null
      } else if (tipoResultado === 'conceito') {
        if (conceitoVal && Array.isArray(escalaConceitos)) {
          const conceito = escalaConceitos.find((c: any) => c.codigo === conceitoVal)
          if (conceito) {
            notaVal = parseFloat(conceito.valor_numerico)
          } else {
            errosPreprocessamento.push({ aluno_id: item.aluno_id, mensagem: `Conceito '${conceitoVal}' inválido` })
            continue
          }
        }
        notaRecVal = null
      } else {
        if ((notaVal === null || notaVal === undefined) && notaRecVal !== null && notaRecVal !== undefined) {
          errosPreprocessamento.push({ aluno_id: item.aluno_id, mensagem: 'Nota de recuperação requer nota original' })
          continue
        }
      }

      notasPreparadas.push({
        aluno_id: item.aluno_id,
        nota: notaVal,
        nota_recuperacao: notaRecVal,
        faltas: item.faltas,
        observacao: item.observacao,
        conceito: conceitoVal,
        parecer_descritivo: parecerVal,
      })
    }

    // Usar service layer centralizado para UPSERT
    const resultado = await lancarNotas({
      turmaId: turma_id,
      disciplinaId: disciplina_id || null,
      periodoId: periodo_id,
      escolaId: escola_id,
      anoLetivo: ano_letivo,
      notas: notasPreparadas,
      config: { nota_maxima: config.nota_maxima, media_aprovacao: config.media_aprovacao, permite_recuperacao: config.permite_recuperacao, peso_avaliacao: config.peso_avaliacao, peso_recuperacao: config.peso_recuperacao },
      registradoPor: usuario.id,
      tipoAvaliacaoId: turma.tipo_avaliacao_id || null,
    })

    const todosErros = [...errosPreprocessamento, ...resultado.erros]
    return NextResponse.json({
      mensagem: `${resultado.processados} nota(s) salva(s) com sucesso${todosErros.length > 0 ? `, ${todosErros.length} erro(s)` : ''}`,
      processados: resultado.processados,
      erros: todosErros.length,
      errosDetalhes: todosErros.length > 0 ? todosErros : undefined,
    })
  } catch (error: unknown) {
    console.error('Erro ao salvar notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * GET /api/admin/notas-escolares?aluno_id=X
 * Retorna boletim completo do aluno (todas disciplinas x todos períodos)
 * Usado na visualização do boletim individual
 */
