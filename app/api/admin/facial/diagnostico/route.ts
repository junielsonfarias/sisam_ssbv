import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/facial/diagnostico?aluno_nome=JHULLYA
 * Diagnóstico completo dos dados faciais de um aluno
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoNome = searchParams.get('aluno_nome')
    const alunoId = searchParams.get('aluno_id')

    if (!alunoNome && !alunoId) {
      return NextResponse.json({ mensagem: 'aluno_nome ou aluno_id obrigatório' }, { status: 400 })
    }

    // Buscar aluno
    const alunoQuery = alunoId
      ? 'SELECT id, nome, codigo, serie, turma_id, escola_id, ativo FROM alunos WHERE id = $1'
      : "SELECT id, nome, codigo, serie, turma_id, escola_id, ativo FROM alunos WHERE nome ILIKE $1 LIMIT 5"
    const alunoParam = alunoId || `%${alunoNome}%`
    const alunoResult = await pool.query(alunoQuery, [alunoParam])

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado', busca: alunoParam })
    }

    const diagnosticos = []

    for (const aluno of alunoResult.rows) {
      // Consentimento
      const consentResult = await pool.query(
        'SELECT id, aluno_id, consentido, consentido_por, data_consentimento, criado_em FROM consentimentos_faciais WHERE aluno_id = $1',
        [aluno.id]
      )

      // Embedding
      const embedResult = await pool.query(
        `SELECT id, aluno_id, qualidade, versao_modelo, registrado_por, criado_em, atualizado_em,
                length(embedding_data) as tamanho_bytes,
                encode(embedding_data, 'base64') as embedding_base64
         FROM embeddings_faciais WHERE aluno_id = $1`,
        [aluno.id]
      )

      // Verificar embedding
      let embeddingValido = false
      let embeddingTamanho = 0
      let descriptorPreview: number[] = []

      if (embedResult.rows.length > 0) {
        const row = embedResult.rows[0]
        embeddingTamanho = parseInt(row.tamanho_bytes) || 0
        embeddingValido = embeddingTamanho === 512 // 128 floats × 4 bytes

        // Decodificar e verificar primeiros 5 valores
        if (row.embedding_base64) {
          try {
            const buf = Buffer.from(row.embedding_base64, 'base64')
            const floats = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
            descriptorPreview = Array.from(floats.slice(0, 5)).map(v => Math.round(v * 10000) / 10000)

            // Verificar se são valores válidos (não NaN, não todos zeros)
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

    return NextResponse.json({ diagnosticos })
  } catch (error: unknown) {
    console.error('Erro no diagnóstico facial:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
