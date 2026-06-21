/**
 * Facial — diagnóstico completo dos dados biométricos de aluno(s).
 *
 * @module services/facial/diagnostico
 */

import pool from '@/database/connection'
import type { DiagnosticoAluno } from './types'

/**
 * Diagnóstico completo dos dados faciais de aluno(s).
 * Busca por ID ou por nome (ILIKE, até 5 resultados).
 */
export async function diagnosticarAluno(
  filtro: { alunoId?: string; alunoNome?: string },
): Promise<DiagnosticoAluno[]> {
  const alunoQuery = filtro.alunoId
    ? 'SELECT id, nome, codigo, serie, turma_id, escola_id, ativo, ano_letivo, situacao FROM alunos WHERE id = $1'
    : "SELECT id, nome, codigo, serie, turma_id, escola_id, ativo, ano_letivo, situacao FROM alunos WHERE nome ILIKE $1 LIMIT 5"
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

    // Tamanhos válidos: 512 bytes (1 pose, 128 floats) ou 1536 bytes (3 poses, 384 floats)
    const TAMANHOS_VALIDOS = [512, 1536]

    if (embedResult.rows.length > 0) {
      const row = embedResult.rows[0]
      embeddingTamanho = parseInt(row.tamanho_bytes) || 0
      embeddingValido = TAMANHOS_VALIDOS.includes(embeddingTamanho)

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
          ...(embeddingTamanho > 0 && !TAMANHOS_VALIDOS.includes(embeddingTamanho) ? [`Embedding tamanho errado: ${embeddingTamanho} bytes (esperado 512 ou 1536)`] : []),
          ...(!embeddingValido && TAMANHOS_VALIDOS.includes(embeddingTamanho) ? ['Embedding contém valores inválidos (NaN/zero/infinito)'] : []),
        ],
      },
    })
  }

  return diagnosticos
}
