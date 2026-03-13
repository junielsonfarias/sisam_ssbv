import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema para lançamento em lote
const notaLoteSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
  notas: z.array(z.object({
    aluno_id: z.string().uuid(),
    nota: z.number().min(0).max(100).nullable().optional(),
    nota_recuperacao: z.number().min(0).max(100).nullable().optional(),
    faltas: z.number().int().min(0).optional(),
    observacao: z.string().max(500).nullable().optional(),
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
      whereConditions.push(`a.turma_id = $${paramIndex}`)
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
      `SELECT n.*,
              a.nome as aluno_nome, a.codigo as aluno_codigo,
              d.nome as disciplina_nome, d.codigo as disciplina_codigo,
              p.nome as periodo_nome, p.numero as periodo_numero
       FROM notas_escolares n
       INNER JOIN alunos a ON n.aluno_id = a.id
       INNER JOIN disciplinas_escolares d ON n.disciplina_id = d.id
       INNER JOIN periodos_letivos p ON n.periodo_id = p.id
       INNER JOIN escolas e ON n.escola_id = e.id
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
 * Usa UPSERT (INSERT ... ON CONFLICT UPDATE) para criar ou atualizar
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

    // Buscar turma para obter escola_id e ano_letivo
    const turmaResult = await pool.query(
      'SELECT escola_id, ano_letivo FROM turmas WHERE id = $1',
      [turma_id]
    )

    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const { escola_id, ano_letivo } = turmaResult.rows[0]

    // Restrição de acesso para escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Buscar configuração de notas da escola para calcular nota_final
    const configResult = await pool.query(
      'SELECT * FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
      [escola_id, ano_letivo]
    )

    const config = configResult.rows[0] || {
      nota_maxima: 10,
      media_aprovacao: 6,
      peso_avaliacao: 0.6,
      peso_recuperacao: 0.4,
      permite_recuperacao: true,
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let processados = 0
      const errosDetalhes: { aluno_id: string; mensagem: string }[] = []

      for (const item of notas) {
        try {
          // Ignorar nota de recuperação sem nota original
          if ((item.nota === null || item.nota === undefined) && item.nota_recuperacao !== null && item.nota_recuperacao !== undefined) {
            errosDetalhes.push({ aluno_id: item.aluno_id, mensagem: 'Nota de recuperação requer nota original' })
            continue
          }

          // Calcular nota_final
          // Regra: recuperação substitui a nota quando for maior
          // 4 avaliações + 4 recuperações (1 por bimestre)
          let notaFinal: number | null = null
          if (item.nota !== null && item.nota !== undefined) {
            notaFinal = item.nota
            // Se tem nota de recuperação e é maior que a nota original, substitui
            if (item.nota_recuperacao !== null && item.nota_recuperacao !== undefined && config.permite_recuperacao) {
              if (item.nota_recuperacao > item.nota) {
                notaFinal = item.nota_recuperacao
              }
            }
            // Limitar ao máximo configurado
            notaFinal = Math.min(notaFinal, config.nota_maxima)
            // Arredondar para 2 decimais
            notaFinal = Math.round(notaFinal * 100) / 100
          }

          await client.query(
            `INSERT INTO notas_escolares
             (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, nota, nota_recuperacao, nota_final, faltas, observacao, registrado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (aluno_id, disciplina_id, periodo_id)
             DO UPDATE SET
               nota = EXCLUDED.nota,
               nota_recuperacao = EXCLUDED.nota_recuperacao,
               nota_final = EXCLUDED.nota_final,
               faltas = EXCLUDED.faltas,
               observacao = EXCLUDED.observacao,
               registrado_por = EXCLUDED.registrado_por`,
            [
              item.aluno_id,
              disciplina_id,
              periodo_id,
              escola_id,
              ano_letivo,
              item.nota ?? null,
              item.nota_recuperacao ?? null,
              notaFinal,
              item.faltas ?? 0,
              item.observacao ?? null,
              usuario.id,
            ]
          )
          processados++
        } catch (err: any) {
          console.error(`Erro ao salvar nota do aluno ${item.aluno_id}:`, err)
          errosDetalhes.push({ aluno_id: item.aluno_id, mensagem: err?.message || 'Erro desconhecido' })
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
