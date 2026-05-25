/**
 * Service de Documentos Formais Emitidos.
 *
 * Gera código de validação único, hash SHA-256 do conteúdo, e armazena
 * snapshot para validação pública via /validar/[codigo].
 *
 * Tipos cobertos:
 *  - historico_escolar
 *  - guia_transferencia
 *  - declaracao_matricula / frequencia / conclusao / transferencia
 *  - boletim_escolar
 *  - certificado_eja
 *
 * @module services/documentos
 */

import crypto from 'crypto'
import pool from '@/database/connection'
import { registrarAuditoria } from './auditoria.service'

export type TipoDocumento =
  | 'historico_escolar'
  | 'guia_transferencia'
  | 'declaracao_matricula'
  | 'declaracao_frequencia'
  | 'declaracao_conclusao'
  | 'declaracao_transferencia'
  | 'boletim_escolar'
  | 'certificado_eja'

export const TIPO_DOC_LABEL: Record<TipoDocumento, string> = {
  historico_escolar: 'Histórico Escolar',
  guia_transferencia: 'Guia de Transferência',
  declaracao_matricula: 'Declaração de Matrícula',
  declaracao_frequencia: 'Declaração de Frequência',
  declaracao_conclusao: 'Declaração de Conclusão',
  declaracao_transferencia: 'Declaração de Transferência',
  boletim_escolar: 'Boletim Escolar',
  certificado_eja: 'Certificado EJA',
}

export interface DocumentoEmitido {
  id: string
  codigo_validacao: string
  hash_conteudo: string
  tipo: TipoDocumento
  aluno_id: string | null
  dados_snapshot: Record<string, unknown>
  emitido_por: string | null
  emitido_em: Date
  escola_id: string | null
  escola_nome_snapshot: string | null
  status: 'ativo' | 'cancelado' | 'substituido'
  pdf_url: string | null
  vezes_validado: number
}

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Gera código de validação curto e legível (12 chars, sem ambiguidade). */
function gerarCodigoValidacao(): string {
  const bytes = crypto.randomBytes(12)
  let out = ''
  for (let i = 0; i < 12; i++) {
    out += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length]
    if (i === 3 || i === 7) out += '-'
  }
  return out  // formato: XXXX-XXXX-XXXX
}

/** Hash SHA-256 do snapshot canonicalizado. */
function calcularHash(dadosSnapshot: Record<string, unknown>, emitidoEm: Date): string {
  const canonical = JSON.stringify(dadosSnapshot, Object.keys(dadosSnapshot).sort()) + '|' + emitidoEm.toISOString()
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

/**
 * Emite novo documento. Gera código + hash, salva snapshot e auditoria.
 */
export async function emitirDocumento(params: {
  tipo: TipoDocumento
  alunoId: string | null
  dados: Record<string, unknown>
  emitidoPor: string
  escolaId?: string | null
  escolaNome?: string | null
  pdfUrl?: string | null
}): Promise<{ id: string; codigo_validacao: string; hash_conteudo: string }> {
  // Garante código único (tentativas)
  let codigo: string = ''
  for (let i = 0; i < 5; i++) {
    codigo = gerarCodigoValidacao()
    const r = await pool.query(
      `SELECT 1 FROM documentos_emitidos WHERE codigo_validacao = $1 LIMIT 1`,
      [codigo]
    )
    if (r.rows.length === 0) break
  }

  const emitidoEm = new Date()
  const hash = calcularHash(params.dados, emitidoEm)

  const r = await pool.query(
    `INSERT INTO documentos_emitidos
       (codigo_validacao, hash_conteudo, tipo, aluno_id, dados_snapshot,
        emitido_por, emitido_em, escola_id, escola_nome_snapshot, pdf_url)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      codigo, hash, params.tipo, params.alunoId,
      JSON.stringify(params.dados),
      params.emitidoPor, emitidoEm,
      params.escolaId || null, params.escolaNome || null,
      params.pdfUrl || null,
    ]
  )

  const id = r.rows[0].id

  await registrarAuditoria({
    usuarioId: params.emitidoPor,
    acao: 'EMITIR_DOCUMENTO',
    entidade: 'documentos_emitidos',
    entidadeId: id,
    detalhes: { tipo: params.tipo, alunoId: params.alunoId, codigo },
  })

  return { id, codigo_validacao: codigo, hash_conteudo: hash }
}

/**
 * Busca documento por código para validação pública.
 * Registra log da validação e incrementa contador.
 */
export async function validarDocumento(params: {
  codigo: string
  ip?: string
  userAgent?: string
}): Promise<DocumentoEmitido | null> {
  const r = await pool.query(
    `SELECT * FROM documentos_emitidos
      WHERE codigo_validacao = $1 AND status = 'ativo'
      LIMIT 1`,
    [params.codigo]
  )

  const doc = r.rows[0]
  if (!doc) return null

  // Atualiza contador + log (não bloqueia retorno)
  pool.query(
    `UPDATE documentos_emitidos
       SET vezes_validado = vezes_validado + 1, ultima_validacao = NOW()
     WHERE id = $1`,
    [doc.id]
  ).catch(() => {/* ignora */})

  pool.query(
    `INSERT INTO documentos_validacoes_log (documento_id, ip_origem, user_agent)
       VALUES ($1, $2, $3)`,
    [doc.id, params.ip || null, params.userAgent || null]
  ).catch(() => {/* ignora */})

  return doc
}

/**
 * Cancela documento (marca como cancelado, mantém histórico).
 */
export async function cancelarDocumento(params: {
  id: string
  canceladoPor: string
  motivo: string
}): Promise<boolean> {
  const r = await pool.query(
    `UPDATE documentos_emitidos
       SET status = 'cancelado',
           cancelado_em = NOW(),
           cancelado_por = $2,
           motivo_cancelamento = $3
     WHERE id = $1 AND status = 'ativo'`,
    [params.id, params.canceladoPor, params.motivo]
  )
  return (r.rowCount ?? 0) > 0
}

/**
 * Lista documentos emitidos para um aluno.
 */
export async function listarDocumentosAluno(alunoId: string) {
  const r = await pool.query(
    `SELECT id, codigo_validacao, tipo, status, emitido_em, escola_nome_snapshot, vezes_validado
       FROM documentos_emitidos
      WHERE aluno_id = $1
      ORDER BY emitido_em DESC
      LIMIT 100`,
    [alunoId]
  )
  return r.rows
}

// ============================================================================
// COLETOR DE DADOS PARA HISTÓRICO ESCOLAR
// ============================================================================

/**
 * Agrega todos os dados necessários para o histórico escolar formal.
 * Retorna estrutura pronta para gerar PDF / snapshot.
 */
export async function coletarDadosHistoricoEscolar(alunoId: string): Promise<Record<string, unknown>> {
  // Aluno + escola
  const aR = await pool.query(
    `SELECT a.id, a.nome, a.cpf, a.matricula, a.data_nascimento, a.sexo,
            a.nome_pai, a.nome_mae, a.naturalidade,
            e.nome AS escola_nome, e.codigo_inep AS escola_inep,
            e.endereco AS escola_endereco
       FROM alunos a
       LEFT JOIN escolas e ON e.id = a.escola_id
      WHERE a.id = $1`,
    [alunoId]
  )
  const aluno = aR.rows[0]
  if (!aluno) throw new Error('Aluno não encontrado')

  // Histórico de situações por ano
  const hR = await pool.query(
    `SELECT ano_letivo, serie, situacao, escola_id,
            media_final, frequencia_total
       FROM historico_situacao
      WHERE aluno_id = $1
      ORDER BY ano_letivo`,
    [alunoId]
  ).catch(() => ({ rows: [] }))

  // Notas detalhadas (se existir)
  let notas: any[] = []
  try {
    const nR = await pool.query(
      `SELECT n.ano_letivo, n.serie, d.nome AS disciplina,
              n.bimestre, n.nota, n.nota_recuperacao
         FROM notas_escolares n
         LEFT JOIN disciplinas_escolares d ON d.id = n.disciplina_id
        WHERE n.aluno_id = $1
        ORDER BY n.ano_letivo, n.serie, d.nome, n.bimestre`,
      [alunoId]
    )
    notas = nR.rows
  } catch { /* tabela pode não existir */ }

  return {
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      cpf: aluno.cpf,
      matricula: aluno.matricula,
      data_nascimento: aluno.data_nascimento,
      sexo: aluno.sexo,
      filiacao: { pai: aluno.nome_pai, mae: aluno.nome_mae },
      naturalidade: aluno.naturalidade,
    },
    escola_atual: {
      nome: aluno.escola_nome,
      inep: aluno.escola_inep,
      endereco: aluno.escola_endereco,
    },
    historico_anos: hR.rows,
    notas_detalhadas: notas,
    emitido_em: new Date().toISOString(),
  }
}
