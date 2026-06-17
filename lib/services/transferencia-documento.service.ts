/**
 * Service para emissão de guia/declaração de transferência.
 *
 * Usa o service genérico de documentos (documentos.service) com tipo
 * 'guia_transferencia' ou 'declaracao_transferencia'.
 *
 * @module services/transferencia-documento
 */

import pool from '@/database/connection'
import { emitirDocumento } from './documentos.service'

export interface DadosTransferencia {
  aluno: {
    id: string
    nome: string
    cpf: string | null
    matricula: string | null
    data_nascimento: string | null
    serie: string | null
    nome_pai: string | null
    nome_mae: string | null
  }
  escola_origem: {
    id: string
    nome: string
    inep: string | null
    endereco: string | null
  }
  escola_destino?: {
    nome: string
    cidade?: string
  }
  ano_letivo: string
  data_transferencia: string
  motivo?: string
  situacao_parcial?: {
    notas_por_disciplina: Array<{
      disciplina: string
      nota_bimestre: number | null
      bimestre: number
    }>
    frequencia_percentual: number | null
    bimestres_concluidos: number
  }
}

/**
 * Coleta dados do aluno para a guia/declaração de transferência.
 */
export async function coletarDadosTransferencia(
  alunoId: string,
  anoLetivo: string,
  motivo?: string,
  escolaDestino?: { nome: string; cidade?: string }
): Promise<DadosTransferencia> {
  const r = await pool.query(
    `SELECT a.id, a.nome, a.cpf, a.matricula, a.data_nascimento, a.serie,
            a.nome_pai, a.nome_mae,
            e.id AS escola_id, e.nome AS escola_nome,
            e.codigo_inep, e.endereco
       FROM alunos a
       LEFT JOIN escolas e ON e.id = a.escola_id
      WHERE a.id = $1`,
    [alunoId]
  )
  const dados = r.rows[0]
  if (!dados) throw new Error('Aluno não encontrado')

  // Situação parcial (notas e frequência do ano em curso)
  let situacaoParcial: DadosTransferencia['situacao_parcial'] = undefined
  try {
    const n = await pool.query(
      `SELECT d.nome AS disciplina, ne.bimestre, ne.nota
         FROM notas_escolares ne
         LEFT JOIN disciplinas_escolares d ON d.id = ne.disciplina_id
        WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
        ORDER BY d.nome, ne.bimestre`,
      [alunoId, anoLetivo]
    )
    const f = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('presente','justificado') THEN 1 ELSE 0 END), 0)::float /
           NULLIF(COUNT(*), 0) * 100 AS pct
         FROM frequencia_diaria
        WHERE aluno_id = $1 AND data >= $2 || '-01-01' AND data <= $2 || '-12-31'`,
      [alunoId, anoLetivo]
    )

    situacaoParcial = {
      notas_por_disciplina: n.rows.map((row) => ({
        disciplina: row.disciplina,
        nota_bimestre: row.nota != null ? parseFloat(row.nota) : null,
        bimestre: row.bimestre,
      })),
      frequencia_percentual: f.rows[0]?.pct != null ? Math.round(parseFloat(f.rows[0].pct) * 10) / 10 : null,
      bimestres_concluidos: new Set(n.rows.map((r) => r.bimestre)).size,
    }
  } catch { /* tabelas podem não existir */ }

  return {
    aluno: {
      id: dados.id,
      nome: dados.nome,
      cpf: dados.cpf,
      matricula: dados.matricula,
      data_nascimento: dados.data_nascimento,
      serie: dados.serie,
      nome_pai: dados.nome_pai,
      nome_mae: dados.nome_mae,
    },
    escola_origem: {
      id: dados.escola_id,
      nome: dados.escola_nome,
      inep: dados.codigo_inep,
      endereco: dados.endereco,
    },
    escola_destino: escolaDestino,
    ano_letivo: anoLetivo,
    data_transferencia: new Date().toISOString().slice(0, 10),
    motivo,
    situacao_parcial: situacaoParcial,
  }
}

/**
 * Emite a guia/declaração de transferência.
 */
export async function emitirGuiaTransferencia(params: {
  alunoId: string
  anoLetivo: string
  motivo?: string
  escolaDestino?: { nome: string; cidade?: string }
  emitidoPor: string
  tipo?: 'guia_transferencia' | 'declaracao_transferencia'
}) {
  const dados = await coletarDadosTransferencia(
    params.alunoId,
    params.anoLetivo,
    params.motivo,
    params.escolaDestino
  )

  return emitirDocumento({
    tipo: params.tipo || 'guia_transferencia',
    alunoId: params.alunoId,
    dados: dados as unknown as Record<string, unknown>,
    emitidoPor: params.emitidoPor,
    escolaId: dados.escola_origem.id,
    escolaNome: dados.escola_origem.nome,
  })
}
