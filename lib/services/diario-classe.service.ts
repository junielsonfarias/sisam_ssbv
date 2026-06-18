/**
 * Service do Diário de Classe.
 *
 * Encapsula CRUD e regras: vinculação BNCC, publicação, observações individuais.
 *
 * @module services/diario-classe
 */

import pool from '@/database/connection'
import { vincularHabilidades, listarHabilidadesVinculadas } from './bncc.service'

export interface AtividadeDiario {
  tipo: string
  descricao: string
  duracao_min?: number
}

export interface RegistroDiario {
  id?: string
  professor_id: string
  turma_id: string
  disciplina_id?: string | null
  data_aula: string  // ISO date YYYY-MM-DD
  conteudo: string
  metodologia?: string | null
  recursos_didaticos?: string | null
  observacoes?: string | null
  atividades?: AtividadeDiario[]
  observacoes_individuais?: Record<string, string>
  quantidade_aulas?: number
  status?: 'rascunho' | 'publicado' | 'assinado'
  habilidades_bncc?: string[]
}

export interface FiltrosDiario {
  turmaId?: string
  professorId?: string
  disciplinaId?: string
  dataInicio?: string
  dataFim?: string
  status?: string
  limite?: number
  offset?: number
}

export async function criarRegistroDiario(reg: RegistroDiario): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO diario_classe (
        professor_id, turma_id, disciplina_id, data_aula,
        conteudo, metodologia, recursos_didaticos, observacoes,
        atividades, observacoes_individuais, quantidade_aulas, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)
      RETURNING id`,
      [
        reg.professor_id,
        reg.turma_id,
        reg.disciplina_id || null,
        reg.data_aula,
        reg.conteudo,
        reg.metodologia || null,
        reg.recursos_didaticos || null,
        reg.observacoes || null,
        JSON.stringify(reg.atividades || []),
        JSON.stringify(reg.observacoes_individuais || {}),
        reg.quantidade_aulas || 1,
        reg.status || 'rascunho',
      ]
    )

    const id = result.rows[0].id
    await client.query('COMMIT')

    // Vincula habilidades BNCC (fora da transação principal)
    if (reg.habilidades_bncc && reg.habilidades_bncc.length > 0) {
      await vincularHabilidades('planos_aula', id, reg.habilidades_bncc)
        .catch(() => {/* fallback: usa tabela própria */})
      // Vínculo na tabela específica do diário
      for (const codigo of reg.habilidades_bncc) {
        await pool.query(
          `INSERT INTO diario_classe_bncc_habilidades (diario_id, habilidade_codigo)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, codigo]
        )
      }
    }

    return id
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function atualizarRegistroDiario(
  id: string,
  reg: Partial<RegistroDiario>
): Promise<void> {
  const campos: string[] = []
  const params: unknown[] = []
  let i = 1

  const map: Record<string, unknown> = {
    conteudo: reg.conteudo,
    metodologia: reg.metodologia,
    recursos_didaticos: reg.recursos_didaticos,
    observacoes: reg.observacoes,
    quantidade_aulas: reg.quantidade_aulas,
    status: reg.status,
  }

  for (const [campo, valor] of Object.entries(map)) {
    if (valor !== undefined) {
      params.push(valor)
      campos.push(`${campo} = $${i++}`)
    }
  }

  if (reg.atividades !== undefined) {
    params.push(JSON.stringify(reg.atividades))
    campos.push(`atividades = $${i++}::jsonb`)
  }
  if (reg.observacoes_individuais !== undefined) {
    params.push(JSON.stringify(reg.observacoes_individuais))
    campos.push(`observacoes_individuais = $${i++}::jsonb`)
  }
  if (reg.status === 'publicado') {
    campos.push(`publicado_em = NOW()`)
  }

  if (campos.length === 0) return

  params.push(id)
  await pool.query(
    `UPDATE diario_classe SET ${campos.join(', ')}, atualizado_em = NOW() WHERE id = $${i}`,
    params
  )

  // Atualiza habilidades vinculadas, se fornecido
  if (reg.habilidades_bncc !== undefined) {
    await pool.query(`DELETE FROM diario_classe_bncc_habilidades WHERE diario_id = $1`, [id])
    for (const codigo of reg.habilidades_bncc) {
      await pool.query(
        `INSERT INTO diario_classe_bncc_habilidades (diario_id, habilidade_codigo) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, codigo]
      )
    }
  }
}

export async function buscarRegistroPorId(id: string) {
  const r = await pool.query(
    `SELECT d.*, t.codigo AS turma_codigo, t.nome AS turma_nome, t.escola_id,
            di.nome AS disciplina_nome
       FROM diario_classe d
       LEFT JOIN turmas t ON t.id = d.turma_id
       LEFT JOIN disciplinas_escolares di ON di.id = d.disciplina_id
      WHERE d.id = $1`,
    [id]
  )
  const reg = r.rows[0]
  if (!reg) return null

  const hab = await pool.query(
    `SELECT h.codigo, h.descricao, h.componente_id, h.ano
       FROM diario_classe_bncc_habilidades v
       INNER JOIN bncc_habilidades h ON h.codigo = v.habilidade_codigo
       WHERE v.diario_id = $1`,
    [id]
  )
  return { ...reg, habilidades_bncc: hab.rows }
}

export async function listarRegistros(filtros: FiltrosDiario) {
  const cond: string[] = []
  const params: unknown[] = []
  let i = 1

  if (filtros.turmaId) { params.push(filtros.turmaId); cond.push(`d.turma_id = $${i++}`) }
  if (filtros.professorId) { params.push(filtros.professorId); cond.push(`d.professor_id = $${i++}`) }
  if (filtros.disciplinaId) { params.push(filtros.disciplinaId); cond.push(`d.disciplina_id = $${i++}`) }
  if (filtros.dataInicio) { params.push(filtros.dataInicio); cond.push(`d.data_aula >= $${i++}`) }
  if (filtros.dataFim) { params.push(filtros.dataFim); cond.push(`d.data_aula <= $${i++}`) }
  if (filtros.status) { params.push(filtros.status); cond.push(`d.status = $${i++}`) }

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const limite = Math.min(filtros.limite ?? 50, 200)
  const offset = filtros.offset ?? 0
  params.push(limite, offset)

  const r = await pool.query(
    `SELECT d.id, d.data_aula, d.conteudo, d.status, d.quantidade_aulas,
            d.turma_id, d.disciplina_id, d.professor_id,
            t.codigo AS turma_codigo,
            di.nome AS disciplina_nome
       FROM diario_classe d
       LEFT JOIN turmas t ON t.id = d.turma_id
       LEFT JOIN disciplinas_escolares di ON di.id = d.disciplina_id
       ${where}
      ORDER BY d.data_aula DESC, d.criado_em DESC
      LIMIT $${i++} OFFSET $${i}`,
    params
  )
  return r.rows
}

export async function deletarRegistro(id: string, professorId: string): Promise<boolean> {
  const r = await pool.query(
    `DELETE FROM diario_classe
       WHERE id = $1 AND professor_id = $2 AND status = 'rascunho'`,
    [id, professorId]
  )
  return (r.rowCount ?? 0) > 0
}
