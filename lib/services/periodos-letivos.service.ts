/**
 * Service de periodos letivos — em especial a regra de derivar
 * semestres a partir dos 4 bimestres cadastrados.
 *
 * Logica de juncao:
 *   1º Semestre = 1º Bimestre + 2º Bimestre (data_inicio do 1º, data_fim do 2º)
 *   2º Semestre = 3º Bimestre + 4º Bimestre (data_inicio do 3º, data_fim do 4º)
 *
 * Permite que series com regra de avaliacao 'semestral' tenham periodos
 * reais em periodos_letivos para vincular notas/frequencia/avaliacoes
 * sem mudancas no schema das tabelas filhas.
 *
 * @module services/periodos-letivos
 */

import pool from '@/database/connection'
import type { PoolClient } from 'pg'

export interface SincronizacaoResultado {
  ano_letivo: string
  acao: 'criados' | 'atualizados' | 'sem_bimestres' | 'bimestres_incompletos'
  semestres?: Array<{ numero: number; data_inicio: string; data_fim: string }>
  mensagem?: string
}

type Executor = Pick<PoolClient, 'query'>

/**
 * Cria ou atualiza os 2 semestres derivados dos 4 bimestres do ano letivo.
 * Idempotente: pode ser chamado quantas vezes for necessario.
 *
 * Aceita opcionalmente um `client` para participar de transacoes em curso.
 */
export async function sincronizarSemestres(
  anoLetivo: string,
  client?: Executor,
): Promise<SincronizacaoResultado> {
  const exec: Executor = client ?? pool

  const bims = await exec.query(
    `SELECT numero, data_inicio, data_fim
       FROM periodos_letivos
      WHERE ano_letivo = $1 AND tipo = 'bimestre' AND ativo = true
      ORDER BY numero`,
    [anoLetivo],
  )

  if (bims.rows.length === 0) {
    return { ano_letivo: anoLetivo, acao: 'sem_bimestres', mensagem: 'Nenhum bimestre ativo neste ano letivo' }
  }
  if (bims.rows.length !== 4) {
    return {
      ano_letivo: anoLetivo,
      acao: 'bimestres_incompletos',
      mensagem: `Sao necessarios 4 bimestres ativos para derivar 2 semestres (encontrados: ${bims.rows.length})`,
    }
  }

  const datas = bims.rows.map(r => ({
    numero: Number(r.numero),
    data_inicio: r.data_inicio,
    data_fim: r.data_fim,
  })).sort((a, b) => a.numero - b.numero)

  // 1º Semestre = 1º Bim..2º Bim, 2º Semestre = 3º Bim..4º Bim
  const semestres = [
    { numero: 1, nome: '1º Semestre', data_inicio: datas[0].data_inicio, data_fim: datas[1].data_fim },
    { numero: 2, nome: '2º Semestre', data_inicio: datas[2].data_inicio, data_fim: datas[3].data_fim },
  ]

  // UPSERT — UNIQUE em (tipo, numero, ano_letivo)
  let inseridos = 0
  let atualizados = 0
  for (const s of semestres) {
    const r = await exec.query(
      `INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo)
         VALUES ($1, 'semestre', $2, $3, $4, $5, true)
       ON CONFLICT (tipo, numero, ano_letivo)
       DO UPDATE SET data_inicio = EXCLUDED.data_inicio,
                     data_fim    = EXCLUDED.data_fim,
                     nome        = EXCLUDED.nome,
                     ativo       = true,
                     atualizado_em = NOW()
       RETURNING (xmax = 0) AS inserido`,
      [s.nome, s.numero, anoLetivo, s.data_inicio, s.data_fim],
    )
    if (r.rows[0]?.inserido) inseridos++
    else atualizados++
  }

  return {
    ano_letivo: anoLetivo,
    acao: inseridos > 0 ? 'criados' : 'atualizados',
    semestres: semestres.map(s => ({ numero: s.numero, data_inicio: s.data_inicio, data_fim: s.data_fim })),
    mensagem: inseridos > 0
      ? `${inseridos} semestre(s) criado(s), ${atualizados} atualizado(s)`
      : `${atualizados} semestre(s) atualizado(s)`,
  }
}
