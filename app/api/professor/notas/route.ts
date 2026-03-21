import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const notasProfessorSchema = z.object({
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
 * GET /api/professor/notas?turma_id=X&disciplina_id=Y&periodo_id=Z
 * Busca notas existentes para turma/disciplina/período
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const disciplinaId = searchParams.get('disciplina_id')
    const periodoId = searchParams.get('periodo_id')

    if (!turmaId || !disciplinaId || !periodoId) {
      return NextResponse.json({ mensagem: 'turma_id, disciplina_id e periodo_id são obrigatórios' }, { status: 400 })
    }

    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Buscar alunos com notas (LEFT JOIN para mostrar todos os alunos)
    const result = await pool.query(
      `SELECT a.id as aluno_id, a.nome as aluno_nome, a.codigo as aluno_codigo,
              n.id as nota_id, n.nota, n.nota_recuperacao, n.nota_final,
              n.faltas, n.observacao, n.conceito, n.parecer_descritivo,
              n.registrado_por
       FROM alunos a
       LEFT JOIN notas_escolares n ON n.aluno_id = a.id AND n.disciplina_id = $2 AND n.periodo_id = $3
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
       ORDER BY a.nome`,
      [turmaId, disciplinaId, periodoId]
    )

    // Buscar config de notas
    const turmaResult = await pool.query('SELECT escola_id, ano_letivo FROM turmas WHERE id = $1', [turmaId])
    let config = { nota_maxima: 10, media_aprovacao: 6 }
    if (turmaResult.rows.length > 0) {
      const configResult = await pool.query(
        'SELECT nota_maxima, media_aprovacao FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
        [turmaResult.rows[0].escola_id, turmaResult.rows[0].ano_letivo]
      )
      if (configResult.rows.length > 0) {
        config = {
          nota_maxima: parseFloat(configResult.rows[0].nota_maxima) || 10,
          media_aprovacao: parseFloat(configResult.rows[0].media_aprovacao) || 6,
        }
      }
    }

    return NextResponse.json({ alunos: result.rows, config })
  } catch (error: any) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/professor/notas
 * Lançar notas em lote (reutiliza lógica de cálculo do admin)
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const validacao = notasProfessorSchema.safeParse(body)
    if (!validacao.success) {
      return NextResponse.json({
        mensagem: 'Dados inválidos',
        erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
      }, { status: 400 })
    }

    const { turma_id, disciplina_id, periodo_id, notas } = validacao.data

    // Verificar vínculo
    const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Verificar se professor tem acesso a esta disciplina
    const vinculoResult = await pool.query(
      `SELECT tipo_vinculo, disciplina_id FROM professor_turmas
       WHERE professor_id = $1 AND turma_id = $2 AND ativo = true`,
      [usuario.id, turma_id]
    )
    const vinculos = vinculoResult.rows
    const isPolivalente = vinculos.some((v: any) => v.tipo_vinculo === 'polivalente')
    const temDisciplina = vinculos.some((v: any) => v.disciplina_id === disciplina_id)

    if (!isPolivalente && !temDisciplina) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta disciplina' }, { status: 403 })
    }

    // Buscar turma e config
    const turmaResult = await pool.query(
      `SELECT t.escola_id, t.ano_letivo, t.serie,
              cne.nota_maxima, cne.media_aprovacao, cne.permite_recuperacao
       FROM turmas t
       LEFT JOIN configuracao_notas_escola cne ON cne.escola_id = t.escola_id AND cne.ano_letivo = t.ano_letivo
       WHERE t.id = $1`,
      [turma_id]
    )

    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const turma = turmaResult.rows[0]
    const config = {
      nota_maxima: parseFloat(turma.nota_maxima) || 10,
      media_aprovacao: parseFloat(turma.media_aprovacao) || 6,
      permite_recuperacao: turma.permite_recuperacao ?? true,
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let processados = 0
      for (const item of notas) {
        const notaVal = item.nota ?? null
        const notaRecVal = item.nota_recuperacao ?? null
        let notaFinal: number | null = null

        if (notaVal !== null && notaVal !== undefined) {
          notaFinal = Math.max(0, notaVal)
          if (notaRecVal !== null && notaRecVal !== undefined && config.permite_recuperacao) {
            if (notaRecVal > notaFinal) {
              notaFinal = notaRecVal
            }
          }
          notaFinal = Math.max(0, Math.min(notaFinal, config.nota_maxima))
          notaFinal = Math.round(notaFinal * 100) / 100
        }

        await client.query(
          `INSERT INTO notas_escolares
             (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, turma_id,
              nota, nota_recuperacao, nota_final, faltas, observacao, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (aluno_id, disciplina_id, periodo_id)
           DO UPDATE SET
             nota = EXCLUDED.nota,
             nota_recuperacao = EXCLUDED.nota_recuperacao,
             nota_final = EXCLUDED.nota_final,
             faltas = EXCLUDED.faltas,
             observacao = EXCLUDED.observacao,
             registrado_por = EXCLUDED.registrado_por,
             turma_id = EXCLUDED.turma_id`,
          [item.aluno_id, disciplina_id, periodo_id, turma.escola_id, turma.ano_letivo, turma_id,
           notaVal, notaRecVal, notaFinal, item.faltas ?? 0, item.observacao ?? null, usuario.id]
        )
        processados++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `${processados} nota(s) salva(s) com sucesso`,
        processados,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao lançar notas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
