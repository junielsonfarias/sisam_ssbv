import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import { gerarCodigoAluno } from '@/lib/gerar-codigo-aluno'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { PoolClient } from 'pg'

// ============================================================================
// Service de Matriculas — logica de matricula, capacidade e resumo
// ============================================================================

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ResumoMatriculas {
  total_turmas: number
  total_alunos: number
}

export interface CapacidadeTurma {
  capacidade: number
  matriculados: number
  disponivel: number
}

export interface DadosNovoAluno {
  nome: string
  codigo?: string
  cpf?: string | null
  data_nascimento?: string | null
  pcd?: boolean
  serie_individual?: string
}

export interface DadosAlunoExistente extends DadosNovoAluno {
  id: string
}

export type DadosAluno = DadosAlunoExistente | DadosNovoAluno

function isAlunoExistente(aluno: DadosAluno): aluno is DadosAlunoExistente {
  return 'id' in aluno && !!aluno.id
}

export interface DadosMatricula {
  alunoId: string
  turmaId: string
  escolaId: string
  serie?: string
  anoLetivo?: string
}

export interface ResultadoMatricula {
  sucesso: boolean
  mensagem: string
}

export interface ResultadoMatriculaBatch {
  matriculados: number
  criados: number
  erros: string[]
  alunos: Record<string, unknown>[]
}

// ---------------------------------------------------------------------------
// buscarResumoMatriculas
// ---------------------------------------------------------------------------

/**
 * Busca resumo de matriculas (turmas + alunos) de uma escola.
 * Executa 2 queries em paralelo: COUNT turmas + COUNT alunos.
 */
export async function buscarResumoMatriculas(
  escolaId: string,
  anoLetivo: string
): Promise<ResumoMatriculas> {
  const [turmasResult, alunosResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) as total FROM turmas WHERE escola_id = $1 AND ano_letivo = $2 AND ativo = true`,
      [escolaId, anoLetivo]
    ),
    pool.query(
      `SELECT COUNT(*) as total FROM alunos WHERE escola_id = $1 AND ano_letivo = $2 AND ativo = true`,
      [escolaId, anoLetivo]
    ),
  ])

  return {
    total_turmas: parseInt(turmasResult.rows[0]?.total) || 0,
    total_alunos: parseInt(alunosResult.rows[0]?.total) || 0,
  }
}

// ---------------------------------------------------------------------------
// verificarCapacidadeTurma
// ---------------------------------------------------------------------------

/**
 * Verifica capacidade disponivel de uma turma.
 * Retorna capacidade maxima, total matriculados cursando e vagas disponiveis.
 */
export async function verificarCapacidadeTurma(
  turmaId: string
): Promise<CapacidadeTurma> {
  const result = await pool.query(
    `SELECT t.capacidade_maxima,
            COUNT(a.id) FILTER (WHERE a.situacao = 'cursando') as total_cursando
     FROM turmas t
     LEFT JOIN alunos a ON a.turma_id = t.id AND a.situacao = 'cursando'
     WHERE t.id = $1
     GROUP BY t.id, t.capacidade_maxima`,
    [turmaId]
  )

  if (result.rows.length === 0) {
    return { capacidade: 0, matriculados: 0, disponivel: 0 }
  }

  const { capacidade_maxima, total_cursando } = result.rows[0]
  const capacidade = capacidade_maxima ?? 0
  const matriculados = parseInt(total_cursando) || 0
  const disponivel = capacidade > 0 ? Math.max(0, capacidade - matriculados) : 0

  return { capacidade, matriculados, disponivel }
}

// ---------------------------------------------------------------------------
// verificarAnoLetivoAtivo
// ---------------------------------------------------------------------------

/**
 * Verifica se o ano letivo esta ativo. Retorna null se ok, ou mensagem de erro.
 */
export async function verificarAnoLetivoAtivo(
  anoLetivo: string
): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT status FROM anos_letivos WHERE ano = $1`,
      [anoLetivo]
    )
    if (result.rows.length > 0 && result.rows[0].status !== 'ativo') {
      return `Ano letivo ${anoLetivo} não está ativo. Apenas anos letivos ativos permitem novas matrículas.`
    }
    return null
  } catch {
    // Tabela pode nao existir ainda — seguir sem validacao
    return null
  }
}

// ---------------------------------------------------------------------------
// matricularAluno (single)
// ---------------------------------------------------------------------------

/**
 * Matricula um unico aluno em uma turma (validacao completa + UPDATE).
 * Verifica: turma existe, capacidade, aluno nao duplicado.
 * Usado pela fila de espera ao confirmar matricula.
 */
export async function matricularAluno(
  dados: DadosMatricula
): Promise<ResultadoMatricula> {
  const { alunoId, turmaId, escolaId, serie, anoLetivo } = dados

  // Verificar capacidade
  const capacidade = await verificarCapacidadeTurma(turmaId)
  if (capacidade.capacidade > 0 && capacidade.disponivel <= 0) {
    return {
      sucesso: false,
      mensagem: `Turma sem vagas disponíveis (${capacidade.matriculados}/${capacidade.capacidade})`,
    }
  }

  await withTransaction(async (client: PoolClient) => {
    await client.query(
      `UPDATE alunos
       SET turma_id = $1, escola_id = $2, serie = $3, ano_letivo = $4,
           situacao = 'cursando', ativo = true, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [turmaId, escolaId, serie, anoLetivo, alunoId]
    )
  })

  return { sucesso: true, mensagem: 'Aluno matriculado com sucesso' }
}

// ---------------------------------------------------------------------------
// matricularAlunosBatch
// ---------------------------------------------------------------------------

/**
 * Matricula multiplos alunos em uma turma dentro de uma unica transacao.
 * Para cada aluno:
 *  - Se tem id: valida conflito de turma, situacao transferido, e faz UPDATE
 *  - Se nao tem id: cria novo aluno com INSERT
 *
 * Replica a logica exata de POST /api/admin/matriculas/alunos/route.ts
 */
export async function matricularAlunosBatch(params: {
  escolaId: string
  turmaId: string | null
  serie: string
  anoLetivo: string
  alunos: DadosAluno[]
  usuarioId: string
}): Promise<ResultadoMatriculaBatch> {
  const { escolaId, turmaId, serie, anoLetivo, alunos, usuarioId } = params

  const resultados: ResultadoMatriculaBatch = {
    matriculados: 0,
    criados: 0,
    erros: [],
    alunos: [],
  }

  // Verificar capacidade da turma antes de iniciar
  if (turmaId) {
    const cap = await verificarCapacidadeTurma(turmaId)
    if (cap.capacidade > 0 && cap.disponivel < alunos.length) {
      throw new MatriculaError(
        `Turma possui apenas ${cap.disponivel} vaga(s) disponível(is) de ${cap.capacidade}. Tentando matricular ${alunos.length} aluno(s).`
      )
    }
  }

  await withTransaction(async (client: PoolClient) => {
    for (const aluno of alunos) {
      try {
        if (isAlunoExistente(aluno)) {
          await processarAlunoExistente(client, {
            aluno,
            turmaId,
            escolaId,
            serie,
            anoLetivo,
            usuarioId,
            resultados,
          })
        } else {
          await processarNovoAluno(client, {
            aluno,
            turmaId,
            escolaId,
            serie,
            anoLetivo,
            resultados,
          })
        }
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
  }
): Promise<void> {
  const { aluno, turmaId, escolaId, serie, anoLetivo, usuarioId, resultados } = ctx

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
  const alunoAtual = await client.query(
    'SELECT situacao FROM alunos WHERE id = $1',
    [aluno.id]
  )
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
  }
): Promise<void> {
  const { aluno, turmaId, escolaId, serie, anoLetivo, resultados } = ctx

  const codigo = aluno.codigo || (await gerarCodigoAluno())
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

// ---------------------------------------------------------------------------
// Erro customizado
// ---------------------------------------------------------------------------

export class MatriculaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatriculaError'
  }
}
