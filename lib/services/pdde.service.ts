/**
 * Service PDDE — Programa Dinheiro Direto na Escola (versão básica).
 *
 * @module services/pdde
 */

import pool from '@/database/connection'

export interface Orcamento {
  id?: string
  escola_id: string
  ano_letivo: string
  tipo_verba_id: string
  valor_recebido: number
  data_credito: string
  conta_bancaria?: string
  observacoes?: string
  criado_por?: string
}

export interface Despesa {
  id?: string
  orcamento_id: string
  data_despesa: string
  descricao: string
  fornecedor?: string
  fornecedor_cnpj?: string
  valor: number
  categoria?: string
  numero_nota?: string
  data_nota?: string
  nota_url?: string
  forma_pagamento?: string
  status?: 'registrada' | 'paga' | 'cancelada'
  observacoes?: string
  criado_por?: string
}

// ============================================================================
// ORÇAMENTOS
// ============================================================================

export async function registrarOrcamento(o: Orcamento): Promise<string> {
  const r = await pool.query(
    `INSERT INTO pdde_orcamentos
      (escola_id, ano_letivo, tipo_verba_id, valor_recebido,
       data_credito, conta_bancaria, observacoes, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      o.escola_id, o.ano_letivo, o.tipo_verba_id, o.valor_recebido,
      o.data_credito, o.conta_bancaria || null,
      o.observacoes || null, o.criado_por || null,
    ]
  )
  return r.rows[0].id
}

export async function listarOrcamentosEscola(escolaId: string, anoLetivo?: string) {
  const params: unknown[] = [escolaId]
  let extra = ''
  if (anoLetivo) { params.push(anoLetivo); extra = ` AND ano_letivo = $2` }

  const r = await pool.query(
    `SELECT o.*, tv.nome AS verba_nome, tv.natureza
       FROM pdde_orcamentos o
       INNER JOIN pdde_tipos_verba tv ON tv.id = o.tipo_verba_id
      WHERE o.escola_id = $1 ${extra}
      ORDER BY o.data_credito DESC`,
    params
  )
  return r.rows
}

// ============================================================================
// DESPESAS
// ============================================================================

/**
 * Registra despesa com proteção contra race condition.
 *
 * Bloqueia o orçamento (FOR UPDATE) antes de validar saldo, garantindo que
 * dois pedidos simultâneos não possam ambos passar pela validação e estourar
 * o saldo. A despesa só é gravada se houver saldo dentro da mesma transação.
 */
export async function registrarDespesa(d: Despesa): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1) Trava o orçamento — concorrentes esperam até este COMMIT/ROLLBACK
    const orcR = await client.query(
      `SELECT id, valor_recebido FROM pdde_orcamentos WHERE id = $1 FOR UPDATE`,
      [d.orcamento_id]
    )
    if (!orcR.rows[0]) {
      throw new Error('Orçamento não encontrado')
    }

    // 2) Recalcula executado considerando despesas não-canceladas
    const exeR = await client.query(
      `SELECT COALESCE(SUM(valor), 0)::numeric AS executado
         FROM pdde_despesas
        WHERE orcamento_id = $1 AND status != 'cancelada'`,
      [d.orcamento_id]
    )

    const valorRecebido = parseFloat(orcR.rows[0].valor_recebido)
    const executado = parseFloat(exeR.rows[0].executado)
    const saldo = valorRecebido - executado

    if (d.valor > saldo) {
      throw new Error(
        `Saldo insuficiente. Disponível: R$ ${saldo.toFixed(2)}, despesa: R$ ${d.valor.toFixed(2)}`
      )
    }

    // 3) Insere despesa
    const r = await client.query(
      `INSERT INTO pdde_despesas
        (orcamento_id, data_despesa, descricao, fornecedor, fornecedor_cnpj,
         valor, categoria, numero_nota, data_nota, nota_url,
         forma_pagamento, status, observacoes, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        d.orcamento_id, d.data_despesa, d.descricao,
        d.fornecedor || null,
        d.fornecedor_cnpj ? d.fornecedor_cnpj.replace(/\D/g, '') : null,
        d.valor, d.categoria || null,
        d.numero_nota || null, d.data_nota || null, d.nota_url || null,
        d.forma_pagamento || null, d.status || 'registrada',
        d.observacoes || null, d.criado_por || null,
      ]
    )

    await client.query('COMMIT')
    return r.rows[0].id
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function listarDespesas(orcamentoId: string) {
  const r = await pool.query(
    `SELECT * FROM pdde_despesas WHERE orcamento_id = $1 ORDER BY data_despesa DESC`,
    [orcamentoId]
  )
  return r.rows
}

export async function consultarSaldos(escolaId: string, anoLetivo: string) {
  const r = await pool.query(
    `SELECT * FROM pdde_saldos
      WHERE escola_id = $1 AND ano_letivo = $2
      ORDER BY natureza, verba_nome`,
    [escolaId, anoLetivo]
  )
  const total_recebido = r.rows.reduce((s, x) => s + parseFloat(x.valor_recebido), 0)
  const total_executado = r.rows.reduce((s, x) => s + parseFloat(x.valor_executado), 0)
  const saldo_total = total_recebido - total_executado

  return {
    orcamentos: r.rows,
    resumo: {
      total_recebido: Math.round(total_recebido * 100) / 100,
      total_executado: Math.round(total_executado * 100) / 100,
      saldo_total: Math.round(saldo_total * 100) / 100,
      execucao_percentual: total_recebido > 0
        ? Math.round((total_executado / total_recebido) * 1000) / 10
        : 0,
    },
  }
}

export async function listarTiposVerba() {
  const r = await pool.query(`SELECT * FROM pdde_tipos_verba ORDER BY id`)
  return r.rows
}
