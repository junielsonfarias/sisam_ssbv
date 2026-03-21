import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'

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
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const disciplinaId = searchParams.get('disciplina_id')
    const periodoId = searchParams.get('periodo_id')
    const escolaId = searchParams.get('escola_id')
    const alunoId = searchParams.get('aluno_id')

    if (!turmaId && !escolaId && !alunoId) {
      return NextResponse.json({ mensagem: 'Informe turma_id, escola_id ou aluno_id' }, { status: 400 })
    }

    const whereConditions: string[] = []
    const params: string[] = []
    let paramIndex = 1

    // Restrição de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereConditions.push(`n.escola_id = $${paramIndex}`)
      params.push(usuario.escola_id as string)
      paramIndex++
    } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(usuario.polo_id as string)
      paramIndex++
    }

    if (turmaId) {
      whereConditions.push(`COALESCE(n.turma_id, a.turma_id) = $${paramIndex}`)
      params.push(turmaId)
      paramIndex++
    }

    if (disciplinaId) {
      whereConditions.push(`n.disciplina_id = $${paramIndex}`)
      params.push(disciplinaId)
      paramIndex++
    }

    if (periodoId) {
      whereConditions.push(`n.periodo_id = $${paramIndex}`)
      params.push(periodoId)
      paramIndex++
    }

    if (escolaId) {
      whereConditions.push(`n.escola_id = $${paramIndex}`)
      params.push(escolaId)
      paramIndex++
    }

    if (alunoId) {
      whereConditions.push(`n.aluno_id = $${paramIndex}`)
      params.push(alunoId)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

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
      params
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/notas-escolares
 *
 * Lançamento de notas em lote para uma turma/disciplina/período
 * Suporta 3 tipos: numerico, conceito, parecer
 * Detecta automaticamente pelo tipo de avaliação da série
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let processados = 0
      const errosDetalhes: { aluno_id: string; mensagem: string }[] = []

      const upsertSQL = `INSERT INTO notas_escolares
             (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, turma_id,
              nota, nota_recuperacao, nota_final, faltas, observacao,
              conceito, parecer_descritivo, tipo_avaliacao_id, registrado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT (aluno_id, disciplina_id, periodo_id)
             DO UPDATE SET
               nota = EXCLUDED.nota,
               nota_recuperacao = EXCLUDED.nota_recuperacao,
               nota_final = EXCLUDED.nota_final,
               faltas = EXCLUDED.faltas,
               observacao = EXCLUDED.observacao,
               conceito = EXCLUDED.conceito,
               parecer_descritivo = EXCLUDED.parecer_descritivo,
               tipo_avaliacao_id = EXCLUDED.tipo_avaliacao_id,
               registrado_por = EXCLUDED.registrado_por,
               turma_id = EXCLUDED.turma_id`

      const BATCH_SIZE = 50
      for (let i = 0; i < notas.length; i += BATCH_SIZE) {
        const lote = notas.slice(i, i + BATCH_SIZE)

        for (const item of lote) {
          try {
            let notaFinal: number | null = null
            let conceitoVal: string | null = item.conceito ?? null
            let parecerVal: string | null = item.parecer_descritivo ?? null
            let notaVal: number | null = item.nota ?? null
            let notaRecVal: number | null = item.nota_recuperacao ?? null

            if (tipoResultado === 'parecer') {
              // Parecer: sem nota numérica, apenas texto descritivo
              notaVal = null
              notaRecVal = null
              notaFinal = null
            } else if (tipoResultado === 'conceito') {
              // Conceito: converter para valor numérico equivalente
              if (conceitoVal && Array.isArray(escalaConceitos)) {
                const conceito = escalaConceitos.find((c: any) => c.codigo === conceitoVal)
                if (conceito) {
                  notaVal = parseFloat(conceito.valor_numerico)
                  notaFinal = notaVal
                } else {
                  errosDetalhes.push({ aluno_id: item.aluno_id, mensagem: `Conceito '${conceitoVal}' inválido` })
                  continue
                }
              }
              // Conceito não tem recuperação numérica
              notaRecVal = null
            } else {
              // Numérico: lógica original
              if ((notaVal === null || notaVal === undefined) && notaRecVal !== null && notaRecVal !== undefined) {
                errosDetalhes.push({ aluno_id: item.aluno_id, mensagem: 'Nota de recuperação requer nota original' })
                continue
              }

              const notaNum = typeof notaVal === 'number' ? notaVal : (notaVal !== null && notaVal !== undefined ? parseFloat(String(notaVal)) : null)
              const recNum = typeof notaRecVal === 'number' ? notaRecVal : (notaRecVal !== null && notaRecVal !== undefined ? parseFloat(String(notaRecVal)) : null)

              if (notaNum !== null && !isNaN(notaNum)) {
                notaFinal = Math.max(0, notaNum)
                if (recNum !== null && !isNaN(recNum) && config.permite_recuperacao) {
                  if (recNum > notaFinal) {
                    notaFinal = recNum
                  }
                }
                notaFinal = Math.max(0, Math.min(notaFinal, config.nota_maxima))
                notaFinal = Math.round(notaFinal * 100) / 100
                if (isNaN(notaFinal)) notaFinal = null
              }
            }

            await client.query(upsertSQL, [
              item.aluno_id, disciplina_id || null, periodo_id, escola_id, ano_letivo, turma_id,
              notaVal, notaRecVal, notaFinal,
              item.faltas ?? 0, item.observacao ?? null,
              conceitoVal, parecerVal,
              turma.tipo_avaliacao_id || null,
              usuario.id,
            ])
            processados++
          } catch (err: any) {
            console.error(`Erro ao salvar nota do aluno ${item.aluno_id}:`, err.message)
            errosDetalhes.push({ aluno_id: item.aluno_id, mensagem: err?.message || 'Erro desconhecido' })
          }
        }
      }

      await client.query('COMMIT')

      const erros = errosDetalhes.length
      return NextResponse.json({
        mensagem: `${processados} nota(s) salva(s) com sucesso${erros > 0 ? `, ${erros} erro(s)` : ''}`,
        processados,
        erros,
        errosDetalhes: erros > 0 ? errosDetalhes : undefined,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao salvar notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * GET /api/admin/notas-escolares?aluno_id=X
 * Retorna boletim completo do aluno (todas disciplinas x todos períodos)
 * Usado na visualização do boletim individual
 */
