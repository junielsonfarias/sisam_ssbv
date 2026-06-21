/**
 * Rede de seguranca da governanca ETL -> Gestor (auditoria continua do gate).
 *
 * O gate de habilitacao (config.ts) garante, em TEMPO DE IMPORTACAO, que o ETL
 * do Sisam nao crie dado mestre indevido. Esta auditoria e a contraparte
 * CONTINUA: ela inspeciona o ESTADO ATUAL do banco e prova, a qualquer momento,
 * que nenhum modulo externo criou mestre indevidamente em producao.
 *
 * Sinais de alerta que ela levanta:
 *   1. Linhas mestre com origem='sisam_etl' ainda NAO assumidas pelo Gestor
 *      (turmas/alunos criados em modo transicao que ficaram pendentes de
 *      regularizacao — `mestre_criado_etl` no estado vivo).
 *   2. O gate saiu do modo conservador 'estrito' (ETL_GATE_MESTRE='transicao'):
 *      o ambiente esta permitindo criacao residual de mestre pelo ETL.
 *
 * Nao corrige nada — apenas conta, classifica e devolve um veredito. A correcao
 * (assumir no Gestor) fica no endpoint de divergencias da importacao.
 *
 * @module services/importacao/auditoria-governanca
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import {
  ORIGEM_GESTOR,
  ORIGEM_SISAM_ETL,
  type EntidadeMestre,
} from '@/lib/services/gestor/mestre.service'
import { getEtlGateMode, type EtlGateMode } from './config'

const log = createLogger('AuditoriaGovernanca')

/** Tabelas de cadastro mestre auditadas (ordem de exibicao). */
const TABELAS_MESTRE: Record<EntidadeMestre, string> = {
  polo: 'polos',
  escola: 'escolas',
  turma: 'turmas',
  aluno: 'alunos',
}

/** Contagem por origem de uma unica tabela mestre. */
export interface ContagemPorOrigem {
  entidade: EntidadeMestre
  tabela: string
  total: number
  gestor: number
  sisam_etl: number
  seed: number
  outros: number
  /** Linhas origem='sisam_etl' (criadas pelo ETL e ainda nao assumidas). */
  etl_nao_assumido: number
}

/** Resultado completo da auditoria de governanca do gate. */
export interface AuditoriaGovernancaResultado {
  /** Modo do gate no ambiente atual ('estrito' = conservador). */
  gateMode: EtlGateMode
  /** True quando o gate NAO esta no modo conservador 'estrito'. */
  gateForaDoEstrito: boolean
  /** Contagem por origem em cada tabela mestre. */
  contagens: ContagemPorOrigem[]
  /** Total de linhas mestre origem='sisam_etl' nao assumidas (todas as tabelas). */
  totalEtlNaoAssumido: number
  /** True quando ha qualquer sinal de alerta (etl nao assumido > 0 OU gate fora do estrito). */
  alerta: boolean
  /** Mensagens legiveis de cada alerta levantado (vazio quando tudo OK). */
  alertas: string[]
  /** Momento da auditoria (ISO). */
  verificadoEm: string
}

/**
 * Conta as linhas de uma tabela mestre agrupadas por `origem`.
 *
 * Query parametrizada e defensiva: agrupa por origem e classifica em buckets
 * conhecidos (gestor/sisam_etl/seed) + `outros` (qualquer valor inesperado, ex.:
 * NULL legado que escapou do DEFAULT). Tabelas sem a coluna `origem` (ambientes
 * que nao aplicaram a migration) sao reportadas com erro, nao derrubam a auditoria.
 */
async function contarTabela(
  entidade: EntidadeMestre,
  tabela: string
): Promise<ContagemPorOrigem> {
  const base: ContagemPorOrigem = {
    entidade,
    tabela,
    total: 0,
    gestor: 0,
    sisam_etl: 0,
    seed: 0,
    outros: 0,
    etl_nao_assumido: 0,
  }

  try {
    const result = await pool.query(
      `SELECT origem, COUNT(*)::int AS total
       FROM ${tabela}
       GROUP BY origem`
    )

    for (const row of result.rows as Array<{ origem: string | null; total: number }>) {
      const qtd = Number(row.total) || 0
      base.total += qtd
      switch (row.origem) {
        case ORIGEM_GESTOR:
          base.gestor += qtd
          break
        case ORIGEM_SISAM_ETL:
          base.sisam_etl += qtd
          break
        case 'seed':
          base.seed += qtd
          break
        default:
          base.outros += qtd
      }
    }

    // Mestre criado pelo ETL = exatamente o que esta marcado origem='sisam_etl'.
    base.etl_nao_assumido = base.sisam_etl
  } catch (error) {
    log.error(`Falha ao auditar origem da tabela ${tabela}:`, error)
  }

  return base
}

/**
 * Executa a auditoria de governanca do gate ETL -> Gestor.
 *
 * Conta por origem em polos/escolas/turmas/alunos, inspeciona o modo do gate e
 * monta o veredito (`alerta` + `alertas[]`). Pensada para rodar tanto sob demanda
 * (endpoint) quanto periodicamente (job/cron), funcionando como prova continua de
 * que nenhum modulo externo criou mestre indevido em producao.
 *
 * Usado por: GET /api/admin/importacoes/auditoria-governanca
 */
export async function auditarGovernancaGate(): Promise<AuditoriaGovernancaResultado> {
  const gateMode = getEtlGateMode()
  const gateForaDoEstrito = gateMode !== 'estrito'

  const entidades = Object.entries(TABELAS_MESTRE) as Array<[EntidadeMestre, string]>
  const contagens = await Promise.all(
    entidades.map(([entidade, tabela]) => contarTabela(entidade, tabela))
  )

  const totalEtlNaoAssumido = contagens.reduce((acc, c) => acc + c.etl_nao_assumido, 0)

  const alertas: string[] = []
  if (totalEtlNaoAssumido > 0) {
    const detalhe = contagens
      .filter((c) => c.etl_nao_assumido > 0)
      .map((c) => `${c.entidade}: ${c.etl_nao_assumido}`)
      .join(', ')
    alertas.push(
      `${totalEtlNaoAssumido} registro(s) mestre origem='sisam_etl' nao assumido(s) pelo Gestor (${detalhe})`
    )
  }
  if (gateForaDoEstrito) {
    alertas.push(
      `Gate fora do modo conservador: ETL_GATE_MESTRE='${gateMode}' permite criacao residual de mestre pelo ETL`
    )
  }

  return {
    gateMode,
    gateForaDoEstrito,
    contagens,
    totalEtlNaoAssumido,
    alerta: alertas.length > 0,
    alertas,
    verificadoEm: new Date().toISOString(),
  }
}
