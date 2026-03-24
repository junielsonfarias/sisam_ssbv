import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import { gerarCodigoAluno } from '@/lib/gerar-codigo-aluno'
import {
  createWhereBuilder, addRawCondition, addSearchCondition, addCondition, buildConditionsString,
} from '@/lib/api-helpers'

// ============================================================================
// Service de Alunos — lógica compartilhada entre admin, professor e matrículas
// ============================================================================

/** Retorno da busca de alunos do professor */
export interface AlunoProfessor {
  id: string
  nome: string
  codigo: string
  data_nascimento: string | null
  situacao: string
}

/** Retorno da busca textual de alunos */
export interface AlunoBusca {
  id: string
  codigo: string
  nome: string
  serie: string | null
  ano_letivo: string | null
  escola_id: string
  turma_id: string | null
  cpf: string | null
  data_nascimento: string | null
  pcd: boolean
  escola_nome: string
  turma_codigo: string | null
  turma_nome: string | null
}

/**
 * Busca alunos de uma turma para o professor (cursando, ativo)
 * Usado por: professor/alunos
 */
export async function buscarAlunosProfessor(turmaId: string): Promise<AlunoProfessor[]> {
  const result = await pool.query(
    `SELECT a.id, a.nome, a.codigo, a.data_nascimento, a.situacao
     FROM alunos a
     WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
     ORDER BY a.nome`,
    [turmaId]
  )

  return result.rows
}

/**
 * Busca alunos por busca textual (nome, código, CPF)
 * Usado por: matriculas/alunos/buscar
 */
export async function buscarAlunosPorBusca(busca: string, escolaId?: string | null): Promise<AlunoBusca[]> {
  const where = createWhereBuilder()
  addRawCondition(where, 'a.ativo = true')
  addSearchCondition(where, ['a.nome', 'a.codigo', 'a.cpf'], busca)

  if (escolaId) {
    addCondition(where, 'a.escola_id', escolaId)
  }

  const result = await pool.query(
    `SELECT a.id, a.codigo, a.nome, a.serie, a.ano_letivo, a.escola_id, a.turma_id,
            a.cpf, a.data_nascimento, a.pcd,
            e.nome as escola_nome,
            t.codigo as turma_codigo, t.nome as turma_nome
     FROM alunos a
     INNER JOIN escolas e ON a.escola_id = e.id
     LEFT JOIN turmas t ON a.turma_id = t.id
     WHERE ${buildConditionsString(where)}
     ORDER BY a.nome
     LIMIT 20`,
    where.params
  )

  return result.rows
}

/**
 * Valida que turma pertence à escola (integridade referencial)
 * Usado por: alunos POST e PUT
 */
export async function validarTurmaEscola(turmaId: string, escolaId: string): Promise<boolean> {
  const turmaCheck = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turmaId])
  if (turmaCheck.rows.length === 0 || turmaCheck.rows[0].escola_id !== escolaId) {
    return false
  }
  return true
}

/**
 * Deleta aluno com cascata em transação
 * Usado por: admin/alunos DELETE
 *
 * Remove em ordem: resultados_provas, resultados_producao, resultados_consolidados, alunos
 * Usa withTransaction para garantir consistência e retry automático em deadlock
 */
export async function deletarAluno(alunoId: string): Promise<{ nome: string }> {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM resultados_provas WHERE aluno_id = $1', [alunoId])
    await client.query('DELETE FROM resultados_producao WHERE aluno_id = $1', [alunoId])
    await client.query('DELETE FROM resultados_consolidados WHERE aluno_id = $1', [alunoId])
    const result = await client.query('DELETE FROM alunos WHERE id = $1 RETURNING id, nome', [alunoId])

    if (result.rows.length === 0) {
      throw new Error('Aluno não encontrado durante exclusão')
    }

    return { nome: result.rows[0].nome }
  })
}

/**
 * Cria um novo aluno (com geração de código automático)
 * Usado por: admin/alunos POST
 */
export async function criarAluno(dados: {
  codigo?: string | null; nome: string; escola_id: string; turma_id?: string | null;
  serie?: string | null; ano_letivo?: string | null; cpf?: string | null;
  data_nascimento?: string | null; pcd?: boolean
}): Promise<any> {
  const { codigo, nome, escola_id, turma_id, serie, ano_letivo, cpf, data_nascimento, pcd } = dados

  // Validar que turma pertence à escola informada
  if (turma_id) {
    const valida = await validarTurmaEscola(turma_id, escola_id)
    if (!valida) {
      throw new Error('Turma não pertence à escola selecionada')
    }
  }

  // Gerar código automático se não fornecido
  const codigoFinal = codigo || await gerarCodigoAluno()

  const result = await pool.query(
    `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo, cpf, data_nascimento, pcd)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      codigoFinal,
      nome,
      escola_id,
      turma_id || null,
      serie || null,
      ano_letivo || null,
      cpf || null,
      data_nascimento || null,
      pcd || false,
    ]
  )

  return result.rows[0]
}

/**
 * Atualiza dados de um aluno existente
 * Usado por: admin/alunos PUT
 */
export async function atualizarAluno(id: string, dados: {
  codigo?: string | null; nome: string; escola_id: string; turma_id?: string | null;
  serie?: string | null; ano_letivo?: string | null; ativo?: boolean;
  cpf?: string | null; data_nascimento?: string | null; pcd?: boolean
}): Promise<any | null> {
  const { codigo, nome, escola_id, turma_id, serie, ano_letivo, ativo, cpf, data_nascimento, pcd } = dados

  // Validar que turma pertence à escola informada
  if (turma_id) {
    const valida = await validarTurmaEscola(turma_id, escola_id)
    if (!valida) {
      throw new Error('Turma não pertence à escola selecionada')
    }
  }

  const result = await pool.query(
    `UPDATE alunos
     SET codigo = $1, nome = $2, escola_id = $3, turma_id = $4, serie = $5, ano_letivo = $6, ativo = $7,
         cpf = $8, data_nascimento = $9, pcd = $10, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $11
     RETURNING *`,
    [
      codigo || null,
      nome,
      escola_id,
      turma_id || null,
      serie || null,
      ano_letivo || null,
      ativo !== undefined ? ativo : true,
      cpf || null,
      data_nascimento || null,
      pcd !== undefined ? pcd : false,
      id,
    ]
  )

  return result.rows[0] || null
}

/**
 * Altera situação do aluno (cursando, transferido, abandono, etc)
 * Usado por: admin/alunos/[id]/situacao POST
 *
 * Usa withTransaction para garantir atomicidade: atualiza alunos + insere historico_situacao
 */
export async function alterarSituacao(alunoId: string, dados: {
  situacao: string; data?: string | null; observacao?: string | null;
  tipo_transferencia?: string | null; escola_destino_id?: string | null;
  escola_destino_nome?: string | null; escola_origem_id?: string | null;
  escola_origem_nome?: string | null;
}, registradoPor: string): Promise<{ sucesso: boolean; mensagem: string; situacao_anterior?: string; situacao_nova?: string }> {
  const {
    situacao, data, observacao, tipo_transferencia,
    escola_destino_id, escola_destino_nome, escola_origem_id, escola_origem_nome,
  } = dados

  return withTransaction(async (client) => {
    // Buscar situação atual
    const alunoResult = await client.query(
      'SELECT id, situacao, ativo FROM alunos WHERE id = $1',
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      throw new Error('Aluno não encontrado')
    }

    const situacaoAnterior = alunoResult.rows[0].situacao

    if (situacaoAnterior === situacao) {
      throw new Error('O aluno já possui esta situação')
    }

    // Atualizar situação na tabela alunos
    const isAtivo = !['transferido', 'abandono'].includes(situacao)

    if (situacao === 'transferido') {
      if (escola_destino_id) {
        await client.query(
          `UPDATE alunos SET situacao = $2, ativo = $3, turma_id = NULL, escola_id = $4, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
          [alunoId, situacao, isAtivo, escola_destino_id]
        )
      } else {
        await client.query(
          `UPDATE alunos SET situacao = $2, ativo = $3, turma_id = NULL, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
          [alunoId, situacao, isAtivo]
        )
      }
    } else {
      await client.query(
        `UPDATE alunos SET situacao = $2, ativo = $3, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
        [alunoId, situacao, isAtivo]
      )
    }

    // Determinar tipo de movimentação
    let tipoMovimentacao: string | null = null
    if (situacao === 'transferido') {
      tipoMovimentacao = 'saida'
    } else if (situacao === 'cursando' && (escola_origem_id || escola_origem_nome)) {
      tipoMovimentacao = 'entrada'
    }

    // Registrar no histórico com dados de transferência
    await client.query(
      `INSERT INTO historico_situacao (aluno_id, situacao, situacao_anterior, data, observacao, registrado_por,
       tipo_transferencia, escola_destino_id, escola_destino_nome, escola_origem_id, escola_origem_nome, tipo_movimentacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        alunoId,
        situacao,
        situacaoAnterior,
        data || new Date().toISOString().split('T')[0],
        observacao || null,
        registradoPor,
        tipo_transferencia || null,
        escola_destino_id || null,
        escola_destino_nome || null,
        escola_origem_id || null,
        escola_origem_nome || null,
        tipoMovimentacao,
      ]
    )

    return {
      sucesso: true,
      mensagem: 'Situação atualizada com sucesso',
      situacao_anterior: situacaoAnterior,
      situacao_nova: situacao,
    }
  })
}
