/**
 * KPIs de programas federais: PNAE, PNATE, PDDE e ordens de serviço.
 *
 * @module services/kpis-semed/programas
 */

import pool from '@/database/connection'
import { reportarErroSilencioso } from '@/lib/observabilidade/capturar-erro-silencioso'
import { poloDoUsuario, type KpisProgramas, type UsuarioEscopo } from './types'

export async function obterKpisProgramas(anoLetivo: string, usuario?: UsuarioEscopo): Promise<KpisProgramas> {
  // PNAE: se o ano selecionado for o atual, mostra apenas o mes vigente
  // (intencao original do KPI: "refeicoes_mes"). Para anos passados, agrega
  // o ano inteiro — assim historico nao some.
  // Para usuários 'polo', todas as agregações são restritas às escolas do polo.
  const polo = poloDoUsuario(usuario)
  const anoAtual = new Date().getFullYear()
  const anoInt = parseInt(anoLetivo, 10)
  const mesAtual = new Date().getMonth() + 1

  const pnaeParams: unknown[] = anoInt === anoAtual ? [anoInt, mesAtual] : [anoInt]
  let pnaeEscolaFiltro = ''
  if (polo) {
    pnaeParams.push(polo)
    pnaeEscolaFiltro = ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${pnaeParams.length})`
  }
  const pnae = anoInt === anoAtual
    ? await pool.query(
        `SELECT COALESCE(SUM(qtd_alunos), 0) AS total
           FROM pnae_atendimentos_diarios
          WHERE EXTRACT(YEAR FROM data_atendimento) = $1
            AND EXTRACT(MONTH FROM data_atendimento) = $2${pnaeEscolaFiltro}`,
        pnaeParams
      ).catch((error) => {
        reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisProgramas/pnae' })
        return { rows: [{ total: 0 }] }
      })
    : await pool.query(
        `SELECT COALESCE(SUM(qtd_alunos), 0) AS total
           FROM pnae_atendimentos_diarios
          WHERE EXTRACT(YEAR FROM data_atendimento) = $1${pnaeEscolaFiltro}`,
        pnaeParams
      ).catch((error) => {
        reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisProgramas/pnae' })
        return { rows: [{ total: 0 }] }
      })

  const pnateParams: unknown[] = []
  let pnateEscolaFiltro = ''
  if (polo) {
    pnateParams.push(polo)
    pnateEscolaFiltro = ` AND aluno_id IN (SELECT id FROM alunos WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${pnateParams.length}))`
  }
  const pnate = await pool.query(
    `SELECT COUNT(DISTINCT aluno_id) AS total
       FROM pnate_alunos_rotas WHERE ativo = TRUE${pnateEscolaFiltro}`,
    pnateParams
  ).catch((error) => {
    reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisProgramas/pnate' })
    return { rows: [{ total: 0 }] }
  })

  const pddeParams: unknown[] = [anoLetivo]
  let pddeEscolaFiltro = ''
  if (polo) {
    pddeParams.push(polo)
    pddeEscolaFiltro = ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${pddeParams.length})`
  }
  const pdde = await pool.query(
    `SELECT
       SUM(valor_recebido) AS recebido,
       SUM(valor_executado) AS executado
       FROM pdde_saldos WHERE ano_letivo = $1${pddeEscolaFiltro}`,
    pddeParams
  ).catch((error) => {
    reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisProgramas/pdde' })
    return { rows: [{}] }
  })

  const pddeRow = pdde.rows[0] || {}
  const pddePct = pddeRow.recebido && parseFloat(pddeRow.recebido) > 0
    ? Math.round((parseFloat(pddeRow.executado || '0') / parseFloat(pddeRow.recebido)) * 1000) / 10
    : null

  const osParams: unknown[] = []
  let osEscolaFiltro = ''
  if (polo) {
    osParams.push(polo)
    osEscolaFiltro = ` WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${osParams.length})`
  }
  const os = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('concluida','cancelada')) AS abertas,
       COUNT(*) FILTER (WHERE status NOT IN ('concluida','cancelada') AND prioridade = 'urgente') AS urgentes
       FROM ordens_servico${osEscolaFiltro}`,
    osParams
  ).catch((error) => {
    reportarErroSilencioso(error, { origem: 'kpis-semed', descricao: 'obterKpisProgramas/ordens_servico' })
    return { rows: [{ abertas: 0, urgentes: 0 }] }
  })

  return {
    pnae_refeicoes_mes: parseInt(pnae.rows[0]?.total || '0', 10),
    pnate_alunos_atendidos: parseInt(pnate.rows[0]?.total || '0', 10),
    pdde_executado_pct: pddePct,
    ordens_servico_abertas: parseInt(os.rows[0]?.abertas || '0', 10),
    ordens_servico_urgentes: parseInt(os.rows[0]?.urgentes || '0', 10),
  }
}
