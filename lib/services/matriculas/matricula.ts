import { withTransaction } from '@/lib/database/with-transaction'
import { withSavepoint } from '@/lib/database/with-savepoint'
import { criarGeradorCodigoAlunoTx } from '@/lib/gerar-codigo-aluno'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { podeAcessarEscolaSync } from '@/lib/auth'
import type { Usuario } from '@/lib/types'
import { PoolClient } from 'pg'
import {
  DadosMatricula, ResultadoMatricula, DadosAluno, DadosAlunoExistente, DadosNovoAluno,
  ResultadoMatriculaBatch, MatriculaError, isAlunoExistente,
} from './types'
import { verificarAnoLetivoAtivo } from './consultas'

// ============================================================================
// Operações de matrícula (single + batch)
// ============================================================================

/**
 * Matricula um unico aluno em uma turma (validacao completa + UPDATE).
 * Verifica: turma existe, capacidade, aluno nao duplicado.
 * Usado pela fila de espera ao confirmar matricula.
 */
export async function matricularAluno(
  dados: DadosMatricula
): Promise<ResultadoMatricula> {
  const { alunoId, turmaId, escolaId, serie, anoLetivo } = dados

  let semVagas: ResultadoMatricula | null = null

  await withTransaction(async (client: PoolClient) => {
    // Capacity-check DENTRO da transacao com SELECT FOR UPDATE evita race entre
    // confirmacoes concorrentes (mesmo padrao de matricularAlunosBatch).
    const turmaLock = await client.query(
      `SELECT capacidade_maxima FROM turmas WHERE id = $1 FOR UPDATE`,
      [turmaId]
    )
    if (turmaLock.rows.length === 0) {
      semVagas = { sucesso: false, mensagem: 'Turma não encontrada' }
      return
    }
    const capacidade = turmaLock.rows[0].capacidade_maxima as number | null
    if (capacidade && capacidade > 0) {
      const ocupacao = await client.query(
        `SELECT COUNT(*)::int AS total
           FROM alunos
          WHERE turma_id = $1 AND situacao = 'cursando' AND ativo = true`,
        [turmaId]
      )
      const ocupados = ocupacao.rows[0].total as number
      if (capacidade - ocupados <= 0) {
        semVagas = {
          sucesso: false,
          mensagem: `Turma sem vagas disponíveis (${ocupados}/${capacidade})`,
        }
        return
      }
    }

    await client.query(
      `UPDATE alunos
       SET turma_id = $1, escola_id = $2, serie = $3, ano_letivo = $4,
           situacao = 'cursando', ativo = true, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [turmaId, escolaId, serie, anoLetivo, alunoId]
    )
  })

  if (semVagas) return semVagas

  return { sucesso: true, mensagem: 'Aluno matriculado com sucesso' }
}

/**
 * Matricula multiplos alunos em uma turma dentro de uma unica transacao.
 * Para cada aluno:
 *  - Se tem id: valida conflito de turma, situacao transferido, e faz UPDATE
 *  - Se nao tem id: cria novo aluno com INSERT
 *
 * Usado por: POST /api/admin/matriculas/alunos
 */
export async function matricularAlunosBatch(params: {
  escolaId: string
  turmaId: string
  serie: string
  anoLetivo: string
  alunos: DadosAluno[]
  usuarioId: string
  /** Usuário autenticado — usado para impedir IDOR de escrita (mover aluno de outra escola/polo). */
  usuario?: Usuario
}): Promise<ResultadoMatriculaBatch> {
  const { escolaId, turmaId, serie, anoLetivo, alunos, usuarioId, usuario } = params

  const resultados: ResultadoMatriculaBatch = {
    matriculados: 0,
    criados: 0,
    erros: [],
    alunos: [],
  }

  // Bloqueia se ano letivo nao for 'ativo' (corrige bug ALTO #5 da
  // auditoria — antes apenas matricularAluno single chamava esta funcao).
  const erroAno = await verificarAnoLetivoAtivo(anoLetivo)
  if (erroAno) throw new MatriculaError(erroAno)

  await withTransaction(async (client: PoolClient) => {
    // Capacity-check DENTRO da transacao com SELECT FOR UPDATE evita
    // race: duas batches concorrentes nao podem mais matricular alem
    // da capacidade (corrige bug ALTO #4 da auditoria).
    if (turmaId) {
      const turmaLock = await client.query(
        `SELECT capacidade_maxima FROM turmas WHERE id = $1 FOR UPDATE`,
        [turmaId]
      )
      if (turmaLock.rows.length === 0) {
        throw new MatriculaError('Turma não encontrada')
      }
      const capacidade = turmaLock.rows[0].capacidade_maxima as number | null
      if (capacidade && capacidade > 0) {
        const ocupacao = await client.query(
          `SELECT COUNT(*)::int AS total
             FROM alunos
            WHERE turma_id = $1 AND situacao = 'cursando' AND ativo = true`,
          [turmaId]
        )
        const ocupados = ocupacao.rows[0].total as number
        const disponivel = capacidade - ocupados
        if (disponivel < alunos.length) {
          throw new MatriculaError(
            `Turma possui apenas ${disponivel} vaga(s) disponível(is) de ${capacidade}. Tentando matricular ${alunos.length} aluno(s).`
          )
        }
      }
    }

    // Gerador de código DENTRO da transação (vê inserts não-commitados; não
    // abre 2ª conexão do pool como gerarCodigoAluno). Lock 42 adquirido só na
    // 1ª criação — lote só de rematrículas nunca toma o lock.
    const proximoCodigo = criarGeradorCodigoAlunoTx(client)

    for (const aluno of alunos) {
      try {
        // SAVEPOINT por aluno: um erro (ex.: UNIQUE_VIOLATION de código/CPF, que
        // o catch abaixo trata) não pode abortar a transação inteira — sem isso,
        // os alunos seguintes falhariam com "transaction aborted" e o COMMIT
        // viraria rollback silencioso, reportando "matriculados" mas salvando 0.
        await withSavepoint(client, async () => {
          if (isAlunoExistente(aluno)) {
            await processarAlunoExistente(client, {
              aluno, turmaId, escolaId, serie, anoLetivo, usuarioId, resultados, usuario,
            })
          } else {
            await processarNovoAluno(client, {
              aluno, turmaId, escolaId, serie, anoLetivo, resultados, proximoCodigo,
            })
          }
        })
      } catch (err: unknown) {
        if ((err as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
          resultados.erros.push(`Aluno ${aluno.nome}: código ou CPF já cadastrado`)
        } else {
          resultados.erros.push(
            `Aluno ${aluno.nome}: ${(err as Error)?.message || 'Erro desconhecido'}`
          )
        }
      }
    }
  })

  return resultados
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function processarAlunoExistente(
  client: PoolClient,
  ctx: {
    aluno: DadosAlunoExistente
    turmaId: string | null
    escolaId: string
    serie: string
    anoLetivo: string
    usuarioId: string
    resultados: ResultadoMatriculaBatch
    usuario?: Usuario
  }
): Promise<void> {
  const { aluno, turmaId, escolaId, serie, anoLetivo, usuarioId, resultados, usuario } = ctx

  // Buscar situacao + escola ATUAL do aluno (e o polo da escola) — usado tanto
  // para a regra de transferencia quanto para o controle de escopo (anti-IDOR).
  const alunoAtual = await client.query(
    `SELECT a.situacao, a.escola_id, e.polo_id
       FROM alunos a
       LEFT JOIN escolas e ON e.id = a.escola_id
      WHERE a.id = $1`,
    [aluno.id]
  )

  // Controle de escopo (anti-IDOR de escrita): um usuario de escola/polo NAO
  // pode "sequestrar" um aluno de outra escola para a sua, mesmo enviando seu
  // proprio escola_id no payload. Admin/tecnico nao sofrem restricao.
  if (usuario && alunoAtual.rows.length > 0) {
    const escolaAtualId = alunoAtual.rows[0].escola_id as string | null
    const poloAtualId = alunoAtual.rows[0].polo_id as string | null
    if (escolaAtualId && !podeAcessarEscolaSync(usuario, escolaAtualId, poloAtualId)) {
      resultados.erros.push(`Aluno ${aluno.nome}: fora do seu escopo de acesso`)
      return
    }
  }

  // Verificar se aluno ja esta em outra turma no mesmo ano
  const conflito = await client.query(
    `SELECT turma_id FROM alunos WHERE id = $1 AND turma_id IS NOT NULL AND turma_id != $2 AND ano_letivo = $3 AND situacao = 'cursando'`,
    [aluno.id, turmaId, anoLetivo]
  )
  if (conflito.rows.length > 0) {
    resultados.erros.push(
      `Aluno ${aluno.nome}: já matriculado em outra turma neste ano letivo`
    )
    return
  }

  // Verificar se aluno esta transferido e validar data
  if (alunoAtual.rows.length > 0 && alunoAtual.rows[0].situacao === 'transferido') {
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
        return
      }
    }
  }

  // Aluno existente: atualizar turma, serie, ano letivo e reativar
  const serieAluno = aluno.serie_individual || serie
  const result = await client.query(
    `UPDATE alunos
     SET turma_id = $1, serie = $2, ano_letivo = $3, escola_id = $4,
         situacao = 'cursando', ativo = true, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [turmaId, serieAluno, anoLetivo, escolaId, aluno.id]
  )

  if (result.rows.length > 0) {
    // Registrar entrada no historico se veio de transferencia
    if (alunoAtual.rows.length > 0 && alunoAtual.rows[0].situacao === 'transferido') {
      await client.query(
        `INSERT INTO historico_situacao (aluno_id, situacao, situacao_anterior, data, observacao, registrado_por,
         tipo_movimentacao, escola_origem_id)
         VALUES ($1, 'cursando', 'transferido', CURRENT_DATE, 'Rematrícula via sistema', $2, 'entrada', $3)`,
        [aluno.id, usuarioId, result.rows[0].escola_id]
      )
    }
    resultados.matriculados++
    resultados.alunos.push(result.rows[0])
  } else {
    resultados.erros.push(`Aluno ${aluno.nome}: não encontrado`)
  }
}

async function processarNovoAluno(
  client: PoolClient,
  ctx: {
    aluno: DadosNovoAluno
    turmaId: string | null
    escolaId: string
    serie: string
    anoLetivo: string
    resultados: ResultadoMatriculaBatch
    proximoCodigo: () => Promise<string>
  }
): Promise<void> {
  const { aluno, turmaId, escolaId, serie, anoLetivo, resultados, proximoCodigo } = ctx

  const codigo = aluno.codigo || (await proximoCodigo())
  const serieNovoAluno = aluno.serie_individual || serie

  const result = await client.query(
    `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo, cpf, data_nascimento, pcd)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      codigo,
      aluno.nome,
      escolaId,
      turmaId,
      serieNovoAluno,
      anoLetivo,
      aluno.cpf || null,
      aluno.data_nascimento || null,
      aluno.pcd || false,
    ]
  )

  resultados.criados++
  resultados.matriculados++
  resultados.alunos.push(result.rows[0])
}
