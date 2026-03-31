import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { gerarCodigoAluno } from '@/lib/gerar-codigo-aluno'
import { matriculaBatchSchema, validateRequest } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'
import { DatabaseError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, matriculaBatchSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { escola_id, turma_id, serie, ano_letivo, alunos } = validacao.data

    // Escola só pode matricular na própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Verificar se o ano letivo está ativo (se a tabela anos_letivos existir)
    try {
      const anoCheck = await pool.query(
        `SELECT status FROM anos_letivos WHERE ano = $1`,
        [ano_letivo]
      )
      if (anoCheck.rows.length > 0 && anoCheck.rows[0].status !== 'ativo') {
        return NextResponse.json(
          { mensagem: `Ano letivo ${ano_letivo} não está ativo. Apenas anos letivos ativos permitem novas matrículas.` },
          { status: 400 }
        )
      }
    } catch {
      // Tabela pode não existir ainda — seguir sem validação
    }

    const resultados = {
      matriculados: 0,
      criados: 0,
      erros: [] as string[],
      alunos: [] as Record<string, unknown>[],
    }

    // Verificar capacidade da turma antes de iniciar
    if (turma_id) {
      const turmaCheck = await pool.query(
        `SELECT t.capacidade_maxima,
                COUNT(a.id) FILTER (WHERE a.situacao = 'cursando') as total_cursando
         FROM turmas t
         LEFT JOIN alunos a ON a.turma_id = t.id AND a.situacao = 'cursando'
         WHERE t.id = $1
         GROUP BY t.id, t.capacidade_maxima`,
        [turma_id]
      )
      if (turmaCheck.rows.length > 0) {
        const { capacidade_maxima, total_cursando } = turmaCheck.rows[0]
        if (capacidade_maxima && parseInt(total_cursando) + alunos.length > capacidade_maxima) {
          const vagas = capacidade_maxima - parseInt(total_cursando)
          return NextResponse.json({
            mensagem: `Turma possui apenas ${vagas} vaga(s) disponível(is) de ${capacidade_maxima}. Tentando matricular ${alunos.length} aluno(s).`,
          }, { status: 400 })
        }
      }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      for (const aluno of alunos) {
      try {
        if (aluno.id) {
          // Verificar se aluno já está em outra turma no mesmo ano
          const conflito = await client.query(
            `SELECT turma_id FROM alunos WHERE id = $1 AND turma_id IS NOT NULL AND turma_id != $2 AND ano_letivo = $3 AND situacao = 'cursando'`,
            [aluno.id, turma_id, ano_letivo]
          )
          if (conflito.rows.length > 0) {
            resultados.erros.push(`Aluno ${aluno.nome}: já matriculado em outra turma neste ano letivo`)
            continue
          }

          // Verificar se aluno está transferido e validar data
          const alunoAtual = await client.query(
            'SELECT situacao FROM alunos WHERE id = $1', [aluno.id]
          )
          if (alunoAtual.rows.length > 0 && alunoAtual.rows[0].situacao === 'transferido') {
            // Buscar data da última transferência
            const ultimaTransf = await client.query(
              `SELECT data FROM historico_situacao
               WHERE aluno_id = $1 AND situacao = 'transferido'
               ORDER BY data DESC, criado_em DESC LIMIT 1`,
              [aluno.id]
            )
            if (ultimaTransf.rows.length > 0) {
              const dataTransf = ultimaTransf.rows[0].data
              const hoje = new Date().toISOString().split('T')[0]
              if (hoje < dataTransf) {
                resultados.erros.push(
                  `Aluno ${aluno.nome}: nova matrícula só permitida a partir de ${new Date(dataTransf).toLocaleDateString('pt-BR')}`
                )
                continue
              }
            }
          }

          // Aluno existente: atualizar turma, série, ano letivo e reativar
          // Se turma multiserie/multietapa, usar serie_individual do aluno
          const serieAluno = aluno.serie_individual || serie
          const result = await client.query(
            `UPDATE alunos
             SET turma_id = $1, serie = $2, ano_letivo = $3, escola_id = $4,
                 situacao = 'cursando', ativo = true, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [turma_id, serieAluno, ano_letivo, escola_id, aluno.id]
          )

          if (result.rows.length > 0) {
            // Registrar entrada no histórico se veio de transferência
            if (alunoAtual.rows.length > 0 && alunoAtual.rows[0].situacao === 'transferido') {
              await client.query(
                `INSERT INTO historico_situacao (aluno_id, situacao, situacao_anterior, data, observacao, registrado_por,
                 tipo_movimentacao, escola_origem_id)
                 VALUES ($1, 'cursando', 'transferido', CURRENT_DATE, 'Rematrícula via sistema', $2, 'entrada', $3)`,
                [aluno.id, usuario.id, result.rows[0].escola_id]
              )
            }
            resultados.matriculados++
            resultados.alunos.push(result.rows[0])
          } else {
            resultados.erros.push(`Aluno ${aluno.nome}: não encontrado`)
          }
        } else {
          // Novo aluno: criar e matricular
          const codigo = aluno.codigo || await gerarCodigoAluno()
          // Se turma multiserie/multietapa, usar serie_individual do aluno
          const serieNovoAluno = aluno.serie_individual || serie

          const result = await client.query(
            `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo, cpf, data_nascimento, pcd)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              codigo,
              aluno.nome,
              escola_id,
              turma_id,
              serieNovoAluno,
              ano_letivo,
              aluno.cpf || null,
              aluno.data_nascimento || null,
              aluno.pcd || false,
            ]
          )

          resultados.criados++
          resultados.matriculados++
          resultados.alunos.push(result.rows[0])
        }
      } catch (err: unknown) {
        if ((err as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
          resultados.erros.push(`Aluno ${aluno.nome}: código ou CPF já cadastrado`)
        } else {
          resultados.erros.push(`Aluno ${aluno.nome}: ${(err as Error)?.message || 'Erro desconhecido'}`)
        }
      }
    }

    await client.query('COMMIT')

    try { await cacheDelPattern('alunos:*') } catch {}
    try { await cacheDelPattern('turmas:*') } catch {}
    try { await cacheDelPattern('dashboard:*') } catch {}
    try { await cacheDelPattern('estatisticas:*') } catch {}

    return NextResponse.json({
      mensagem: `${resultados.matriculados} aluno(s) matriculado(s) com sucesso${resultados.criados > 0 ? ` (${resultados.criados} novo(s))` : ''}`,
      ...resultados,
    }, { status: 201 })
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    console.error('Erro ao matricular alunos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
