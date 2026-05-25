/**
 * Service Biblioteca — Acervo + Empréstimos + Reservas.
 *
 * @module services/biblioteca
 */

import pool from '@/database/connection'

export interface Item {
  id?: string
  isbn?: string
  titulo: string
  autor?: string
  editora?: string
  edicao?: string
  ano_publicacao?: number
  classificacao?: string
  categoria?: string
  genero?: string
  escola_id?: string
  qtd_total?: number
  qtd_disponivel?: number
  estante?: string
  prateleira?: string
  observacoes?: string
}

const DIAS_EMPRESTIMO_PADRAO = 14
const DIAS_RENOVACAO = 7

export async function cadastrarItem(i: Item): Promise<string> {
  const r = await pool.query(
    `INSERT INTO biblioteca_acervo
      (isbn, titulo, autor, editora, edicao, ano_publicacao,
       classificacao, categoria, genero, escola_id,
       qtd_total, qtd_disponivel, estante, prateleira, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`,
    [
      i.isbn || null, i.titulo, i.autor || null,
      i.editora || null, i.edicao || null, i.ano_publicacao || null,
      i.classificacao || null, i.categoria || null, i.genero || null,
      i.escola_id || null,
      i.qtd_total ?? 1, i.qtd_disponivel ?? (i.qtd_total ?? 1),
      i.estante || null, i.prateleira || null, i.observacoes || null,
    ]
  )
  return r.rows[0].id
}

export async function buscarAcervo(params: {
  escolaId?: string
  busca?: string
  categoria?: string
  apenasDisponiveis?: boolean
  limite?: number
}) {
  const conds: string[] = ['ativo = TRUE']
  const queryParams: unknown[] = []
  let i = 1

  if (params.escolaId) { queryParams.push(params.escolaId); conds.push(`escola_id = $${i++}`) }
  if (params.categoria) { queryParams.push(params.categoria); conds.push(`categoria = $${i++}`) }
  if (params.apenasDisponiveis) conds.push('qtd_disponivel > 0')
  if (params.busca && params.busca.length > 2) {
    queryParams.push(params.busca)
    conds.push(`(titulo ILIKE '%' || $${i} || '%' OR autor ILIKE '%' || $${i} || '%' OR isbn = $${i})`)
    i++
  }

  const limite = Math.min(params.limite ?? 50, 200)
  queryParams.push(limite)

  const r = await pool.query(
    `SELECT * FROM biblioteca_acervo
      WHERE ${conds.join(' AND ')}
      ORDER BY titulo
      LIMIT $${i}`,
    queryParams
  )
  return r.rows
}

// ============================================================================
// EMPRÉSTIMOS
// ============================================================================

export async function registrarEmprestimo(params: {
  acervo_id: string
  aluno_id?: string
  servidor_id?: string
  dias_emprestimo?: number
  registrado_por: string
}): Promise<string> {
  if ((!params.aluno_id && !params.servidor_id) || (params.aluno_id && params.servidor_id)) {
    throw new Error('Informe exatamente um: aluno_id OU servidor_id')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Verifica disponibilidade
    const acR = await client.query(
      `SELECT qtd_disponivel FROM biblioteca_acervo
        WHERE id = $1 AND ativo = TRUE FOR UPDATE`,
      [params.acervo_id]
    )
    if (!acR.rows[0] || acR.rows[0].qtd_disponivel <= 0) {
      throw new Error('Item indisponível para empréstimo')
    }

    const dias = params.dias_emprestimo ?? DIAS_EMPRESTIMO_PADRAO
    const dataDevPrevista = new Date()
    dataDevPrevista.setDate(dataDevPrevista.getDate() + dias)

    const empR = await client.query(
      `INSERT INTO biblioteca_emprestimos
        (acervo_id, aluno_id, servidor_id, registrado_por,
         data_devolucao_prevista)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [
        params.acervo_id, params.aluno_id || null, params.servidor_id || null,
        params.registrado_por,
        dataDevPrevista.toISOString().slice(0, 10),
      ]
    )

    await client.query(
      `UPDATE biblioteca_acervo
          SET qtd_disponivel = qtd_disponivel - 1, atualizado_em = NOW()
        WHERE id = $1`,
      [params.acervo_id]
    )

    await client.query('COMMIT')
    return empR.rows[0].id
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function registrarDevolucao(params: {
  emprestimo_id: string
  status?: 'devolvido' | 'extraviado' | 'danificado'
  observacoes?: string
}): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const empR = await client.query(
      `SELECT acervo_id, status FROM biblioteca_emprestimos
        WHERE id = $1 FOR UPDATE`,
      [params.emprestimo_id]
    )
    const emp = empR.rows[0]
    if (!emp) throw new Error('Empréstimo não encontrado')
    if (!['emprestado', 'atrasado'].includes(emp.status)) {
      throw new Error('Empréstimo já finalizado')
    }

    const status = params.status ?? 'devolvido'

    await client.query(
      `UPDATE biblioteca_emprestimos
          SET status = $2, data_devolucao_real = CURRENT_DATE,
              observacoes_devolucao = $3
        WHERE id = $1`,
      [params.emprestimo_id, status, params.observacoes || null]
    )

    // Se devolvido normalmente, incrementa estoque. Se extraviado/danificado, decrementa qtd_total também.
    if (status === 'devolvido') {
      await client.query(
        `UPDATE biblioteca_acervo
            SET qtd_disponivel = qtd_disponivel + 1, atualizado_em = NOW()
          WHERE id = $1`,
        [emp.acervo_id]
      )
    } else {
      // Extraviado/danificado: total e disponivel ja estao consistentes (disponivel ja foi decrementado no emprestimo, agora decrementa total)
      await client.query(
        `UPDATE biblioteca_acervo
            SET qtd_total = GREATEST(0, qtd_total - 1), atualizado_em = NOW()
          WHERE id = $1`,
        [emp.acervo_id]
      )
    }

    await client.query('COMMIT')
    return true
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function renovarEmprestimo(emprestimoId: string): Promise<boolean> {
  const r = await pool.query(
    `UPDATE biblioteca_emprestimos
       SET data_devolucao_prevista = data_devolucao_prevista + INTERVAL '${DIAS_RENOVACAO} days',
           renovacoes = renovacoes + 1
     WHERE id = $1 AND status = 'emprestado' AND renovacoes < 2`,
    [emprestimoId]
  )
  return (r.rowCount ?? 0) > 0
}

export async function listarEmprestimosAtivos(params: {
  escolaId?: string
  atrasados?: boolean
  pessoa_id?: string
}) {
  const conds: string[] = [`e.status = 'emprestado'`]
  const queryParams: unknown[] = []
  let i = 1

  if (params.escolaId) {
    queryParams.push(params.escolaId)
    conds.push(`a.escola_id = $${i++}`)
  }
  if (params.atrasados) {
    conds.push(`e.data_devolucao_prevista < CURRENT_DATE`)
  }
  if (params.pessoa_id) {
    queryParams.push(params.pessoa_id)
    conds.push(`(e.aluno_id = $${i} OR e.servidor_id = $${i})`)
    i++
  }

  const r = await pool.query(
    `SELECT e.id, e.data_emprestimo, e.data_devolucao_prevista, e.renovacoes,
            (e.data_devolucao_prevista < CURRENT_DATE) AS atrasado,
            a.titulo, a.autor,
            al.nome AS aluno_nome, sv.nome AS servidor_nome
       FROM biblioteca_emprestimos e
       INNER JOIN biblioteca_acervo a ON a.id = e.acervo_id
       LEFT JOIN alunos al ON al.id = e.aluno_id
       LEFT JOIN servidores sv ON sv.id = e.servidor_id
      WHERE ${conds.join(' AND ')}
      ORDER BY e.data_devolucao_prevista`,
    queryParams
  )
  return r.rows
}

export async function reservarItem(params: {
  acervo_id: string
  aluno_id?: string
  servidor_id?: string
}): Promise<string> {
  if ((!params.aluno_id && !params.servidor_id) || (params.aluno_id && params.servidor_id)) {
    throw new Error('Informe exatamente um: aluno_id OU servidor_id')
  }
  const r = await pool.query(
    `INSERT INTO biblioteca_reservas (acervo_id, aluno_id, servidor_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [params.acervo_id, params.aluno_id || null, params.servidor_id || null]
  )
  return r.rows[0].id
}
