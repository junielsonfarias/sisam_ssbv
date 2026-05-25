/**
 * Service PNLD — Programa Nacional do Livro e Material Didático.
 *
 * @module services/pnld
 */

import pool from '@/database/connection'

export type TipoObra = 'livro_aluno' | 'manual_professor' | 'caderno_atividades'
  | 'literatura' | 'dicionario' | 'paradidatico' | 'outro'

export type StatusDistribuicao = 'emprestado' | 'devolvido' | 'extraviado' | 'danificado'

export interface Titulo {
  id?: string
  isbn?: string
  codigo_pnld?: string
  titulo: string
  autor?: string
  editora?: string
  edicao?: string
  ano_pnld: number
  componente_id?: string
  ano_escolar?: number
  tipo_obra: TipoObra
  observacoes?: string
}

export async function cadastrarTitulo(t: Titulo): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pnld_titulos
      (isbn, codigo_pnld, titulo, autor, editora, edicao, ano_pnld,
       componente_id, ano_escolar, tipo_obra, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      t.isbn || null, t.codigo_pnld || null, t.titulo,
      t.autor || null, t.editora || null, t.edicao || null,
      t.ano_pnld, t.componente_id || null, t.ano_escolar || null,
      t.tipo_obra, t.observacoes || null,
    ]
  )
  return r.rows[0].id
}

export async function buscarTitulos(params: {
  busca?: string
  componenteId?: string
  anoEscolar?: number
  anoPnld?: number
  limite?: number
}) {
  const conds: string[] = []
  const queryParams: unknown[] = []
  let i = 1

  if (params.busca && params.busca.length > 2) {
    queryParams.push(params.busca)
    conds.push(`(titulo ILIKE '%' || $${i} || '%' OR autor ILIKE '%' || $${i} || '%' OR isbn = $${i})`)
    i++
  }
  if (params.componenteId) { queryParams.push(params.componenteId); conds.push(`componente_id = $${i++}`) }
  if (params.anoEscolar) { queryParams.push(params.anoEscolar); conds.push(`ano_escolar = $${i++}`) }
  if (params.anoPnld) { queryParams.push(params.anoPnld); conds.push(`ano_pnld = $${i++}`) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  queryParams.push(params.limite || 100)

  const r = await pool.query(
    `SELECT * FROM pnld_titulos ${where} ORDER BY titulo LIMIT $${i}`,
    queryParams
  )
  return r.rows
}

// ============================================================================
// ESTOQUE
// ============================================================================

export async function atualizarEstoque(params: {
  escola_id: string
  titulo_id: string
  ano_letivo: string
  qtd_total: number
  qtd_disponivel?: number
  qtd_danificada?: number
  qtd_extraviada?: number
}) {
  const qtd_disp = params.qtd_disponivel ?? params.qtd_total
  await pool.query(
    `INSERT INTO pnld_estoque_escola
       (escola_id, titulo_id, ano_letivo, qtd_total, qtd_disponivel,
        qtd_danificada, qtd_extraviada)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (escola_id, titulo_id, ano_letivo) DO UPDATE
       SET qtd_total = EXCLUDED.qtd_total,
           qtd_disponivel = EXCLUDED.qtd_disponivel,
           qtd_danificada = EXCLUDED.qtd_danificada,
           qtd_extraviada = EXCLUDED.qtd_extraviada,
           atualizado_em = NOW()`,
    [
      params.escola_id, params.titulo_id, params.ano_letivo,
      params.qtd_total, qtd_disp,
      params.qtd_danificada || 0, params.qtd_extraviada || 0,
    ]
  )
}

export async function listarEstoqueEscola(escolaId: string, anoLetivo: string) {
  const r = await pool.query(
    `SELECT e.*, t.titulo, t.autor, t.componente_id, t.ano_escolar, t.tipo_obra
       FROM pnld_estoque_escola e
       INNER JOIN pnld_titulos t ON t.id = e.titulo_id
      WHERE e.escola_id = $1 AND e.ano_letivo = $2
      ORDER BY t.componente_id NULLS LAST, t.ano_escolar NULLS LAST, t.titulo`,
    [escolaId, anoLetivo]
  )
  return r.rows
}

// ============================================================================
// DISTRIBUIÇÃO
// ============================================================================

export async function registrarEntrega(params: {
  aluno_id: string
  titulo_id: string
  ano_letivo: string
  numero_tombamento?: string
  data_devolucao_prevista?: string
  entregue_por: string
}): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Verifica disponibilidade
    const escolaR = await client.query(
      `SELECT escola_id FROM alunos WHERE id = $1`,
      [params.aluno_id]
    )
    const escolaId = escolaR.rows[0]?.escola_id
    if (!escolaId) throw new Error('Aluno não encontrado ou sem escola vinculada')

    const estR = await client.query(
      `SELECT qtd_disponivel FROM pnld_estoque_escola
        WHERE escola_id = $1 AND titulo_id = $2 AND ano_letivo = $3
        FOR UPDATE`,
      [escolaId, params.titulo_id, params.ano_letivo]
    )
    if (!estR.rows[0] || estR.rows[0].qtd_disponivel <= 0) {
      throw new Error('Livro indisponível no estoque desta escola')
    }

    // Registra entrega
    const distR = await client.query(
      `INSERT INTO pnld_distribuicao_aluno
        (aluno_id, titulo_id, ano_letivo, numero_tombamento,
         data_devolucao_prevista, entregue_por)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [
        params.aluno_id, params.titulo_id, params.ano_letivo,
        params.numero_tombamento || null,
        params.data_devolucao_prevista || null,
        params.entregue_por,
      ]
    )

    // Decrementa estoque
    await client.query(
      `UPDATE pnld_estoque_escola
          SET qtd_disponivel = qtd_disponivel - 1,
              qtd_emprestada = qtd_emprestada + 1,
              atualizado_em = NOW()
        WHERE escola_id = $1 AND titulo_id = $2 AND ano_letivo = $3`,
      [escolaId, params.titulo_id, params.ano_letivo]
    )

    await client.query('COMMIT')
    return distR.rows[0].id
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function registrarDevolucao(params: {
  distribuicao_id: string
  status: 'devolvido' | 'extraviado' | 'danificado'
  observacoes?: string
  recebido_por: string
}): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const distR = await client.query(
      `SELECT a.escola_id, d.titulo_id, d.ano_letivo, d.status AS status_atual
         FROM pnld_distribuicao_aluno d
         INNER JOIN alunos a ON a.id = d.aluno_id
        WHERE d.id = $1
        FOR UPDATE`,
      [params.distribuicao_id]
    )
    const d = distR.rows[0]
    if (!d) throw new Error('Distribuição não encontrada')
    if (d.status_atual !== 'emprestado') {
      throw new Error('Distribuição já foi finalizada')
    }

    // Atualiza distribuição
    await client.query(
      `UPDATE pnld_distribuicao_aluno
          SET status = $2, data_devolucao_real = CURRENT_DATE,
              observacoes_devolucao = $3, recebido_por = $4
        WHERE id = $1`,
      [params.distribuicao_id, params.status, params.observacoes || null, params.recebido_por]
    )

    // Reverte estoque conforme estado
    let updateEstoque: string
    if (params.status === 'devolvido') {
      updateEstoque = `qtd_emprestada = qtd_emprestada - 1, qtd_disponivel = qtd_disponivel + 1`
    } else if (params.status === 'danificado') {
      updateEstoque = `qtd_emprestada = qtd_emprestada - 1, qtd_danificada = qtd_danificada + 1`
    } else {
      updateEstoque = `qtd_emprestada = qtd_emprestada - 1, qtd_extraviada = qtd_extraviada + 1`
    }

    await client.query(
      `UPDATE pnld_estoque_escola
          SET ${updateEstoque}, atualizado_em = NOW()
        WHERE escola_id = $1 AND titulo_id = $2 AND ano_letivo = $3`,
      [d.escola_id, d.titulo_id, d.ano_letivo]
    )

    await client.query('COMMIT')
    return true
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function listarDistribuicoesAluno(alunoId: string, anoLetivo?: string) {
  const params: unknown[] = [alunoId]
  let extra = ''
  if (anoLetivo) { params.push(anoLetivo); extra = ` AND d.ano_letivo = $2` }

  const r = await pool.query(
    `SELECT d.*, t.titulo, t.autor, t.componente_id, t.tipo_obra
       FROM pnld_distribuicao_aluno d
       INNER JOIN pnld_titulos t ON t.id = d.titulo_id
      WHERE d.aluno_id = $1 ${extra}
      ORDER BY d.criado_em DESC`,
    params
  )
  return r.rows
}
