import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { validateRequest, professorSyncPostSchema } from '@/lib/schemas'
import { createLogger } from '@/lib/logger'

const log = createLogger('ProfessorSync')

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/sync
 * Baixar todos os dados do professor para uso offline
 */
export const GET = withAuth('professor', async (request, usuario) => {
  try {
    // Turmas vinculadas
    const turmasResult = await pool.query(
      `SELECT pt.turma_id, t.nome as turma_nome, t.serie, t.turno, t.codigo as turma_codigo,
              t.escola_id, e.nome as escola_nome,
              pt.tipo_vinculo, pt.disciplina_id, pt.ano_letivo,
              de.nome as disciplina_nome
       FROM professor_turmas pt
       INNER JOIN turmas t ON t.id = pt.turma_id
       INNER JOIN escolas e ON e.id = t.escola_id
       LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
       WHERE pt.professor_id = $1 AND pt.ativo = true
       ORDER BY t.turno, t.serie, t.nome`,
      [usuario.id]
    )
    const turmas = turmasResult.rows
    const turmaIds = turmas.map((t: any) => t.turma_id)

    // Alunos de todas as turmas
    let alunos: any[] = []
    if (turmaIds.length > 0) {
      const alunosResult = await pool.query(
        `SELECT id, nome, codigo, data_nascimento, turma_id
         FROM alunos
         WHERE turma_id = ANY($1) AND ativo = true AND situacao = 'cursando'
         ORDER BY nome`,
        [turmaIds]
      )
      alunos = alunosResult.rows
    }

    // Períodos letivos ativos
    const anoLetivo = turmas[0]?.ano_letivo || new Date().getFullYear().toString()
    const periodosResult = await pool.query(
      `SELECT id, nome, tipo, numero, ano_letivo, data_inicio, data_fim
       FROM periodos_letivos WHERE ano_letivo = $1 AND ativo = true ORDER BY numero`,
      [anoLetivo]
    )

    // Disciplinas por turma (via series_disciplinas)
    let disciplinas: any[] = []
    if (turmaIds.length > 0) {
      const discResult = await pool.query(
        `SELECT DISTINCT de.id, de.nome, de.codigo, de.abreviacao, de.ordem, t.id as turma_id
         FROM disciplinas_escolares de
         INNER JOIN series_disciplinas sd ON sd.disciplina_id = de.id
         INNER JOIN series_escolares se ON se.id = sd.serie_id
         INNER JOIN turmas t ON (t.serie = se.nome OR COALESCE(t.serie_numero, REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g')) = se.numero::text)
         WHERE t.id = ANY($1) AND de.ativo = true
         ORDER BY de.ordem`,
        [turmaIds]
      )
      disciplinas = discResult.rows
    }

    return NextResponse.json({
      turmas,
      alunos,
      periodos: periodosResult.rows,
      disciplinas,
      sync_date: new Date().toISOString(),
    })
  } catch (error: unknown) {
    log.error('Erro no sync professor', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/professor/sync
 * Upload de dados offline (frequências e notas pendentes)
 */
export const POST = withAuth('professor', async (request, usuario) => {
  try {
    const syncResult = await validateRequest(request, professorSyncPostSchema)
    if (!syncResult.success) return syncResult.response
    const { frequencias = [], notas = [] } = syncResult.data
    let freqSalvas = 0
    let notasSalvas = 0
    const erros: string[] = []

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Processar frequências
      for (const freq of frequencias) {
        try {
          if (freq.registros && Array.isArray(freq.registros)) {
            for (const reg of freq.registros) {
              const turmaResult = await client.query('SELECT escola_id FROM turmas WHERE id = $1', [freq.turma_id])
              if (turmaResult.rows.length === 0) continue
              await client.query(
                `INSERT INTO frequencia_diaria (aluno_id, turma_id, escola_id, data, metodo, status, registrado_por)
                 VALUES ($1, $2, $3, $4, 'manual', $5, $6)
                 ON CONFLICT (aluno_id, data) DO UPDATE SET
                   status = EXCLUDED.status, metodo = 'manual', registrado_por = EXCLUDED.registrado_por`,
                [reg.aluno_id, freq.turma_id, turmaResult.rows[0].escola_id, freq.data, reg.status, usuario.id]
              )
              freqSalvas++
            }
          }
        } catch (err: unknown) {
          erros.push(`Freq ${freq.turma_id}/${freq.data}: ${(err as Error).message}`)
        }
      }

      // Processar notas
      for (const nota of notas) {
        try {
          if (nota.notas && Array.isArray(nota.notas)) {
            const turmaResult = await client.query('SELECT escola_id, ano_letivo FROM turmas WHERE id = $1', [nota.turma_id])
            if (turmaResult.rows.length === 0) continue
            const { escola_id, ano_letivo } = turmaResult.rows[0]

            for (const item of nota.notas) {
              const notaVal = item.nota ?? null
              const notaRecVal = item.nota_recuperacao ?? null
              let notaFinal = notaVal
              if (notaRecVal !== null && notaVal !== null && notaRecVal > notaVal) {
                notaFinal = notaRecVal
              }

              await client.query(
                `INSERT INTO notas_escolares
                   (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, turma_id,
                    nota, nota_recuperacao, nota_final, faltas, observacao, registrado_por)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 ON CONFLICT (aluno_id, disciplina_id, periodo_id) DO UPDATE SET
                   nota = EXCLUDED.nota, nota_recuperacao = EXCLUDED.nota_recuperacao,
                   nota_final = EXCLUDED.nota_final, faltas = EXCLUDED.faltas,
                   observacao = EXCLUDED.observacao, registrado_por = EXCLUDED.registrado_por,
                   turma_id = EXCLUDED.turma_id`,
                [item.aluno_id, nota.disciplina_id, nota.periodo_id, escola_id, ano_letivo, nota.turma_id,
                 notaVal, notaRecVal, notaFinal, item.faltas ?? 0, item.observacao ?? null, usuario.id]
              )
              notasSalvas++
            }
          }
        } catch (err: unknown) {
          erros.push(`Notas ${nota.turma_id}: ${(err as Error).message}`)
        }
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Sincronização concluída: ${freqSalvas} frequência(s) e ${notasSalvas} nota(s)`,
        frequencias_salvas: freqSalvas,
        notas_salvas: notasSalvas,
        erros: erros.length > 0 ? erros : undefined,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    log.error('Erro no sync upload', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
