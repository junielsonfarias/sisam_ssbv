import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import {
  createWhereBuilder, addCondition, addRawCondition, addAccessControl, buildConditionsString,
} from '@/lib/api-helpers'

// ============================================================================
// Service Facial — lógica compartilhada para consentimento, embeddings,
// dispositivos e LGPD
// ============================================================================

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ConsentimentoAluno {
  aluno_id: string
  aluno_nome: string
  aluno_codigo?: string
  consentimento_id?: string
  responsavel_nome: string | null
  responsavel_cpf?: string | null
  consentido: boolean | null
  data_consentimento: string | null
  data_revogacao: string | null
  tem_embedding: boolean
}

export interface EmbeddingAluno {
  aluno_id: string
  nome: string
  codigo: string
  turma_id: string | null
  serie: string | null
  turma_codigo: string | null
  turma_nome: string | null
  qualidade: number | null
  embedding_base64: string | null
}

export interface DispositivoFacial {
  id: string
  nome: string
  localizacao: string | null
  status: string
  ultimo_ping: string | null
  metadata: Record<string, unknown> | null
  criado_em: string
  atualizado_em: string
  api_key_prefix: string | null
  escola_nome: string
}

export interface LogDispositivo {
  evento: string
  detalhes: Record<string, unknown> | null
  criado_em: string
}

export interface DispositivoDetalhado {
  dispositivo: Omit<DispositivoFacial, 'api_key_prefix'> & { [key: string]: unknown }
  logs: LogDispositivo[]
}

export interface DiagnosticoEmbedding {
  existe: boolean
  valido?: boolean
  tamanho_bytes?: number
  tamanho_esperado?: number
  qualidade?: number | null
  versao_modelo?: string | null
  criado_em?: string
  atualizado_em?: string
  primeiros_5_valores?: number[]
  base64_length?: number
}

export interface DiagnosticoAluno {
  aluno: {
    id: string
    nome: string
    codigo: string | null
    escola_id: string | null
    turma_id: string | null
    serie: string | null
    ano_letivo: string | null
    ativo: boolean
    situacao: string | null
  }
  consentimento: {
    consentido: boolean
    responsavel_nome: string | null
    data_consentimento: string | null
    data_revogacao: string | null
  } | null
  embedding: DiagnosticoEmbedding
  status: {
    pronto_para_terminal: boolean
    problemas: string[]
  }
}

export interface RevogarConsentimentoResult {
  embeddings: number
  consentimentos_revogados: number
  frequencias_anonimizadas: number
}

export interface FiltrosDispositivo {
  escolaId?: string | null
  poloId?: string | null
  usuario?: { tipo_usuario: string; escola_id?: string | null; polo_id?: string | null }
}

// ---------------------------------------------------------------------------
// Consentimentos
// ---------------------------------------------------------------------------

/**
 * Busca status de consentimento facial dos alunos de uma escola
 */
export async function buscarConsentimentos(
  escolaId: string,
  anoLetivo: string,
  turmaId?: string | null,
): Promise<ConsentimentoAluno[]> {
  const where = createWhereBuilder()
  addCondition(where, 'a.escola_id', escolaId)
  addRawCondition(where, 'a.ativo = true')
  addCondition(where, 'a.ano_letivo', anoLetivo)
  if (turmaId) addCondition(where, 'a.turma_id', turmaId)

  const result = await pool.query(
    `SELECT
      a.id AS aluno_id, a.nome AS aluno_nome, a.codigo AS aluno_codigo,
      cf.id AS consentimento_id, cf.responsavel_nome, cf.consentido,
      cf.data_consentimento, cf.data_revogacao,
      CASE WHEN ef.id IS NOT NULL THEN true ELSE false END AS tem_embedding
    FROM alunos a
    LEFT JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
    LEFT JOIN embeddings_faciais ef ON ef.aluno_id = a.id
    WHERE ${buildConditionsString(where)}
    ORDER BY a.nome`,
    where.params,
  )

  return result.rows
}

/**
 * Busca consentimento de um aluno específico
 */
export async function buscarConsentimentoAluno(
  alunoId: string,
): Promise<ConsentimentoAluno[]> {
  const result = await pool.query(
    `SELECT
      a.id AS aluno_id,
      a.nome AS aluno_nome,
      cf.responsavel_nome,
      cf.responsavel_cpf,
      cf.consentido,
      cf.data_consentimento,
      cf.data_revogacao,
      CASE WHEN ef.id IS NOT NULL THEN true ELSE false END AS tem_embedding
    FROM alunos a
    LEFT JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
    LEFT JOIN embeddings_faciais ef ON ef.aluno_id = a.id
    WHERE a.id = $1`,
    [alunoId],
  )

  return result.rows
}

/**
 * Revoga consentimento e remove dados faciais (LGPD).
 * Executa em transação: update consentimento + delete embedding + update frequência.
 */
export async function revogarConsentimento(
  alunoId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    // Revogar consentimento
    await client.query(
      `UPDATE consentimentos_faciais
       SET consentido = false, data_revogacao = CURRENT_TIMESTAMP
       WHERE aluno_id = $1`,
      [alunoId],
    )

    // Remover embedding
    await client.query(
      'DELETE FROM embeddings_faciais WHERE aluno_id = $1',
      [alunoId],
    )

    // Manter frequências mas remover vínculo facial
    await client.query(
      `UPDATE frequencia_diaria SET metodo = 'manual', dispositivo_id = NULL, confianca = NULL
       WHERE aluno_id = $1 AND metodo = 'facial'`,
      [alunoId],
    )
  })
}

/**
 * Exclusão LGPD completa — retorna contadores de registros afetados.
 * Mesma lógica de revogarConsentimento, mas retorna quantidades.
 */
export async function purgarDadosFaciaisLGPD(
  alunoId: string,
): Promise<RevogarConsentimentoResult> {
  return withTransaction(async (client) => {
    const embeddingResult = await client.query(
      'DELETE FROM embeddings_faciais WHERE aluno_id = $1',
      [alunoId],
    )

    const consentimentoResult = await client.query(
      `UPDATE consentimentos_faciais
       SET consentido = false, data_revogacao = CURRENT_TIMESTAMP
       WHERE aluno_id = $1`,
      [alunoId],
    )

    const frequenciaResult = await client.query(
      `UPDATE frequencia_diaria
       SET metodo = 'manual', dispositivo_id = NULL, confianca = NULL
       WHERE aluno_id = $1 AND metodo = 'facial'`,
      [alunoId],
    )

    return {
      embeddings: embeddingResult.rowCount || 0,
      consentimentos_revogados: consentimentoResult.rowCount || 0,
      frequencias_anonimizadas: frequenciaResult.rowCount || 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/**
 * Busca embeddings faciais para terminal web.
 * Converte BYTEA para base64 limpo.
 */
export async function buscarEmbeddings(
  escolaId: string,
  anoLetivo: string,
  turmaId?: string | null,
): Promise<{ alunos: EmbeddingAluno[]; total: number }> {
  const where = createWhereBuilder()
  addCondition(where, 'a.escola_id', escolaId)
  addRawCondition(where, 'a.ativo = true')
  addRawCondition(where, "a.situacao = 'cursando'")
  addCondition(where, 'a.ano_letivo', anoLetivo)
  if (turmaId) addCondition(where, 'a.turma_id', turmaId)

  const result = await pool.query(
    `SELECT a.id AS aluno_id, a.nome, a.codigo, a.turma_id, a.serie,
            t.codigo AS turma_codigo, t.nome AS turma_nome,
            ef.embedding_data, ef.qualidade
     FROM alunos a
     INNER JOIN embeddings_faciais ef ON ef.aluno_id = a.id
     INNER JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
       AND cf.consentido = true AND cf.data_revogacao IS NULL
     LEFT JOIN turmas t ON a.turma_id = t.id
     WHERE ${buildConditionsString(where)}
     ORDER BY a.nome LIMIT 2000`,
    where.params,
  )

  // Converter BYTEA para base64 limpo (sem quebras de linha do PostgreSQL)
  const alunos: EmbeddingAluno[] = result.rows.map((row: Record<string, unknown>) => ({
    aluno_id: row.aluno_id as string,
    nome: row.nome as string,
    codigo: row.codigo as string,
    turma_id: row.turma_id as string | null,
    serie: row.serie as string | null,
    turma_codigo: row.turma_codigo as string | null,
    turma_nome: row.turma_nome as string | null,
    qualidade: row.qualidade as number | null,
    embedding_base64: row.embedding_data
      ? Buffer.from(row.embedding_data as Buffer).toString('base64')
      : null,
  }))

  return { alunos, total: alunos.length }
}

// ---------------------------------------------------------------------------
// Diagnóstico
// ---------------------------------------------------------------------------

/**
 * Diagnóstico completo dos dados faciais de aluno(s).
 * Busca por ID ou por nome (ILIKE, até 5 resultados).
 */
export async function diagnosticarAluno(
  filtro: { alunoId?: string; alunoNome?: string },
): Promise<DiagnosticoAluno[]> {
  const alunoQuery = filtro.alunoId
    ? 'SELECT id, nome, codigo, serie, turma_id, escola_id, ativo, pcd, data_nascimento FROM alunos WHERE id = $1'
    : "SELECT id, nome, codigo, serie, turma_id, escola_id, ativo, pcd, data_nascimento FROM alunos WHERE nome ILIKE $1 LIMIT 5"
  const alunoParam = filtro.alunoId || `%${filtro.alunoNome}%`
  const alunoResult = await pool.query(alunoQuery, [alunoParam])

  const diagnosticos: DiagnosticoAluno[] = []

  // Batch query: buscar consentimentos e embeddings de TODOS os alunos de uma vez (elimina N+1)
  const alunoIds = alunoResult.rows.map((a: any) => a.id)

  const [allConsent, allEmbed] = await Promise.all([
    pool.query(
      'SELECT * FROM consentimentos_faciais WHERE aluno_id = ANY($1)',
      [alunoIds],
    ),
    pool.query(
      `SELECT id, aluno_id, qualidade, versao_modelo, registrado_por, criado_em, atualizado_em,
              length(embedding_data) as tamanho_bytes,
              encode(embedding_data, 'base64') as embedding_base64
       FROM embeddings_faciais WHERE aluno_id = ANY($1)`,
      [alunoIds],
    ),
  ])

  // Montar mapas para lookup O(1)
  const consentMap = new Map(allConsent.rows.map((r: any) => [r.aluno_id, r]))
  const embedMap = new Map(allEmbed.rows.map((r: any) => [r.aluno_id, r]))

  for (const aluno of alunoResult.rows) {
    const consentResult = { rows: consentMap.has(aluno.id) ? [consentMap.get(aluno.id)] : [] }
    const embedResult = { rows: embedMap.has(aluno.id) ? [embedMap.get(aluno.id)] : [] }

    // Verificar embedding
    let embeddingValido = false
    let embeddingTamanho = 0
    let descriptorPreview: number[] = []

    if (embedResult.rows.length > 0) {
      const row = embedResult.rows[0]
      embeddingTamanho = parseInt(row.tamanho_bytes) || 0
      embeddingValido = embeddingTamanho === 512 // 128 floats x 4 bytes

      // Decodificar e verificar primeiros 5 valores
      if (row.embedding_base64) {
        try {
          const buf = Buffer.from(row.embedding_base64, 'base64')
          const floats = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
          descriptorPreview = Array.from(floats.slice(0, 5)).map(v => Math.round(v * 10000) / 10000)

          const temNaN = Array.from(floats).some(v => isNaN(v))
          const todosZero = Array.from(floats).every(v => v === 0)
          const temInfinito = Array.from(floats).some(v => !isFinite(v))

          if (temNaN || todosZero || temInfinito) {
            embeddingValido = false
          }
        } catch {
          embeddingValido = false
        }
      }
    }

    diagnosticos.push({
      aluno: {
        id: aluno.id,
        nome: aluno.nome,
        codigo: aluno.codigo,
        escola_id: aluno.escola_id,
        turma_id: aluno.turma_id,
        serie: aluno.serie,
        ano_letivo: aluno.ano_letivo,
        ativo: aluno.ativo,
        situacao: aluno.situacao,
      },
      consentimento: consentResult.rows.length > 0 ? {
        consentido: consentResult.rows[0].consentido,
        responsavel_nome: consentResult.rows[0].responsavel_nome,
        data_consentimento: consentResult.rows[0].data_consentimento,
        data_revogacao: consentResult.rows[0].data_revogacao,
      } : null,
      embedding: embedResult.rows.length > 0 ? {
        existe: true,
        valido: embeddingValido,
        tamanho_bytes: embeddingTamanho,
        tamanho_esperado: 512,
        qualidade: embedResult.rows[0].qualidade,
        versao_modelo: embedResult.rows[0].versao_modelo,
        criado_em: embedResult.rows[0].criado_em,
        atualizado_em: embedResult.rows[0].atualizado_em,
        primeiros_5_valores: descriptorPreview,
        base64_length: embedResult.rows[0].embedding_base64?.length || 0,
      } : { existe: false },
      status: {
        pronto_para_terminal:
          aluno.ativo &&
          consentResult.rows[0]?.consentido === true &&
          !consentResult.rows[0]?.data_revogacao &&
          embeddingValido,
        problemas: [
          ...(!aluno.ativo ? ['Aluno inativo'] : []),
          ...(consentResult.rows.length === 0 ? ['Sem consentimento LGPD'] : []),
          ...(consentResult.rows[0] && !consentResult.rows[0].consentido ? ['Consentimento não aprovado'] : []),
          ...(consentResult.rows[0]?.data_revogacao ? ['Consentimento revogado'] : []),
          ...(embedResult.rows.length === 0 ? ['Sem embedding facial'] : []),
          ...(embeddingTamanho > 0 && embeddingTamanho !== 512 ? [`Embedding tamanho errado: ${embeddingTamanho} bytes (esperado 512)`] : []),
          ...(!embeddingValido && embeddingTamanho === 512 ? ['Embedding contém valores inválidos (NaN/zero/infinito)'] : []),
        ],
      },
    })
  }

  return diagnosticos
}

// ---------------------------------------------------------------------------
// Dispositivos Faciais
// ---------------------------------------------------------------------------

/**
 * Busca dispositivos faciais com filtro de acesso (escola/polo/admin).
 */
export async function buscarDispositivos(
  filtros: FiltrosDispositivo,
): Promise<DispositivoFacial[]> {
  const where = createWhereBuilder()
  if (filtros.escolaId) addCondition(where, 'd.escola_id', filtros.escolaId)
  if (filtros.usuario) {
    addAccessControl(where, filtros.usuario as Parameters<typeof addAccessControl>[1], {
      escolaIdField: 'd.escola_id',
      poloIdField: 'e.polo_id',
    })
  }

  const result = await pool.query(
    `SELECT d.id, d.nome, d.localizacao, d.status, d.ultimo_ping,
           d.metadata, d.criado_em, d.atualizado_em, d.api_key_prefix,
           e.nome AS escola_nome
    FROM dispositivos_faciais d
    INNER JOIN escolas e ON e.id = d.escola_id
    WHERE ${buildConditionsString(where)}
    ORDER BY d.criado_em DESC`,
    where.params,
  )

  return result.rows
}

/**
 * Busca detalhes de um dispositivo + logs recentes.
 * Remove api_key_hash da resposta.
 */
export async function buscarDispositivoDetalhado(
  dispositivoId: string,
): Promise<DispositivoDetalhado | null> {
  const result = await pool.query(
    `SELECT d.*, e.nome AS escola_nome
     FROM dispositivos_faciais d
     INNER JOIN escolas e ON e.id = d.escola_id
     WHERE d.id = $1`,
    [dispositivoId],
  )

  if (result.rows.length === 0) return null

  // Buscar logs recentes
  const logsResult = await pool.query(
    `SELECT evento, detalhes, criado_em
     FROM logs_dispositivos
     WHERE dispositivo_id = $1
     ORDER BY criado_em DESC
     LIMIT 50`,
    [dispositivoId],
  )

  // Excluir api_key_hash da resposta
  const dispositivo = result.rows[0]
  delete dispositivo.api_key_hash

  return {
    dispositivo,
    logs: logsResult.rows,
  }
}

/**
 * Exclui dispositivo permanentemente (logs + dispositivo em transação).
 * Apenas dispositivos bloqueados podem ser excluídos.
 */
export async function excluirDispositivo(
  dispositivoId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM logs_dispositivos WHERE dispositivo_id = $1', [dispositivoId])
    await client.query('DELETE FROM dispositivos_faciais WHERE id = $1', [dispositivoId])
  })
}
