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
 * SOFT delete: marca aluno como ativo=false e situacao='inativo'.
 *
 * Antes (até 2026-05-26): fazia DELETE FROM alunos em cascata. Como 28+
 * tabelas filhas (frequencia_diaria, notas_escolares, conselho, AEE, PNAE,
 * PNLD, FICAI, Bolsa Familia, embeddings_faciais, documentos_emitidos, etc.)
 * têm ON DELETE CASCADE, todo o historico pedagogico do menor sumia sem
 * possibilidade de recuperacao. Bug crítico #5 da auditoria Pt.5.
 *
 * Caches SISAM (resultados_*) ainda são removidos — sao dados transitórios
 * que podem ser regenerados. Dados pedagogicos persistentes ficam preservados.
 *
 * Para purge físico LGPD (art. 18 VI), criar endpoint dedicado com
 * confirmacao multifator (TODO sprint LGPD).
 *
 * Usa withTransaction para garantir consistência e retry automático em deadlock.
 */
export async function deletarAluno(alunoId: string): Promise<{ nome: string }> {
  return withTransaction(async (client) => {
    // Remove apenas caches SISAM (regenerveis a partir das importacoes)
    await client.query('DELETE FROM resultados_provas WHERE aluno_id = $1', [alunoId])
    await client.query('DELETE FROM resultados_producao WHERE aluno_id = $1', [alunoId])
    await client.query('DELETE FROM resultados_consolidados WHERE aluno_id = $1', [alunoId])

    // Soft delete do aluno: marca como inativo, preserva historico
    const result = await client.query(
      `UPDATE alunos
          SET ativo = false,
              situacao = 'inativo',
              atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, nome`,
      [alunoId]
    )

    if (result.rows.length === 0) {
      throw new Error('Aluno não encontrado durante exclusão')
    }

    return { nome: result.rows[0].nome }
  })
}

// Whitelist de campos persistíveis em `alunos`, alinhada ao schema Zod
// `alunoSchema` em lib/schemas/entidades.ts. Inclui campos das migrations:
// - add-matriculas-2026 (cpf/data_nascimento/pcd)
// - add-dados-complementares-aluno (familiares/pessoais/saude)
// - add-situacao-aluno (situacao)
// - add-data-matricula
// - add-aluno-unique-constraint
const ALUNO_CAMPOS_PERSISTIVEIS = [
  // Identificacao base
  'codigo', 'nome', 'escola_id', 'turma_id', 'serie', 'ano_letivo',
  'cpf', 'data_nascimento', 'data_matricula', 'pcd', 'situacao', 'ativo',
  // Familiares
  'nome_mae', 'nome_pai', 'responsavel', 'telefone_responsavel',
  // Pessoais
  'genero', 'raca_cor', 'naturalidade', 'nacionalidade',
  // Documentos
  'rg', 'certidao_nascimento', 'sus',
  // Endereco
  'endereco', 'bairro', 'cidade', 'cep',
  // Programas sociais
  'bolsa_familia', 'nis',
  // Projetos
  'projeto_contraturno', 'projeto_nome',
  // Saude
  'tipo_deficiencia', 'alergia', 'medicacao',
  // Observacoes
  'observacoes',
] as const

type CampoAluno = typeof ALUNO_CAMPOS_PERSISTIVEIS[number]
type AlunoInput = Partial<Record<CampoAluno, unknown>> & { nome: string; escola_id: string }

/**
 * Cria um novo aluno (com geração de código automático).
 * Aceita qualquer subconjunto dos campos da whitelist — campos ausentes
 * são omitidos do INSERT (banco aplica defaults: NULL ou DEFAULT da coluna).
 *
 * Antes (até 2026-05-26): aceitava só 9 campos e descartava silenciosamente
 * os 20+ campos complementares enviados pelo Zod (bug crítico #4 da
 * auditoria Pt.5).
 *
 * Usado por: admin/alunos POST
 */
export async function criarAluno(dados: AlunoInput): Promise<any> {
  const { nome, escola_id, turma_id } = dados as { nome: string; escola_id: string; turma_id?: string | null }

  if (turma_id) {
    const valida = await validarTurmaEscola(turma_id, escola_id)
    if (!valida) {
      throw new Error('Turma não pertence à escola selecionada')
    }
  }

  // Gera codigo automatico se nao fornecido (campo virtual)
  const codigoFinal = (dados.codigo as string | undefined) || await gerarCodigoAluno()
  const payload: Record<string, unknown> = { ...dados, codigo: codigoFinal }
  // data_matricula default: hoje (resolve item #11 da auditoria)
  if (payload.data_matricula === undefined) payload.data_matricula = new Date().toISOString().slice(0, 10)

  const cols: string[] = []
  const placeholders: string[] = []
  const values: unknown[] = []
  let i = 1
  for (const campo of ALUNO_CAMPOS_PERSISTIVEIS) {
    if (payload[campo] !== undefined) {
      cols.push(campo)
      placeholders.push(`$${i++}`)
      values.push(payload[campo])
    }
  }

  const result = await pool.query(
    `INSERT INTO alunos (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  )
  return result.rows[0]
}

/**
 * Atualiza dados de um aluno existente. Mesma whitelist do criarAluno.
 * Apenas campos presentes em `dados` (não-undefined) são incluídos no SET.
 *
 * Usado por: admin/alunos PUT
 */
export async function atualizarAluno(id: string, dados: AlunoInput): Promise<any | null> {
  const { escola_id, turma_id } = dados as { escola_id: string; turma_id?: string | null }

  if (turma_id) {
    const valida = await validarTurmaEscola(turma_id, escola_id)
    if (!valida) {
      throw new Error('Turma não pertence à escola selecionada')
    }
  }

  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  for (const campo of ALUNO_CAMPOS_PERSISTIVEIS) {
    if ((dados as Record<string, unknown>)[campo] !== undefined) {
      sets.push(`${campo} = $${i++}`)
      values.push((dados as Record<string, unknown>)[campo])
    }
  }
  if (sets.length === 0) {
    throw new Error('Nenhum campo para atualizar')
  }
  sets.push(`atualizado_em = CURRENT_TIMESTAMP`)
  values.push(id)

  const result = await pool.query(
    `UPDATE alunos SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
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
