/**
 * Service — Relatório de horas AEE (Fase 4.3 do ciclo pedagógico LDB).
 *
 * Cruza os atendimentos registrados (`aee_atendimentos`) com a periodicidade
 * prevista no PEI (`aee_planos_individuais.periodicidade_horas_semanais`) para
 * apurar carga horária realizada × prevista por aluno, cobertura e presença.
 *
 * O cálculo (`calcularMetricasHoras`) é uma função PURA e testável — recebe a
 * data de referência como parâmetro para evitar dependência de fuso/relógio.
 *
 * @module services/aee-relatorio-horas
 */

import pool from '@/database/connection'

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000

/** Converte 'YYYY-MM-DD' (ou Date do PG) numa Date LOCAL ao meio-dia (sem viés de fuso). */
function parseDataLocal(valor: string | Date): Date {
  const s = typeof valor === 'string' ? valor.slice(0, 10) : valor.toISOString().slice(0, 10)
  const [ano, mes, dia] = s.split('-').map(Number)
  return new Date(ano, mes - 1, dia, 12, 0, 0, 0)
}

function arredondar1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Menor de duas datas. */
function menorData(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b
}

/** Maior de duas datas. */
function maiorData(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b
}

export interface PlanoHoras {
  /** Carga horária semanal prevista no PEI (pode ser nula = sem meta). */
  periodicidade_horas_semanais: number | null
  data_inicio: string | Date
  data_fim: string | Date | null
  ano_letivo: string
}

export interface MetricasHoras {
  /** Horas efetivamente atendidas (somente sessões presentes). */
  horas_realizadas: number
  /** Horas que deveriam ter ocorrido até a data de referência (null se PEI sem periodicidade). */
  horas_previstas: number | null
  /** % de cobertura (realizadas/previstas). null se não há meta. */
  percentual_cobertura: number | null
  /** Semanas decorridas dentro da janela considerada. */
  semanas_periodo: number
}

/**
 * Calcula horas realizadas × previstas para um plano AEE.
 *
 * Janela considerada: interseção de [data_inicio do PEI, data_fim do PEI ou fim
 * do ano letivo] com o período opcional do relatório, sempre limitada à data de
 * referência (`hoje`) — não se cobra carga horária futura.
 *
 * @param plano             dados de vigência/periodicidade do PEI
 * @param minutosRealizados soma de `duracao_minutos` das sessões PRESENTES
 * @param hoje              data de referência (injetada para testabilidade)
 * @param periodo           recorte opcional do relatório (inicio/fim 'YYYY-MM-DD')
 */
export function calcularMetricasHoras(
  plano: PlanoHoras,
  minutosRealizados: number,
  hoje: Date,
  periodo?: { inicio?: string; fim?: string }
): MetricasHoras {
  const horasRealizadas = arredondar1(minutosRealizados / 60)

  // Sem periodicidade no PEI → não há meta para comparar.
  if (plano.periodicidade_horas_semanais == null || plano.periodicidade_horas_semanais <= 0) {
    return {
      horas_realizadas: horasRealizadas,
      horas_previstas: null,
      percentual_cobertura: null,
      semanas_periodo: 0,
    }
  }

  const inicioPlano = parseDataLocal(plano.data_inicio)
  const fimVigencia = parseDataLocal(plano.data_fim ?? `${plano.ano_letivo}-12-31`)

  // Limite superior da janela: nunca além de hoje (não se prevê futuro).
  let inicioJanela = inicioPlano
  let fimJanela = menorData(fimVigencia, hoje)
  if (periodo?.inicio) inicioJanela = maiorData(inicioJanela, parseDataLocal(periodo.inicio))
  if (periodo?.fim) fimJanela = menorData(fimJanela, parseDataLocal(periodo.fim))

  const semanas = Math.max(0, (fimJanela.getTime() - inicioJanela.getTime()) / MS_POR_SEMANA)
  const semanasArred = arredondar1(semanas)
  const horasPrevistas = arredondar1(plano.periodicidade_horas_semanais * semanas)
  const cobertura = horasPrevistas > 0 ? Math.round((horasRealizadas / horasPrevistas) * 100) : null

  return {
    horas_realizadas: horasRealizadas,
    horas_previstas: horasPrevistas,
    percentual_cobertura: cobertura,
    semanas_periodo: semanasArred,
  }
}

export interface FiltrosRelatorioHoras {
  anoLetivo: string
  escolaId?: string
  turmaId?: string
  /** Recorte opcional do período (limita a contagem de sessões e de horas previstas). */
  inicio?: string
  fim?: string
}

export interface LinhaRelatorioHoras {
  plano_id: string
  aluno_id: string
  aluno_nome: string
  serie: string | null
  turma_codigo: string | null
  escola_id: string | null
  escola_nome: string | null
  professor_aee_nome: string | null
  status: string
  periodicidade_horas_semanais: number | null
  data_inicio: string
  data_fim: string | null
  total_sessoes: number
  sessoes_presente: number
  sessoes_ausente: number
  primeira_sessao: string | null
  ultima_sessao: string | null
  horas_realizadas: number
  horas_previstas: number | null
  percentual_cobertura: number | null
  semanas_periodo: number
  taxa_presenca: number | null
}

export interface TotaisRelatorioHoras {
  total_planos: number
  total_sessoes: number
  total_horas_realizadas: number
  total_horas_previstas: number
  cobertura_media: number | null
}

/**
 * Gera o relatório de horas AEE agregando atendimentos por plano (aluno/ano).
 *
 * Usado por: GET /api/admin/aee/relatorios/horas
 */
export async function gerarRelatorioHorasAee(
  filtros: FiltrosRelatorioHoras
): Promise<{ linhas: LinhaRelatorioHoras[]; totais: TotaisRelatorioHoras }> {
  const params: unknown[] = [filtros.anoLetivo]
  let i = 2

  // Filtro de período aplicado SOMENTE aos atendimentos (no JOIN), para que
  // planos sem sessões no recorte ainda apareçam (LEFT JOIN preservado).
  const condAtend: string[] = []
  if (filtros.inicio) { params.push(filtros.inicio); condAtend.push(`at.data_atendimento >= $${i++}`) }
  if (filtros.fim) { params.push(filtros.fim); condAtend.push(`at.data_atendimento <= $${i++}`) }
  const joinAtend = condAtend.length ? ` AND ${condAtend.join(' AND ')}` : ''

  const condPlano: string[] = []
  if (filtros.escolaId) { params.push(filtros.escolaId); condPlano.push(`a.escola_id = $${i++}`) }
  if (filtros.turmaId) { params.push(filtros.turmaId); condPlano.push(`a.turma_id = $${i++}`) }
  const whereExtra = condPlano.length ? ` AND ${condPlano.join(' AND ')}` : ''

  const r = await pool.query(
    `SELECT
        p.id AS plano_id, p.aluno_id, a.nome AS aluno_nome, a.serie,
        t.codigo AS turma_codigo, e.id AS escola_id, e.nome AS escola_nome,
        prof.nome AS professor_aee_nome, p.status,
        p.periodicidade_horas_semanais, p.data_inicio, p.data_fim,
        COUNT(at.id) AS total_sessoes,
        COUNT(at.id) FILTER (WHERE at.presente) AS sessoes_presente,
        COUNT(at.id) FILTER (WHERE NOT at.presente) AS sessoes_ausente,
        COALESCE(SUM(at.duracao_minutos) FILTER (WHERE at.presente), 0) AS minutos_realizados,
        MIN(at.data_atendimento) AS primeira_sessao,
        MAX(at.data_atendimento) AS ultima_sessao
       FROM aee_planos_individuais p
       INNER JOIN alunos a ON a.id = p.aluno_id
       LEFT JOIN turmas t ON t.id = a.turma_id
       LEFT JOIN escolas e ON e.id = a.escola_id
       LEFT JOIN usuarios prof ON prof.id = p.professor_aee_id
       LEFT JOIN aee_atendimentos at ON at.plano_id = p.id${joinAtend}
      WHERE p.ano_letivo = $1${whereExtra}
      GROUP BY p.id, a.nome, a.serie, t.codigo, e.id, e.nome, prof.nome
      ORDER BY e.nome NULLS LAST, a.nome`,
    params
  )

  const hoje = new Date()
  const periodo = (filtros.inicio || filtros.fim) ? { inicio: filtros.inicio, fim: filtros.fim } : undefined

  const linhas: LinhaRelatorioHoras[] = r.rows.map((row: Record<string, unknown>) => {
    const periodicidade = row.periodicidade_horas_semanais == null ? null : Number(row.periodicidade_horas_semanais)
    const dataInicio = String(row.data_inicio).slice(0, 10)
    const dataFim = row.data_fim ? String(row.data_fim).slice(0, 10) : null
    const minutosRealizados = Number(row.minutos_realizados) || 0
    const totalSessoes = Number(row.total_sessoes) || 0
    const sessoesPresente = Number(row.sessoes_presente) || 0

    const metricas = calcularMetricasHoras(
      { periodicidade_horas_semanais: periodicidade, data_inicio: dataInicio, data_fim: dataFim, ano_letivo: filtros.anoLetivo },
      minutosRealizados,
      hoje,
      periodo
    )

    return {
      plano_id: String(row.plano_id),
      aluno_id: String(row.aluno_id),
      aluno_nome: String(row.aluno_nome),
      serie: row.serie ? String(row.serie) : null,
      turma_codigo: row.turma_codigo ? String(row.turma_codigo) : null,
      escola_id: row.escola_id ? String(row.escola_id) : null,
      escola_nome: row.escola_nome ? String(row.escola_nome) : null,
      professor_aee_nome: row.professor_aee_nome ? String(row.professor_aee_nome) : null,
      status: String(row.status),
      periodicidade_horas_semanais: periodicidade,
      data_inicio: dataInicio,
      data_fim: dataFim,
      total_sessoes: totalSessoes,
      sessoes_presente: sessoesPresente,
      sessoes_ausente: Number(row.sessoes_ausente) || 0,
      primeira_sessao: row.primeira_sessao ? String(row.primeira_sessao).slice(0, 10) : null,
      ultima_sessao: row.ultima_sessao ? String(row.ultima_sessao).slice(0, 10) : null,
      horas_realizadas: metricas.horas_realizadas,
      horas_previstas: metricas.horas_previstas,
      percentual_cobertura: metricas.percentual_cobertura,
      semanas_periodo: metricas.semanas_periodo,
      taxa_presenca: totalSessoes > 0 ? Math.round((sessoesPresente / totalSessoes) * 100) : null,
    }
  })

  const totalHorasRealizadas = arredondar1(linhas.reduce((s, l) => s + l.horas_realizadas, 0))
  const totalHorasPrevistas = arredondar1(linhas.reduce((s, l) => s + (l.horas_previstas ?? 0), 0))
  const totais: TotaisRelatorioHoras = {
    total_planos: linhas.length,
    total_sessoes: linhas.reduce((s, l) => s + l.total_sessoes, 0),
    total_horas_realizadas: totalHorasRealizadas,
    total_horas_previstas: totalHorasPrevistas,
    cobertura_media: totalHorasPrevistas > 0 ? Math.round((totalHorasRealizadas / totalHorasPrevistas) * 100) : null,
  }

  return { linhas, totais }
}
